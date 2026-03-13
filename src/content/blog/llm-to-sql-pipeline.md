---
title: "Designing a Secure LLM-to-SQL Pipeline"
slug: "llm-to-sql-pipeline"
date: "2025-11-15"
tags: ["AI", "LLM", "PostgreSQL", "Security", "NestJS"]
excerpt: "How I built a natural language to SQL system that handles prompt injection, schema validation, and query sandboxing — processing 20M+ records in production."
readingTime: 8
published: true
ogImage: "/images/blog/llm-to-sql-og.png"
---

## The Problem: SQL Is a Barrier

Every analytics platform eventually faces the same tension. You have powerful data sitting in PostgreSQL — millions of rows of transactions, user events, inventory movements — and the people who need answers cannot write SQL. They rely on pre-built dashboards, or worse, they file tickets and wait three days for an engineer to run a query.

When our platform crossed the 20 million record mark across 100+ tenants, the ticket volume for ad-hoc queries became unsustainable. Business users wanted to ask things like "show me the top 10 products by revenue last quarter" or "which warehouse had the highest return rate in September." These are straightforward questions, but translating them into correct, performant SQL against a normalized schema with tenant isolation is not trivial.

We decided to build a natural language to SQL pipeline. The goal was simple: let users type a question in English and get back a table of results. The implementation turned out to be anything but simple.

## Architecture Overview

The pipeline has five stages, each with its own failure modes and security concerns.

```
User Question
    |
    v
[1. Prompt Construction] — schema context injection
    |
    v
[2. SQL Generation]      — GPT-4o Mini
    |
    v
[3. Validation Layer]    — AST parsing, whitelist checks
    |
    v
[4. Execution]           — sandboxed read-only connection
    |
    v
[5. Response Synthesis]  — GPT-4.1 Mini for natural language summary
```

### Stage 1: Prompt Construction with Schema Context

The LLM needs to know what tables and columns exist. Sending the entire database schema in every request is wasteful and noisy. Instead, we built a schema registry that provides relevant context based on the user's question.

```typescript
interface SchemaContext {
  tables: TableDefinition[];
  relationships: ForeignKeyRelation[];
  sampleValues: Record<string, string[]>;
  tenantColumn: string;
}

async function buildSchemaContext(
  question: string,
  tenantId: string,
): Promise<SchemaContext> {
  // First pass: use embeddings to find relevant tables
  const relevantTables = await this.vectorStore.similaritySearch(
    question,
    { threshold: 0.7, limit: 8 }
  );

  // Fetch column definitions for matched tables
  const tables = await Promise.all(
    relevantTables.map(t => this.schemaRegistry.getTableDef(t.name))
  );

  // Include foreign key relationships between selected tables
  const relationships = await this.schemaRegistry
    .getRelationships(tables.map(t => t.name));

  // Sample values help the LLM understand data formats
  const sampleValues = await this.getSampleValues(tables, tenantId);

  return { tables, relationships, sampleValues, tenantColumn: 'tenant_id' };
}
```

The schema context is embedded using pgvector (more on this in a separate post), so when a user asks about "revenue," the system pulls in the `orders`, `order_items`, and `products` tables automatically — without needing explicit keyword matching.

We also inject a few sample values for enum-like columns. If a user asks about "pending orders," the LLM needs to know that the status column contains `'pending'`, `'shipped'`, `'delivered'` — not `0`, `1`, `2`.

### Stage 2: SQL Generation

We use GPT-4o Mini for SQL generation. The choice was deliberate: it is fast, inexpensive, and surprisingly good at structured output when given a well-constrained prompt. We tried GPT-4o for this stage and found no meaningful improvement in SQL quality for the 3x cost increase.

The system prompt is heavily constrained:

```typescript
const systemPrompt = `You are a PostgreSQL query generator. Given a user question
and database schema, generate a single SELECT query.

Rules:
- ONLY generate SELECT statements. Never INSERT, UPDATE, DELETE, DROP, or ALTER.
- ALWAYS include WHERE tenant_id = $1 in every query.
- Use parameterized queries with $1 for tenant_id.
- Limit results to 1000 rows unless the user specifies otherwise.
- Use explicit column names, never SELECT *.
- Include ORDER BY when the question implies ranking.
- Use CTEs for complex queries instead of nested subqueries.

Schema:
${formatSchema(schemaContext)}

Respond with ONLY the SQL query. No explanation, no markdown fencing.`;
```

The tenant_id constraint is critical. Every query must be scoped to the current tenant. We enforce this both in the prompt and in the validation layer.

### Stage 3: The Validation Layer

This is the most important stage from a security perspective. We never trust the LLM's output. The generated SQL passes through multiple validation gates before it touches the database.

```typescript
async function validateQuery(sql: string, context: SchemaContext): Promise<ValidationResult> {
  // Step 1: Parse into AST using pgsql-ast-parser
  const ast = parse(sql);

  // Step 2: Verify it's a SELECT statement
  if (ast.length !== 1 || ast[0].type !== 'select') {
    return { valid: false, reason: 'Only SELECT statements are allowed' };
  }

  const stmt = ast[0] as SelectStatement;

  // Step 3: Verify all referenced tables are in the schema context
  const referencedTables = extractTableNames(stmt);
  const allowedTables = new Set(context.tables.map(t => t.name));

  for (const table of referencedTables) {
    if (!allowedTables.has(table)) {
      return { valid: false, reason: `Table '${table}' is not accessible` };
    }
  }

  // Step 4: Verify tenant_id filter is present
  if (!hasTenantFilter(stmt, context.tenantColumn)) {
    return { valid: false, reason: 'Missing tenant isolation filter' };
  }

  // Step 5: Check for dangerous patterns
  if (containsSubquery(stmt) && getSubqueryDepth(stmt) > 2) {
    return { valid: false, reason: 'Query complexity exceeds limits' };
  }

  // Step 6: EXPLAIN to check estimated cost
  const plan = await this.db.query(`EXPLAIN (FORMAT JSON) ${sql}`, [tenantId]);
  const estimatedCost = plan[0]['QUERY PLAN'][0]['Plan']['Total Cost'];

  if (estimatedCost > MAX_QUERY_COST) {
    return { valid: false, reason: 'Query is too expensive to execute' };
  }

  return { valid: true };
}
```

We parse the SQL into an abstract syntax tree using `pgsql-ast-parser`. This is not string matching — we walk the actual parse tree to verify structural properties. No amount of creative SQL formatting can bypass an AST-level check for non-SELECT statements.

### Stage 4: Sandboxed Execution

Even after validation, we execute queries through a restricted database connection. This connection uses a PostgreSQL role with only `SELECT` privileges on a specific set of views. The views themselves enforce row-level security.

```sql
-- Create a read-only role for LLM queries
CREATE ROLE llm_reader WITH LOGIN PASSWORD '...';
GRANT USAGE ON SCHEMA analytics TO llm_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO llm_reader;

-- Set statement timeout to prevent runaway queries
ALTER ROLE llm_reader SET statement_timeout = '10s';

-- Set work_mem limit
ALTER ROLE llm_reader SET work_mem = '64MB';
```

The 10-second statement timeout is a hard backstop. If validation misses an expensive query, PostgreSQL kills it automatically.

### Stage 5: Response Synthesis

Raw query results are not user-friendly. A table with columns like `sum_revenue`, `product_category`, and `pct_change` needs context. We use GPT-4.1 Mini to synthesize a natural language summary alongside the data table.

```typescript
const synthesisPrompt = `The user asked: "${originalQuestion}"

The query returned the following data:
${formatResultsAsMarkdown(results)}

Provide a brief natural language summary of the findings (2-3 sentences).
Highlight any notable patterns or outliers. Be specific with numbers.`;
```

This stage is lower risk because it only reads data that has already been fetched. There is no database interaction.

## Prompt Injection Prevention

Prompt injection is the primary threat model for any LLM-to-SQL system. An attacker who can control the input can potentially manipulate the LLM into generating malicious SQL.

Our defense is layered:

**Input sanitization.** We strip SQL keywords from user input before it reaches the LLM. This is not foolproof — an attacker can use Unicode homoglyphs or creative spacing — but it raises the bar.

**Structural validation.** The AST parser catches any non-SELECT statement regardless of how it was injected. Even if the LLM is tricked into generating `DROP TABLE users; SELECT 1`, the parser rejects it because the AST contains two statements.

**Table whitelisting.** The query can only reference tables present in the schema context. System tables like `pg_catalog` and `information_schema` are never included.

**Output validation.** We verify that the query results conform to expected column types and row counts. If a query returns an unexpected shape, it is flagged and logged for review.

**Tenant isolation.** The AST validator confirms that `tenant_id = $1` appears in the WHERE clause. The sandboxed database role provides a second layer of isolation through PostgreSQL's own access controls.

## Performance: Making It Fast Enough

The pipeline has inherent latency — two LLM calls plus a database query. Without optimization, end-to-end response time was around 8 seconds. We brought it down to under 3 seconds for most queries.

**Redis caching.** We hash the normalized question + tenant ID and cache both the generated SQL and the results. Cache TTL varies by query type: aggregate queries (sums, counts) cache for 15 minutes, while queries over static reference data cache for hours.

```typescript
const cacheKey = `nlq:${tenantId}:${hashQuestion(normalizedQuestion)}`;
const cached = await this.redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached); // skip all five stages
}
```

**Query plan analysis.** Before executing, we check if PostgreSQL's query planner estimates a sequential scan on a large table. If so, we rewrite the prompt to encourage indexed access patterns and regenerate.

**Streaming responses.** The synthesis stage streams tokens to the frontend as they are generated. The user sees the data table immediately and the natural language summary appears progressively.

## Lessons Learned

**LLMs are surprisingly good at SQL.** GPT-4o Mini generates correct SQL about 87% of the time on our benchmark set. Most failures are on complex joins or ambiguous column names, not syntax errors.

**Validation is non-negotiable.** We caught three prompt injection attempts in the first month of production. All were blocked by the AST parser, not by input sanitization. Defense in depth works.

**Schema context quality matters more than model size.** Switching from GPT-4o to GPT-4o Mini with better schema context actually improved accuracy. The model does not need to be smarter — it needs better information.

**Cache hit rates are higher than expected.** Business users tend to ask similar questions in clusters. Our cache hit rate stabilized around 40%, which meaningfully reduces both cost and latency.

**Monitor everything.** Every generated query is logged with the original question, the schema context used, the validation result, execution time, and the final response. This audit trail is essential for debugging and for identifying patterns that need new validation rules.

Building an LLM-to-SQL pipeline is an exercise in defense engineering as much as it is an AI integration project. The LLM is a powerful but unreliable component. Surrounding it with deterministic validation, sandboxed execution, and comprehensive monitoring is what makes the system production-worthy. The 20M+ records our tenants query daily never know they are being accessed through natural language — and that is exactly how it should feel.
