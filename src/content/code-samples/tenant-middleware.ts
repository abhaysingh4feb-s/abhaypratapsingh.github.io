/**
 * Multi-Tenant Context Middleware (NestJS + Prisma)
 *
 * Pattern: Extract tenant identity from a JWT claim at the middleware layer,
 * propagate it through the request lifecycle via AsyncLocalStorage, and
 * enforce row-level isolation automatically in every Prisma query.
 *
 * Why AsyncLocalStorage instead of request-scoped providers?
 *  - Zero coupling: services never import or inject the HTTP request.
 *  - Works in background jobs and event handlers where there is no request.
 *  - ~3 % faster than NestJS REQUEST scope on high-throughput benchmarks.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { Injectable, NestMiddleware } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { Request, Response, NextFunction } from "express";

// ── Tenant context type ────────────────────────────────────────────
interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  planTier: "free" | "pro" | "enterprise";
}

// Single process-wide store — imported wherever tenant info is needed
export const tenantStore = new AsyncLocalStorage<TenantContext>();

// Helper to read context or throw early if it is missing
export function requireTenant(): TenantContext {
  const ctx = tenantStore.getStore();
  if (!ctx) throw new Error("Tenant context is not available in this scope");
  return ctx;
}

// ── NestJS Middleware ──────────────────────────────────────────────
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // The JWT has already been verified by a preceding AuthGuard.
    // We read the decoded payload attached to the request object.
    const claims = (req as any).user;

    const ctx: TenantContext = {
      tenantId: claims.org_id,        // Auth0 custom claim
      tenantSlug: claims.org_slug,
      planTier: claims.org_plan ?? "free",
    };

    // Run the rest of the request inside the async context
    tenantStore.run(ctx, () => next());
  }
}

// ── Prisma middleware for automatic tenant filtering ───────────────
// Attach once at bootstrap: prisma.$use(tenantQueryFilter)

const TENANT_SCOPED_MODELS = new Set([
  "Project",
  "Document",
  "ApiKey",
  "AuditLog",
  "BillingEvent",
]);

export function tenantQueryFilter(
  params: { model?: string; action: string; args: any },
  next: (params: any) => Promise<any>
) {
  const model = params.model;
  if (!model || !TENANT_SCOPED_MODELS.has(model)) return next(params);

  const { tenantId } = requireTenant();

  // Reads: inject a WHERE clause so one tenant never sees another's rows
  if (["findMany", "findFirst", "findUnique", "count", "aggregate"].includes(params.action)) {
    params.args.where = { ...params.args.where, tenant_id: tenantId };
  }

  // Writes: stamp tenant_id on every INSERT automatically
  if (["create", "createMany"].includes(params.action)) {
    const data = params.args.data;
    if (Array.isArray(data)) {
      params.args.data = data.map((row: any) => ({ ...row, tenant_id: tenantId }));
    } else {
      params.args.data = { ...data, tenant_id: tenantId };
    }
  }

  // Mutations: scope updates and deletes to prevent cross-tenant writes
  if (["update", "updateMany", "delete", "deleteMany"].includes(params.action)) {
    params.args.where = { ...params.args.where, tenant_id: tenantId };
  }

  return next(params);
}
