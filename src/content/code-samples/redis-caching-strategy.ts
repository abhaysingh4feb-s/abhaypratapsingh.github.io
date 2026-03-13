/**
 * Redis Caching Strategy for Analytical Queries
 *
 * Pattern: Cache-aside with TTLs that vary by query "freshness class."
 * Real-time dashboards get short TTLs; historical reports get long ones.
 * Invalidation is event-driven -- when a data pipeline finishes, we
 * flush all cache entries scoped to the affected tenant + dataset.
 *
 * Key design:  analytics:{tenantId}:{dataset}:{queryHash}
 *  - Hierarchical prefixes make batch invalidation a single SCAN + UNLINK.
 *  - The query hash is a SHA-256 of the normalised SQL, ensuring that
 *    logically identical queries always share a cache slot.
 */

import { createHash } from "node:crypto";
import Redis from "ioredis";

// ── TTL configuration by query freshness class ────────────────────

type FreshnessClass = "realtime" | "recent" | "historical";

const TTL_SECONDS: Record<FreshnessClass, number> = {
  realtime:   30,        // live dashboard widgets -- near-instant expiry
  recent:     5 * 60,    // last-7-days reports -- 5-minute window
  historical: 60 * 60,   // month-over-month trends -- 1-hour cache
};

// ── Cache key builder ─────────────────────────────────────────────

interface KeyParts {
  tenantId: string;
  dataset: string;       // e.g. "events", "revenue", "page_views"
  sql: string;           // normalised query text
}

function buildCacheKey({ tenantId, dataset, sql }: KeyParts): string {
  const hash = createHash("sha256").update(sql).digest("hex").slice(0, 16);
  return `analytics:${tenantId}:${dataset}:${hash}`;
}

// ── Cache-aside wrapper ───────────────────────────────────────────

type QueryExecutor<T> = () => Promise<T>;

export async function cachedQuery<T>(
  redis: Redis,
  keyParts: KeyParts,
  freshness: FreshnessClass,
  execute: QueryExecutor<T>
): Promise<T> {
  const key = buildCacheKey(keyParts);

  // 1. Try the cache first
  const cached = await redis.get(key);
  if (cached !== null) {
    return JSON.parse(cached) as T;
  }

  // 2. Cache miss -- run the real query
  const result = await execute();

  // 3. Store with the appropriate TTL (fire-and-forget to avoid blocking)
  const ttl = TTL_SECONDS[freshness];
  redis.set(key, JSON.stringify(result), "EX", ttl).catch(() => {
    // Swallow write errors -- cache is best-effort, not critical path
  });

  return result;
}

// ── Batch invalidation ────────────────────────────────────────────
// Called when an ETL job finishes or when a user triggers a manual refresh.

export async function invalidateDataset(
  redis: Redis,
  tenantId: string,
  dataset: string
): Promise<number> {
  const pattern = `analytics:${tenantId}:${dataset}:*`;
  let cursor = "0";
  let deleted = 0;

  // SCAN in batches to avoid blocking Redis on large key spaces
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor, "MATCH", pattern, "COUNT", 200
    );
    cursor = nextCursor;

    if (keys.length > 0) {
      // UNLINK is non-blocking (async free) -- preferred over DEL
      deleted += await redis.unlink(...keys);
    }
  } while (cursor !== "0");

  return deleted;
}

// ── Usage example (not executed -- illustrative only) ─────────────
/*
  const rows = await cachedQuery(
    redis,
    { tenantId: "org_abc", dataset: "revenue", sql: normalizedSQL },
    "recent",
    () => pool.query(normalizedSQL).then((r) => r.rows)
  );
*/
