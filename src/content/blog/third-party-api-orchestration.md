---
title: "Orchestrating 20+ Third-Party APIs Without Losing Your Mind"
slug: "third-party-api-orchestration"
date: "2025-08-05"
tags: ["Architecture", "Laravel", "APIs", "Integration", "Redis"]
excerpt: "Lessons from integrating ERP, shipping, marketing, and payment APIs into a single e-commerce platform."
readingTime: 7
published: true
ogImage: "/images/blog/api-orchestration-og.png"
---

## The Problem with 20+ APIs

The e-commerce platform I worked on processed orders across multiple countries, each with its own shipping carriers, tax systems, payment gateways, and regulatory requirements. By the time we were done, the system integrated with over 20 third-party APIs:

- **ERP:** Acumatica (inventory, accounting, purchase orders)
- **Shipping:** FedEx, DHL, Aramex, local carriers per region
- **Payments:** Stripe, PayPal, regional payment processors
- **Marketing:** Klaviyo, Meta Ads API, Google Ads
- **Tax:** Avalara for US sales tax calculations
- **Communication:** Twilio (SMS), SendGrid (email)
- **Fraud:** Signifyd for order fraud screening

Each of these APIs has its own authentication mechanism, rate limiting policy, error format, retry semantics, and versioning strategy. FedEx uses OAuth2 with short-lived tokens. Acumatica uses session-based auth with cookie management. Aramex uses a SOAP API (yes, in 2025). Stripe uses idempotency keys. Klaviyo rate-limits to 75 requests per second per account.

Without a deliberate architecture, this devolves into spaghetti — scattered HTTP calls with inconsistent error handling, silent failures, and no visibility into what is happening across the integration surface.

## Pattern 1: The Centralized Service Layer

Every external API gets its own service class that encapsulates authentication, request formatting, response parsing, and error normalization. No controller or business logic class ever makes a raw HTTP call.

```typescript
// Base class for all third-party integrations
abstract class ExternalApiService {
  protected abstract readonly serviceName: string;
  protected abstract readonly baseUrl: string;
  protected abstract readonly rateLimitPerSecond: number;

  constructor(
    private readonly httpClient: HttpService,
    private readonly logger: Logger,
    private readonly circuitBreaker: CircuitBreakerService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  protected async request<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const startTime = Date.now();

    // Check circuit breaker state
    if (this.circuitBreaker.isOpen(this.serviceName)) {
      throw new ServiceUnavailableException(
        `${this.serviceName} circuit breaker is open`
      );
    }

    // Enforce rate limiting
    await this.rateLimiter.acquire(this.serviceName, this.rateLimitPerSecond);

    try {
      const response = await this.httpClient.request({
        ...config,
        baseURL: this.baseUrl,
        headers: {
          ...config.headers,
          ...(await this.getAuthHeaders()),
        },
        timeout: config.timeout ?? 15000,
      });

      this.circuitBreaker.recordSuccess(this.serviceName);

      this.logger.log({
        service: this.serviceName,
        method: config.method,
        path: config.url,
        status: response.status,
        duration: Date.now() - startTime,
      });

      return this.parseResponse<T>(response);
    } catch (error) {
      this.circuitBreaker.recordFailure(this.serviceName);
      throw this.normalizeError(error);
    }
  }

  protected abstract getAuthHeaders(): Promise<Record<string, string>>;
  protected abstract parseResponse<T>(response: any): ApiResponse<T>;
  protected abstract normalizeError(error: any): ExternalApiException;
}
```

Each concrete service extends this base:

```typescript
class FedExService extends ExternalApiService {
  protected readonly serviceName = 'fedex';
  protected readonly baseUrl = 'https://apis.fedex.com';
  protected readonly rateLimitPerSecond = 40;

  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  protected async getAuthHeaders(): Promise<Record<string, string>> {
    if (!this.accessToken || this.isTokenExpired()) {
      await this.refreshToken();
    }
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  private async refreshToken(): Promise<void> {
    const response = await this.httpClient.post(
      'https://apis.fedex.com/oauth/token',
      {
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      },
    );
    this.accessToken = response.data.access_token;
    this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
  }

  async getRates(shipment: ShipmentRequest): Promise<RateQuote[]> {
    const response = await this.request<FedExRateResponse>({
      method: 'POST',
      url: '/rate/v1/rates/quotes',
      data: this.formatRateRequest(shipment),
    });
    return response.data.output.rateReplyDetails.map(this.mapToRateQuote);
  }
}
```

The key benefit is isolation. When FedEx changes their API (which they do, frequently), the changes are confined to `FedExService`. The rest of the application deals with normalized types like `RateQuote` and `ShipmentStatus`.

## Pattern 2: Retry with Exponential Backoff

Third-party APIs fail. They time out, return 500s, rate-limit you, and occasionally go down entirely. Retrying is essential, but naive retrying makes things worse — you hammer an already struggling service.

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    retryableStatuses?: number[];
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelay = 1000,
    maxDelay = 30000,
    retryableStatuses = [408, 429, 500, 502, 503, 504],
  } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts) break;
      if (!isRetryable(error, retryableStatuses)) break;

      // Exponential backoff with jitter
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000,
        maxDelay,
      );

      // Respect Retry-After header if present
      const retryAfter = error.response?.headers?.['retry-after'];
      const actualDelay = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : delay;

      await sleep(actualDelay);
    }
  }

  throw lastError;
}
```

The jitter (random component) is important. Without it, multiple clients retrying simultaneously create a "thundering herd" that overwhelms the recovering service. The `Retry-After` header respect is also critical — when an API tells you to wait 60 seconds, ignoring that gets your credentials revoked.

## Pattern 3: Circuit Breakers

Retries handle transient failures. Circuit breakers handle sustained outages. If FedEx has been returning 500s for the last two minutes, there is no point in making more requests — every attempt adds latency to the user's experience and load to an already failing service.

```typescript
class CircuitBreakerService {
  private states = new Map<string, CircuitState>();

  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 60000; // 1 minute
  private readonly halfOpenMaxAttempts = 3;

  isOpen(service: string): boolean {
    const state = this.states.get(service);
    if (!state || state.status === 'closed') return false;

    if (state.status === 'open') {
      // Check if recovery timeout has passed
      if (Date.now() - state.lastFailureTime > this.recoveryTimeout) {
        state.status = 'half-open';
        state.halfOpenAttempts = 0;
        return false; // Allow a test request through
      }
      return true;
    }

    // Half-open: allow limited requests
    return state.halfOpenAttempts >= this.halfOpenMaxAttempts;
  }

  recordSuccess(service: string): void {
    const state = this.states.get(service);
    if (state?.status === 'half-open') {
      state.status = 'closed';
      state.failureCount = 0;
    }
  }

  recordFailure(service: string): void {
    const state = this.states.get(service) ?? {
      status: 'closed' as const,
      failureCount: 0,
      lastFailureTime: 0,
      halfOpenAttempts: 0,
    };

    state.failureCount++;
    state.lastFailureTime = Date.now();

    if (state.failureCount >= this.failureThreshold) {
      state.status = 'open';
      this.logger.warn(
        `Circuit breaker OPEN for ${service} after ${state.failureCount} failures`
      );
    }

    this.states.set(service, state);
  }
}
```

When a circuit breaker opens, the application needs a fallback strategy. For shipping rate quotes, we fall back to cached rates from the last successful fetch. For payment processing, there is no fallback — we surface the error to the user. The fallback strategy is service-specific and must be designed intentionally.

## Pattern 4: Idempotency Keys

When you are creating shipments, processing payments, or syncing inventory, duplicate requests are dangerous. A retried payment request can charge the customer twice. A retried shipment creation produces two tracking numbers.

Idempotency keys solve this. Many APIs (Stripe, for example) accept an `Idempotency-Key` header. If you send the same key twice, the API returns the original response without processing the request again.

```typescript
async function createPaymentIntent(
  order: Order,
  idempotencyKey?: string,
): Promise<PaymentIntent> {
  const key = idempotencyKey ?? `payment-${order.id}-${order.updatedAt.getTime()}`;

  return this.stripe.paymentIntents.create(
    {
      amount: Math.round(order.totalAmount * 100),
      currency: order.currency,
      metadata: { orderId: order.id },
    },
    {
      idempotencyKey: key,
    },
  );
}
```

For APIs that do not support idempotency natively, we implement it ourselves using Redis:

```typescript
async function withIdempotency<T>(
  key: string,
  operation: () => Promise<T>,
  ttl: number = 86400, // 24 hours
): Promise<T> {
  // Check if this operation was already completed
  const existing = await this.redis.get(`idempotency:${key}`);
  if (existing) {
    return JSON.parse(existing) as T;
  }

  // Acquire a lock to prevent concurrent execution
  const lock = await this.redis.set(
    `idempotency-lock:${key}`,
    '1',
    'NX',
    'EX',
    30,
  );

  if (!lock) {
    // Another process is executing this operation
    // Wait and return the result
    await sleep(2000);
    const result = await this.redis.get(`idempotency:${key}`);
    if (result) return JSON.parse(result) as T;
    throw new ConflictException('Concurrent operation in progress');
  }

  try {
    const result = await operation();
    await this.redis.set(`idempotency:${key}`, JSON.stringify(result), 'EX', ttl);
    return result;
  } finally {
    await this.redis.del(`idempotency-lock:${key}`);
  }
}
```

## The Acumatica Challenge

Acumatica ERP deserves special mention because it was the most complex integration by far. Unlike modern REST APIs, Acumatica uses a session-based authentication model with cookies, a custom query language for filtering, and batch endpoints that process operations asynchronously.

Syncing inventory between our platform and Acumatica required handling:

**Bidirectional sync.** Orders flow from our platform to Acumatica. Inventory updates flow from Acumatica back. Each direction has different timing requirements — orders must sync within minutes, inventory can be delayed by up to 15 minutes.

**Conflict resolution.** If an inventory quantity is updated in both systems simultaneously, which one wins? We adopted a "last write wins" policy with timestamp comparison, but Acumatica's timestamps are in the ERP's local timezone, which required careful conversion.

**Batch processing limits.** Acumatica's batch API accepts at most 100 records per request. For a large inventory sync (thousands of SKUs), we chunk the updates and process them sequentially with rate limiting to avoid overwhelming the ERP.

```typescript
async function syncInventoryToAcumatica(updates: InventoryUpdate[]): Promise<void> {
  const chunks = chunkArray(updates, 100);

  for (const chunk of chunks) {
    await this.withRetry(async () => {
      const session = await this.acumatica.login();

      await this.acumatica.batchUpdate(
        session,
        'InventoryItem',
        chunk.map(u => ({
          InventoryID: { value: u.sku },
          QtyOnHand: { value: u.quantity },
          LastModifiedDate: { value: u.updatedAt.toISOString() },
        })),
      );

      await this.acumatica.logout(session);
    });

    // Rate limit: wait between batches
    await sleep(2000);
  }
}
```

Note the explicit login/logout per batch. Acumatica sessions are heavyweight resources, and leaving sessions open risks hitting the concurrent session limit.

## Logging and Monitoring

With 20+ APIs, you need visibility into what is happening across the entire integration surface. Every outbound request is logged with a correlation ID that ties it back to the originating user action.

```typescript
interface ApiCallLog {
  correlationId: string;
  service: string;
  method: string;
  path: string;
  requestBody?: any;
  responseStatus: number;
  responseTime: number;
  error?: string;
  retryAttempt: number;
  circuitBreakerState: string;
}
```

We aggregate these logs into dashboards that show:

- **Error rate per service** over time. A spike in FedEx 500s is visible within minutes.
- **P95 latency per service.** If Acumatica starts responding slowly, we know before it causes timeouts.
- **Rate limit headroom.** How close we are to each API's rate limit, so we can request quota increases proactively.
- **Circuit breaker events.** When a circuit opens, an alert fires in Slack.

## Cross-Border Complexity

The platform operated across multiple countries, each adding layers of integration complexity:

**Currency conversion.** Prices are stored in the seller's currency but displayed in the buyer's. Exchange rates are fetched from a rates API every 6 hours and cached.

**Tax calculation.** US orders go through Avalara for sales tax. EU orders apply VAT based on the buyer's country. Middle East orders have country-specific rules. Each calculation is a separate API call during checkout.

**Shipping carrier selection.** The cheapest carrier depends on origin, destination, weight, and declared value. We query multiple carriers in parallel, normalize the rates, and present ranked options. If one carrier's API times out, the others still return results.

```typescript
async function getShippingRates(shipment: ShipmentRequest): Promise<RateQuote[]> {
  const carriers = this.getCarriersForRoute(shipment.origin, shipment.destination);

  // Query all carriers in parallel with individual timeouts
  const results = await Promise.allSettled(
    carriers.map(carrier =>
      this.getCarrierRates(carrier, shipment)
        .then(rates => ({ carrier: carrier.name, rates }))
    ),
  );

  // Collect successful results, log failures
  const allRates: RateQuote[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allRates.push(...result.value.rates);
    } else {
      this.logger.warn(`Rate fetch failed for carrier`, {
        error: result.reason.message,
      });
    }
  }

  return allRates.sort((a, b) => a.price - b.price);
}
```

`Promise.allSettled` is the right choice here, not `Promise.all`. If DHL is down, the customer should still see FedEx and Aramex rates.

## Key Takeaways

After two years of operating this integration layer, these are the principles that survived contact with reality:

**Normalize everything at the boundary.** Never let third-party data formats leak into your domain model. Parse, validate, and transform at the service layer.

**Assume every API will fail.** Build retries, circuit breakers, and fallbacks from day one. Retrofitting them is painful.

**Idempotency is not optional.** Any operation that creates or mutates external state needs an idempotency mechanism. The cost of duplicate operations (double charges, duplicate shipments) is always higher than the cost of implementing idempotency.

**Log aggressively, alert selectively.** Log every outbound request. Alert on error rate spikes and circuit breaker events. Do not alert on individual failures — they are normal.

**Rate limits are a shared resource.** If your background sync jobs consume the entire rate limit quota, real-time user requests will fail. Prioritize interactive traffic and throttle batch operations.

Integration work is not glamorous engineering. There are no elegant algorithms, no clever data structures. It is defensive programming, careful error handling, and relentless monitoring. But it is the foundation that makes the platform work, and getting it right is the difference between a system that gracefully handles failures and one that pages you at 3 AM.
