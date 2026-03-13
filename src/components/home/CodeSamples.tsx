"use client";

import { useState } from "react";
import AnimateOnScroll from "@/components/shared/AnimateOnScroll";
import SectionHeading from "@/components/shared/SectionHeading";

interface CodeSample {
  filename: string;
  title: string;
  description: string;
  code: string;
}

const codeSamples: CodeSample[] = [
  {
    filename: "tenant-middleware.ts",
    title: "Multi-Tenant Middleware",
    description: "NestJS middleware: JWT claim extraction → AsyncLocalStorage → Prisma auto-filtering",
    code: `@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const user = req['user'];

    if (!user?.tenantId) {
      throw new UnauthorizedException('Missing tenant context');
    }

    const context: TenantContext = {
      tenantId: user.tenantId,
      userId: user.sub,
      role: user.role,
    };

    // Run request inside tenant-scoped AsyncLocalStorage
    tenantStorage.run(context, () => next());
  }
}

// Prisma middleware — auto-applies tenant filtering
export function tenantPrismaMiddleware() {
  return async (params, next) => {
    const context = tenantStorage.getStore();
    if (!context) return next(params);

    if (params.action === 'create') {
      params.args.data.tenantId = context.tenantId;
    }

    if (['findMany', 'findFirst', 'count'].includes(params.action)) {
      params.args.where = { ...params.args.where, tenantId: context.tenantId };
    }

    return next(params);
  };
}`,
  },
  {
    filename: "llm-to-sql-pipeline.ts",
    title: "LLM-to-SQL Pipeline",
    description: "Prompt construction → SQL generation → validation → execution → response synthesis",
    code: `async processQuery(naturalLanguageQuery: string): Promise<PipelineResult> {
  // Step 1: Check cache first
  const cached = await this.cache.get<PipelineResult>(cacheKey);
  if (cached) return { ...cached, cached: true };

  // Step 2: Generate SQL from natural language (GPT-4o Mini)
  const sql = await this.generateSQL(naturalLanguageQuery);

  // Step 3: Validate — prevent injection & unauthorized access
  this.validateSQL(sql);

  // Step 4: Execute with timeout and row limits
  const data = await this.db.query(sql, { timeout: 5000, maxRows: 1000 });

  // Step 5: Synthesize response (GPT-4.1 Mini)
  const summary = await this.synthesizeResponse(naturalLanguageQuery, data);

  await this.cache.set(cacheKey, result, 300); // Cache 5 min
  return result;
}

private validateSQL(sql: string): void {
  const upper = sql.toUpperCase().trim();
  if (!upper.startsWith('SELECT'))
    throw new Error('Only SELECT queries are permitted');

  const blocked = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', '--', ';'];
  for (const keyword of blocked) {
    if (upper.includes(keyword))
      throw new Error(\`Blocked SQL pattern: \${keyword}\`);
  }
}`,
  },
  {
    filename: "redis-caching-strategy.ts",
    title: "Redis Caching Strategy",
    description: "Cache key design, TTL strategy, invalidation patterns for analytical queries",
    code: `// Cache key: namespace:entity:hash(params)
buildKey(namespace: string, identifier: string, params?: Record<string, any>): string {
  const base = \`analytics:\${namespace}:\${identifier}\`;
  if (!params) return base;

  const sorted = JSON.stringify(params, Object.keys(params).sort());
  const hash = Buffer.from(sorted).toString('base64url').slice(0, 16);
  return \`\${base}:\${hash}\`;
}

// Pattern-based invalidation when underlying data changes
async invalidateNamespace(namespace: string): Promise<number> {
  const pattern = \`analytics:\${namespace}:*\`;
  let cursor = '0';
  let deleted = 0;

  do {
    const [nextCursor, keys] = await this.redis.scan(
      cursor, 'MATCH', pattern, 'COUNT', 100
    );
    cursor = nextCursor;
    if (keys.length > 0) {
      await this.redis.del(...keys);
      deleted += keys.length;
    }
  } while (cursor !== '0');

  return deleted;
}

// Stale-while-revalidate pattern
async getOrRefresh<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = await this.get<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  await this.set(key, fresh, { ttl: 300 });
  return fresh;
}`,
  },
];

export default function CodeSamples() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section id="code" className="section-padding bg-[var(--bg-secondary)]">
      <div className="container-custom">
        <SectionHeading
          title="Code Samples"
          subtitle="Sanitized engineering patterns from real production systems"
        />

        <AnimateOnScroll>
          <div className="max-w-4xl mx-auto">
            {/* Tab bar */}
            <div className="flex gap-1 p-1 bg-[var(--bg-primary)] rounded-xl border border-[var(--card-border)] overflow-x-auto">
              {codeSamples.map((sample, i) => (
                <button
                  key={sample.filename}
                  onClick={() => setActiveTab(i)}
                  className={`flex-1 min-w-0 px-4 py-2.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${
                    activeTab === i
                      ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {sample.filename}
                </button>
              ))}
            </div>

            {/* Active sample */}
            <div className="mt-4 glass-card overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--card-border)]">
                <h3 className="font-bold">{codeSamples[activeTab].title}</h3>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  {codeSamples[activeTab].description}
                </p>
              </div>
              <div className="overflow-x-auto">
                <pre className="p-6 text-sm leading-relaxed">
                  <code className="font-mono text-[var(--text-secondary)]">
                    {codeSamples[activeTab].code}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
