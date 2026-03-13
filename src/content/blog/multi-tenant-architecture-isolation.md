---
title: "Multi-Tenant Architecture: Row-Level vs Schema-Level Isolation"
slug: "multi-tenant-architecture-isolation"
date: "2025-09-10"
tags: ["Architecture", "SaaS", "PostgreSQL", "NestJS", "Multi-Tenant"]
excerpt: "A practical comparison of tenant isolation strategies, and why row-level isolation with middleware-based context propagation worked for our 100+ tenant platform."
readingTime: 6
published: true
ogImage: "/images/blog/multi-tenant-og.png"
---

## Three Isolation Models

Every multi-tenant SaaS platform must answer one fundamental question early: how do you keep tenant data separate? The answer shapes your database design, your application architecture, your deployment model, and your operational overhead for years to come.

There are three broad strategies, each with its own tradeoffs.

### 1. Shared Database, Shared Schema (Row-Level Isolation)

All tenants share the same database and the same tables. Every row includes a `tenant_id` column, and every query filters on it.

```sql
-- Every table includes tenant_id
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  customer_id UUID NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Every query includes the filter
SELECT * FROM orders WHERE tenant_id = $1 AND status = 'pending';
```

**Pros:** Simplest to operate. One database to back up, monitor, and scale. Schema migrations apply once. Connection pooling is straightforward.

**Cons:** A missing `WHERE tenant_id = ...` clause leaks data across tenants. No physical isolation — a noisy neighbor's expensive query affects everyone. Harder to comply with data residency requirements.

### 2. Schema-Per-Tenant

Each tenant gets their own PostgreSQL schema within a shared database. Tables are identical across schemas, but physically separated.

```sql
CREATE SCHEMA tenant_abc123;
CREATE TABLE tenant_abc123.orders ( ... );

CREATE SCHEMA tenant_def456;
CREATE TABLE tenant_def456.orders ( ... );
```

**Pros:** Stronger isolation than row-level. One bad query does not scan another tenant's data. Easier per-tenant backup and restore. Schema customization per tenant is possible.

**Cons:** Schema migrations must be applied to every schema — hundreds of `ALTER TABLE` statements. Connection pooling becomes complicated because the `search_path` must switch per request. PostgreSQL catalogs bloat as schema count grows.

### 3. Database-Per-Tenant

Each tenant gets their own PostgreSQL database, potentially on separate servers.

**Pros:** Maximum isolation. Trivial to comply with data residency (put the database in the right region). Per-tenant performance tuning. Easy to offboard a tenant — drop the database.

**Cons:** Operational nightmare at scale. Hundreds of databases to back up, monitor, patch, and migrate. Connection management is a serious challenge. Cross-tenant analytics requires federated queries.

## Why We Chose Row-Level Isolation

For our analytics platform — serving 100+ tenants with a shared feature set and no data residency requirements — row-level isolation was the clear choice. The operational simplicity of a single database far outweighed the isolation benefits of schema-per-tenant.

But row-level isolation is only safe if you can guarantee that every query is scoped to a tenant. A single forgotten `WHERE` clause is a data breach. We needed an enforcement mechanism that did not rely on developer discipline.

## Implementation: NestJS Middleware + AsyncLocalStorage + Prisma

The architecture has three layers.

### Layer 1: Middleware Extracts Tenant Context

Every incoming HTTP request carries a tenant identifier, either in a JWT claim or an API key header. A NestJS middleware extracts this and stores it in `AsyncLocalStorage`, which provides request-scoped storage without passing context through every function call.

```typescript
import { AsyncLocalStorage } from 'async_hooks';

interface TenantContext {
  tenantId: string;
  tenantName: string;
  plan: 'starter' | 'professional' | 'enterprise';
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const tenantId = this.extractTenantId(req);

    if (!tenantId) {
      throw new UnauthorizedException('Tenant identification required');
    }

    const tenant = await this.tenantService.findById(tenantId);

    if (!tenant || !tenant.isActive) {
      throw new ForbiddenException('Tenant not found or inactive');
    }

    tenantStorage.run(
      {
        tenantId: tenant.id,
        tenantName: tenant.name,
        plan: tenant.plan,
      },
      () => next(),
    );
  }

  private extractTenantId(req: Request): string | null {
    // Try JWT first
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = this.jwtService.decode(token);
      return decoded?.tenantId ?? null;
    }

    // Fall back to API key
    const apiKey = req.headers['x-api-key'] as string;
    if (apiKey) {
      return this.tenantService.getTenantIdByApiKey(apiKey);
    }

    return null;
  }
}
```

### Layer 2: Prisma Extension Auto-Injects Tenant Filter

Here is where it gets interesting. We use a Prisma client extension that automatically injects `tenant_id` into every query. Developers never write `WHERE tenant_id = ...` manually — it happens at the ORM level.

```typescript
import { PrismaClient } from '@prisma/client';
import { tenantStorage } from './tenant.middleware';

function getTenantId(): string {
  const context = tenantStorage.getStore();
  if (!context) {
    throw new Error(
      'Tenant context not found. This query is running outside a request scope.'
    );
  }
  return context.tenantId;
}

export const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async findMany({ model, operation, args, query }) {
        args.where = { ...args.where, tenantId: getTenantId() };
        return query(args);
      },
      async findFirst({ model, operation, args, query }) {
        args.where = { ...args.where, tenantId: getTenantId() };
        return query(args);
      },
      async findUnique({ model, operation, args, query }) {
        // findUnique uses 'where' with unique fields
        // We validate after fetching
        const result = await query(args);
        if (result && result.tenantId !== getTenantId()) {
          throw new ForbiddenException('Cross-tenant access denied');
        }
        return result;
      },
      async create({ model, operation, args, query }) {
        args.data = { ...args.data, tenantId: getTenantId() };
        return query(args);
      },
      async update({ model, operation, args, query }) {
        args.where = { ...args.where, tenantId: getTenantId() };
        return query(args);
      },
      async delete({ model, operation, args, query }) {
        args.where = { ...args.where, tenantId: getTenantId() };
        return query(args);
      },
    },
  },
});
```

This is the critical piece. By intercepting every Prisma operation, we ensure tenant scoping is applied consistently — even if a developer forgets. The `getTenantId()` function throws an error if called outside a request context, which catches background jobs or scripts that accidentally use the tenant-scoped client.

### Layer 3: Database-Level Safety Net

The application-level filtering is the primary defense. But defense in depth means we add a database-level check as well. PostgreSQL Row-Level Security (RLS) provides a second layer that catches anything the application misses.

```sql
-- Enable RLS on the orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Create a policy that filters by the current session variable
CREATE POLICY tenant_isolation ON orders
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Force RLS even for table owners
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
```

Before executing queries, the application sets the session variable:

```typescript
async function setTenantContext(tenantId: string) {
  await prisma.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
}
```

In practice, we rely on the Prisma extension for filtering and treat RLS as a safety net. RLS adds measurable overhead to query planning, so we only enable it on the most sensitive tables — `orders`, `customers`, `payments` — rather than every table in the schema.

## Security Guarantees

This three-layer approach provides strong isolation guarantees:

1. **Middleware layer** ensures every request has a valid tenant context. No anonymous access reaches the application logic.

2. **Prisma extension** injects `tenant_id` into every database operation automatically. Developers cannot forget it because they never write it.

3. **PostgreSQL RLS** acts as a last line of defense on critical tables. Even a raw SQL query executed through `$queryRaw` is filtered by the database itself.

The only way to leak data across tenants is to bypass all three layers simultaneously — which would require a bug in the middleware, a misconfigured Prisma extension, and a disabled RLS policy.

## Performance Implications

Row-level isolation has performance characteristics that you need to understand and plan for.

**Index design.** Every table needs a composite index that starts with `tenant_id`. Without it, the tenant filter triggers a sequential scan.

```sql
-- Good: tenant_id is the leading column
CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status, created_at);

-- Bad: tenant_id is not the leading column
CREATE INDEX idx_orders_status ON orders(status, created_at);
```

**Query planning.** PostgreSQL's query planner handles `tenant_id = $1` efficiently when statistics are up to date. Run `ANALYZE` regularly, especially after bulk data loads.

**Table partitioning.** At very high scale (tens of millions of rows per table), you might partition by `tenant_id` using PostgreSQL's declarative partitioning. We have not needed this yet — our largest table has 20M rows across all tenants, and index-based filtering is still fast.

```sql
-- If you reach the scale where partitioning helps
CREATE TABLE orders (
  id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  ...
) PARTITION BY HASH (tenant_id);

CREATE TABLE orders_p0 PARTITION OF orders FOR VALUES WITH (MODULUS 8, REMAINDER 0);
CREATE TABLE orders_p1 PARTITION OF orders FOR VALUES WITH (MODULUS 8, REMAINDER 1);
-- ... etc
```

**Connection pooling.** With row-level isolation, all tenants share the same connection pool. This is a significant advantage over schema-per-tenant, where each request might need a connection with a different `search_path`. We use PgBouncer in transaction mode, and the shared pool stays lean.

## Lessons at 100+ Tenants

**The Prisma extension pays for itself immediately.** Before implementing it, we had two incidents where a missing tenant filter exposed data to the wrong tenant during development. Both were caught in code review, but neither should have been possible. Since adding the extension, we have had zero tenant isolation incidents.

**AsyncLocalStorage is the right abstraction.** We initially passed `tenantId` as a parameter through every service method. The function signatures were cluttered and it was easy to lose the context in deeply nested calls. AsyncLocalStorage eliminated this entirely — the tenant context is always available, implicitly.

**RLS is expensive but worth it on critical tables.** Enabling RLS on all 40+ tables added about 15% overhead to query planning time. We scaled back to the 8 most sensitive tables and the overhead dropped to under 3%. The security benefit justifies the cost.

**Test with multiple tenants from day one.** Our CI pipeline creates two test tenants and runs every test twice — once per tenant. Tests that accidentally leak data across tenants fail immediately. This caught more bugs in the first month than code review ever did.

**Plan for tenant offboarding.** When a tenant churns, you need to delete their data. With row-level isolation, this means `DELETE FROM every_table WHERE tenant_id = $1`. We automated this with a cascade of background jobs that process tables in dependency order to respect foreign key constraints. With schema-per-tenant, this would be a single `DROP SCHEMA CASCADE` — one of the few areas where that model is genuinely simpler.

Row-level isolation is not glamorous. It does not provide the physical separation that compliance teams love to hear about. But for SaaS platforms that need to move fast, serve hundreds of tenants from a single deployment, and maintain operational sanity, it is the pragmatic choice. The key is building the enforcement layers that make it safe by default rather than safe by convention.
