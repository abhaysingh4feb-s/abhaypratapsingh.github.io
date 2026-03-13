---
title: "How I Design Systems: My Engineering Philosophy"
slug: "how-i-design-systems"
date: "2025-12-01"
tags: ["Architecture", "System Design", "SaaS", "Philosophy"]
excerpt: "The principles behind my architecture decisions — from monolith vs microservices to multi-tenant isolation and LLM integration."
readingTime: 10
published: true
ogImage: "/images/blog/system-design-og.png"
---

## Why Philosophy Matters

Every architecture decision is a bet. You are betting that certain properties of your system — scalability, maintainability, security, cost — matter more than others at this point in time. Without a coherent philosophy for evaluating these bets, you end up with an inconsistent system that optimizes for nothing.

Over the past several years of building SaaS platforms, analytics systems, and e-commerce infrastructure, I have developed a set of principles that guide my decisions. None of these are universal truths. They are heuristics that have worked well for the kinds of systems I build: multi-tenant platforms serving dozens to hundreds of business customers, processing millions of records, with small-to-medium engineering teams.

## Principle 1: Monolith First, Extract Later

The microservices-first approach is one of the most expensive mistakes a small team can make. I have seen it happen multiple times: a team of four engineers starts a new project by designing eight services, a message broker, a service mesh, and a Kubernetes cluster. Six months later, they have built an impressive infrastructure and shipped zero features.

My default is a modular monolith. One deployable unit, one database, one deployment pipeline. But with strict internal boundaries.

```typescript
// Module boundaries are enforced through NestJS modules
// Each module exposes a public API and hides its internals

@Module({
  imports: [DatabaseModule, CacheModule],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrderValidationService,  // internal, not exported
    OrderRepository,         // internal, not exported
  ],
  exports: [OrdersService],  // only the public API
})
export class OrdersModule {}

@Module({
  imports: [OrdersModule, ShippingModule],
  controllers: [FulfillmentController],
  providers: [FulfillmentService],
})
export class FulfillmentModule {}
```

The `FulfillmentModule` can call `OrdersService.getOrder()` but cannot access `OrderRepository` directly. This is the same encapsulation boundary you would have with microservices, without the network hop, serialization overhead, and distributed transaction complexity.

When a module genuinely needs to become a separate service — because it has different scaling requirements, a different deployment cadence, or a different team owns it — the extraction is straightforward. The public API is already defined. You replace the in-process call with an HTTP or gRPC call. The rest of the system does not change.

In practice, I have extracted exactly two modules into separate services across all the systems I have built. Both extractions were driven by concrete scaling needs (one was a CPU-intensive data processing pipeline, the other was a real-time notification service with different availability requirements). The other 20+ modules stayed in the monolith, and that was the correct decision.

**The extraction criteria I use:**
- The module has fundamentally different scaling characteristics (CPU-bound vs IO-bound)
- The module has a different deployment cadence (needs to deploy 10x more frequently)
- The module is owned by a different team with different release cycles
- The module has different availability requirements (can the rest of the system tolerate this module being down?)

If none of these apply, it stays in the monolith.

## Principle 2: Multi-Tenant Isolation Is a Spectrum

I have written extensively about row-level vs schema-level vs database-level tenant isolation. The key insight is that isolation is not binary — it is a spectrum, and the right position on that spectrum depends on your tenant count, regulatory requirements, and operational capacity.

My decision framework:

| Factor | Row-Level | Schema-Per-Tenant | DB-Per-Tenant |
|--------|-----------|-------------------|---------------|
| Tenant count | 50+ | 10-50 | < 10 |
| Data residency requirements | No | Maybe | Yes |
| Per-tenant customization | Minimal | Moderate | Extensive |
| Team size for operations | Small | Medium | Large |
| Migration complexity | Low | Medium | High |

For most SaaS products, row-level isolation is the right starting point. The engineering investment in making it safe (middleware-based context propagation, ORM-level filtering, database-level RLS) is significant upfront but pays off in operational simplicity for years.

The mistake I see most often is choosing database-per-tenant because it "feels safer." It does provide stronger isolation, but the operational cost at 100+ tenants is brutal. Every schema migration, every index change, every configuration update must be applied to every database. That overhead scales linearly with tenant count and it never stops growing.

```typescript
// Row-level isolation with AsyncLocalStorage — the tenant context
// is always available without passing it through every function call

import { AsyncLocalStorage } from 'async_hooks';

const tenantStorage = new AsyncLocalStorage<{ tenantId: string }>();

// Middleware sets the context once per request
app.use((req, res, next) => {
  const tenantId = extractTenantId(req);
  tenantStorage.run({ tenantId }, () => next());
});

// Every database query automatically includes the tenant filter
// Developers never write WHERE tenant_id = ... manually
const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        const { tenantId } = tenantStorage.getStore();
        args.where = { ...args.where, tenantId };
        return query(args);
      },
    },
  },
});
```

This pattern makes tenant isolation the default, not something developers have to remember. The only way to query without a tenant filter is to explicitly bypass the extension, which is auditable and code-reviewable.

## Principle 3: Database Scaling Is Boring on Purpose

PostgreSQL can handle far more than most teams give it credit for. Before reaching for read replicas, sharding, or a different database entirely, exhaust the optimization potential of a single well-tuned PostgreSQL instance.

My scaling progression:

**Step 1: Index everything correctly.** This sounds obvious, but I consistently find missing indexes when reviewing systems. Use `pg_stat_user_tables` to find sequential scans on large tables. Use `EXPLAIN ANALYZE` religiously.

```sql
-- Find tables with high sequential scan counts relative to index scans
SELECT
  schemaname,
  relname AS table_name,
  seq_scan,
  seq_tup_read,
  idx_scan,
  n_live_tup AS estimated_rows
FROM pg_stat_user_tables
WHERE seq_scan > 100
  AND n_live_tup > 10000
ORDER BY seq_tup_read DESC;
```

**Step 2: Connection pooling.** PgBouncer in transaction mode. This alone can increase your effective connection capacity by 10x. PostgreSQL's per-connection memory overhead is non-trivial, and most application connections are idle most of the time.

**Step 3: Query optimization.** Rewrite the top 10 slowest queries. Usually this means adding appropriate indexes, rewriting subqueries as JOINs or CTEs, and ensuring the query planner has up-to-date statistics.

```sql
-- Materialized view for expensive aggregations
-- Refreshed every 15 minutes, not computed on every request
CREATE MATERIALIZED VIEW tenant_monthly_metrics AS
SELECT
  tenant_id,
  date_trunc('month', created_at) AS month,
  COUNT(*) AS total_orders,
  SUM(total_amount) AS revenue,
  AVG(total_amount) AS avg_order_value,
  COUNT(DISTINCT customer_id) AS unique_customers
FROM orders
WHERE status != 'cancelled'
GROUP BY tenant_id, date_trunc('month', created_at);

CREATE UNIQUE INDEX idx_tmm_tenant_month
  ON tenant_monthly_metrics(tenant_id, month);

-- Refresh on a schedule
REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_monthly_metrics;
```

**Step 4: Caching.** Redis for frequently accessed, rarely changing data. Tenant configuration, feature flags, reference tables, and aggregated metrics are all excellent cache candidates.

**Step 5: Read replicas.** When a single instance genuinely cannot handle the read load, add a replica. Route analytics queries and reporting to the replica. Keep writes on the primary.

**Step 6: Table partitioning.** For tables that grow past tens of millions of rows, partition by date (for time-series data) or by tenant (for multi-tenant data). This improves query performance and makes maintenance operations (vacuum, reindex) more manageable.

I have never needed to go past step 6. For the systems I build — tens of millions of rows, hundreds of concurrent users — a single PostgreSQL instance with PgBouncer and a read replica handles the load comfortably. Sharding introduces enormous complexity and should be a last resort, not a starting point.

## Principle 4: Integrate LLMs Safely

LLMs are powerful but fundamentally unreliable components. They hallucinate, they are vulnerable to prompt injection, and their behavior changes between model versions. Integrating them into a production system requires treating them like an untrusted third-party service.

My framework for safe LLM integration:

**Never let the LLM's output directly affect state.** Every LLM output passes through a validation layer before it reaches the database, the filesystem, or any external service. For SQL generation, this means AST parsing and structural validation. For content generation, this means schema validation and sanitization.

**Constrain the output space.** The narrower the LLM's possible outputs, the easier they are to validate. Asking for "any valid SQL query" is harder to validate than asking for "a SELECT query against these specific tables with these specific columns." Use structured output (JSON mode, function calling) wherever possible.

```typescript
// Validation layer between LLM output and database execution
async function validateAndExecute(
  generatedSQL: string,
  tenantId: string,
): Promise<QueryResult> {
  // 1. Parse into AST — rejects anything that is not valid SQL
  const ast = parse(generatedSQL);

  // 2. Structural validation — only SELECT, only allowed tables
  if (ast[0].type !== 'select') {
    throw new ValidationError('Only SELECT statements allowed');
  }

  const tables = extractTableNames(ast[0]);
  for (const table of tables) {
    if (!ALLOWED_TABLES.has(table)) {
      throw new ValidationError(`Table ${table} is not queryable`);
    }
  }

  // 3. Tenant isolation check — WHERE tenant_id must be present
  if (!hasTenantFilter(ast[0])) {
    throw new ValidationError('Missing tenant isolation filter');
  }

  // 4. Cost estimation — reject expensive queries before execution
  const plan = await db.query(`EXPLAIN (FORMAT JSON) ${generatedSQL}`, [tenantId]);
  if (plan[0]['Plan']['Total Cost'] > MAX_COST_THRESHOLD) {
    throw new ValidationError('Query cost exceeds threshold');
  }

  // 5. Sandboxed execution with timeout
  return db.query(generatedSQL, [tenantId], {
    timeout: 10000,
    readOnly: true,
  });
}
```

**Defense in depth.** Input sanitization catches simple attacks. Output validation catches structural violations. Sandboxed execution limits the blast radius. Monitoring catches anomalies. No single layer is sufficient — the combination is what provides safety.

**Version pin everything.** When OpenAI releases a new model version, do not switch immediately. Test your full validation suite against the new model. LLM behavior changes between versions in subtle ways that can break assumptions your validation code relies on.

**Budget and rate-limit LLM calls.** LLM costs scale with usage. A single misbehaving tenant (or a bug in your retry logic) can generate thousands of dollars in API charges overnight. Set per-tenant and per-endpoint rate limits. Set billing alerts.

## Principle 5: API Orchestration Patterns

When your system integrates with 10+ external APIs, the integration layer becomes a first-class architectural concern, not an afterthought. The patterns that matter:

**Service abstraction.** Every external API is wrapped in a service class that normalizes errors, handles authentication, and presents a domain-specific interface. The rest of the application never sees raw HTTP responses from third parties.

**Graceful degradation.** Not all integrations are equally critical. If the marketing analytics API is down, the platform should still process orders. Classify integrations by criticality and design fallback behavior for each tier.

```typescript
enum IntegrationCriticality {
  CRITICAL = 'critical',   // Payment processing — no fallback, surface error
  HIGH = 'high',           // Shipping rates — fall back to cached rates
  MEDIUM = 'medium',       // Tax calculation — fall back to estimated rates
  LOW = 'low',             // Marketing sync — queue for later, no user impact
}

// When a circuit breaker opens, the fallback depends on criticality
function handleServiceUnavailable(
  service: string,
  criticality: IntegrationCriticality,
): void {
  switch (criticality) {
    case IntegrationCriticality.CRITICAL:
      throw new ServiceUnavailableException(`${service} is unavailable`);
    case IntegrationCriticality.HIGH:
      return this.cache.getLastKnownGood(service);
    case IntegrationCriticality.MEDIUM:
      return this.fallbackCalculation(service);
    case IntegrationCriticality.LOW:
      this.queue.add('retry-later', { service });
      return null;
  }
}
```

**Async by default.** Most integrations do not need to happen synchronously. Order syncing to the ERP, marketing event tracking, and inventory reconciliation can all happen asynchronously via job queues. This decouples the user experience from third-party latency and availability.

**Idempotency everywhere.** Any operation that creates or mutates external state must be idempotent. Use idempotency keys where the API supports them. Implement your own deduplication for APIs that do not.

## Principle 6: The Decision Framework

When faced with an architecture decision, I ask these questions in order:

**1. What is the simplest thing that works?** Not the simplest thing imaginable — the simplest thing that meets the actual requirements (performance, security, maintainability) without cutting corners that will hurt later. A PostgreSQL query is simpler than a Redis cache is simpler than a dedicated search index. Start with the simplest option and only add complexity when you have evidence that it is insufficient.

**2. What are the failure modes?** Every component fails. Databases go down. APIs time out. Disks fill up. For each architectural choice, enumerate the failure modes and decide: is this failure acceptable? Can it be detected? Can it be recovered from automatically? The choice with the fewest catastrophic failure modes usually wins.

**3. What does the team look like in 2 years?** Architecture decisions outlive the people who make them. If you choose a technology that only you understand, you have created a liability, not an asset. Prefer boring, well-understood technology (PostgreSQL, Redis, NestJS) over novel alternatives. The talent pool is larger, the documentation is better, and the edge cases are known.

**4. Is this reversible?** Prefer decisions that are easy to change over decisions that are "optimal" but lock you in. Database schema choices are hard to reverse; API layer patterns are easy to swap. When facing two options of similar quality, choose the one with the lower switching cost.

**5. What is the operational cost?** Every new component in your stack — a database, a message broker, a cache, a search engine — adds operational overhead. It needs monitoring, alerting, backups, upgrades, and capacity planning. A smaller team can operate a simpler stack more reliably than a complex one. This does not mean avoiding complexity entirely. It means ensuring that every additional component justifies its operational cost with proportional value.

## Putting It Together

These principles are not independent. They reinforce each other. The monolith-first approach reduces operational cost. Row-level tenant isolation keeps the database stack simple. Boring database scaling avoids premature infrastructure complexity. Safe LLM integration treats AI as a feature, not a foundation. Disciplined API orchestration prevents integration spaghetti.

The common thread is restraint. The best architecture is not the one with the most components, the most sophisticated patterns, or the most fashionable technologies. It is the one that solves the actual problem with the least accidental complexity while remaining adaptable to future requirements.

That does not mean never adding complexity. It means adding complexity deliberately, when you have evidence that the simpler approach is insufficient, with a clear understanding of the costs you are taking on. Every architectural decision is a tradeoff. The goal is to make those tradeoffs consciously rather than accidentally.

When I look back at the systems I have built, the ones that aged well are not the ones where I made clever decisions. They are the ones where I avoided unnecessary decisions — where I let PostgreSQL be the database, NestJS be the framework, Redis be the cache, and focused the team's creative energy on the problems that actually mattered to users.

That is my engineering philosophy. It is not exciting. It does not make for impressive architecture diagrams. But it ships reliable software, and the 3 AM pages are rare.
