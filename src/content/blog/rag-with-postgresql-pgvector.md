---
title: "Building Semantic Search with PostgreSQL and pgvector"
slug: "rag-with-postgresql-pgvector"
date: "2025-10-20"
tags: ["AI", "pgvector", "PostgreSQL", "Vector Search", "RAG"]
excerpt: "Why I chose pgvector over dedicated vector databases, and how to implement production-grade semantic search without leaving PostgreSQL."
readingTime: 7
published: true
ogImage: "/images/blog/pgvector-og.png"
---

## The Case Against Another Database

When I started building semantic search into our analytics platform, the default advice was clear: use a dedicated vector database. Pinecone, Weaviate, Qdrant, Milvus — the ecosystem is full of purpose-built solutions. I evaluated several of them and chose none.

The reason was not technical limitations. These are excellent tools. The reason was operational complexity. Our stack already runs on PostgreSQL. Every tenant's data lives there. Our backup strategy, monitoring, access controls, and deployment pipeline are all built around PostgreSQL. Adding a dedicated vector database means adding a new failure mode, a new backup target, a new set of credentials to manage, and a new synchronization problem between the source of truth and the search index.

pgvector gave us 90% of the capability at 10% of the operational cost. For our workload — semantic search over schema metadata, documentation chunks, and FAQ entries, totaling around 500K vectors — it is more than sufficient.

## Setting Up pgvector

pgvector is a PostgreSQL extension. If you are on a managed provider like Neon or Supabase, it is available out of the box. For self-hosted instances, installation is straightforward.

```sql
-- Enable the extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a table with a vector column
CREATE TABLE document_embeddings (
  id SERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  content TEXT NOT NULL,
  source_type VARCHAR(50) NOT NULL,  -- 'schema', 'faq', 'doc'
  source_id VARCHAR(255) NOT NULL,
  embedding vector(1536),            -- OpenAI text-embedding-3-small dimension
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite index for tenant-scoped queries
CREATE INDEX idx_embeddings_tenant ON document_embeddings(tenant_id);
```

The `vector(1536)` type stores a 1536-dimensional floating point vector, which matches the output of OpenAI's `text-embedding-3-small` model. If you use a different embedding model, adjust the dimension accordingly. Cohere's embed-v3 outputs 1024 dimensions; many open-source models use 384 or 768.

## Generating Embeddings

We generate embeddings at ingestion time, not at query time. When a tenant's schema changes or new documentation is added, we re-embed the affected chunks and upsert them into the table.

```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI();

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  return response.data[0].embedding;
}

async function embedAndStore(
  tenantId: string,
  chunks: DocumentChunk[],
): Promise<void> {
  // Batch embedding requests (max 2048 inputs per API call)
  const batchSize = 512;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map(c => c.content);

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });

    const values = batch.map((chunk, idx) => ({
      tenantId,
      content: chunk.content,
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId,
      embedding: response.data[idx].embedding,
      metadata: chunk.metadata,
    }));

    // Upsert using ON CONFLICT
    await this.prisma.$executeRaw`
      INSERT INTO document_embeddings (tenant_id, content, source_type, source_id, embedding, metadata)
      SELECT * FROM UNNEST(
        ${values.map(v => v.tenantId)}::uuid[],
        ${values.map(v => v.content)}::text[],
        ${values.map(v => v.sourceType)}::varchar[],
        ${values.map(v => v.sourceId)}::varchar[],
        ${values.map(v => `[${v.embedding.join(',')}]`)}::vector[],
        ${values.map(v => JSON.stringify(v.metadata))}::jsonb[]
      )
      ON CONFLICT (tenant_id, source_type, source_id)
      DO UPDATE SET
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `;
  }
}
```

Batching is important. The OpenAI embeddings API charges per token, and network round trips add up. Sending 512 chunks in one request is dramatically faster than 512 individual calls.

## Indexing Strategies: IVFFlat vs HNSW

Without an index, pgvector performs an exact nearest-neighbor search — a sequential scan that compares the query vector against every row. This is fine for small datasets but becomes impractical beyond 100K vectors.

pgvector supports two approximate nearest-neighbor (ANN) index types: IVFFlat and HNSW.

### IVFFlat

IVFFlat (Inverted File with Flat compression) partitions vectors into clusters using k-means. At query time, it searches only the closest clusters rather than the entire dataset.

```sql
-- Create an IVFFlat index
-- lists = sqrt(row_count) is a reasonable starting point
CREATE INDEX idx_embeddings_ivfflat ON document_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 500);
```

**Pros:** Faster to build than HNSW. Lower memory usage during index construction. Good for datasets that are periodically rebuilt in bulk.

**Cons:** Requires the data to be present before building the index. Recall quality degrades if the data distribution shifts significantly after index creation. You need to periodically rebuild the index with `REINDEX`.

### HNSW

HNSW (Hierarchical Navigable Small World) builds a multi-layered graph structure. It is more expensive to build but provides better recall and faster queries.

```sql
-- Create an HNSW index
CREATE INDEX idx_embeddings_hnsw ON document_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);
```

The `m` parameter controls the number of connections per node (higher = better recall, more memory). `ef_construction` controls the search breadth during index building (higher = better quality index, slower build).

**Pros:** Better recall at the same query speed. Handles incremental inserts well — no need to rebuild.

**Cons:** Higher memory usage. Slower index construction. For 500K vectors with 1536 dimensions, expect the index to consume several GB of RAM.

### Which One to Choose

For our use case, we chose HNSW. Our data changes incrementally — new tenants add schema metadata, documentation gets updated — and we cannot afford downtime for index rebuilds. The memory overhead is acceptable because we are running on instances with sufficient RAM for our PostgreSQL workload anyway.

If your dataset is mostly static and you rebuild nightly, IVFFlat is a perfectly good choice and uses less memory.

## Similarity Search Queries

The core search query is straightforward:

```sql
-- Find the 10 most similar documents for a given tenant
SELECT
  id,
  content,
  source_type,
  metadata,
  1 - (embedding <=> $1::vector) AS similarity
FROM document_embeddings
WHERE tenant_id = $2
  AND source_type = ANY($3::varchar[])
ORDER BY embedding <=> $1::vector
LIMIT 10;
```

The `<=>` operator computes cosine distance. pgvector also supports `<->` for L2 (Euclidean) distance and `<#>` for inner product. Cosine distance is the standard choice for text embeddings.

In the application layer, the search function looks like this:

```typescript
async function similaritySearch(
  query: string,
  tenantId: string,
  options: {
    sourceTypes?: string[];
    threshold?: number;
    limit?: number;
  } = {},
): Promise<SearchResult[]> {
  const {
    sourceTypes = ['schema', 'faq', 'doc'],
    threshold = 0.6,
    limit = 10,
  } = options;

  const queryEmbedding = await generateEmbedding(query);

  const results = await this.prisma.$queryRaw<SearchResult[]>`
    SELECT
      id,
      content,
      source_type,
      metadata,
      1 - (embedding <=> ${queryEmbedding}::vector) AS similarity
    FROM document_embeddings
    WHERE tenant_id = ${tenantId}::uuid
      AND source_type = ANY(${sourceTypes}::varchar[])
      AND 1 - (embedding <=> ${queryEmbedding}::vector) > ${threshold}
    ORDER BY embedding <=> ${queryEmbedding}::vector
    LIMIT ${limit}
  `;

  return results;
}
```

The `threshold` parameter is important. Without it, every query returns results — even completely irrelevant ones. A similarity score of 0.6 (cosine similarity) is a reasonable default for filtering out noise. Tune this based on your data.

## Production Considerations

### Index Tuning

After deploying HNSW, we noticed that some queries were slower than expected. The issue was the `ef_search` parameter, which controls the search breadth at query time.

```sql
-- Increase ef_search for better recall (default is 40)
SET hnsw.ef_search = 100;
```

Higher `ef_search` means the algorithm explores more nodes during search, improving recall at the cost of latency. We settled on 100 after benchmarking. At 40, recall was around 92%. At 100, recall improved to 97% with only a 2ms latency increase.

You can set this per-session or per-role:

```sql
ALTER ROLE app_user SET hnsw.ef_search = 100;
```

### Batch Processing for Embeddings

Embedding generation is the most expensive part of the pipeline, both in terms of cost and latency. We batch aggressively and run embedding jobs asynchronously via a BullMQ worker.

```typescript
// Queue embedding jobs instead of processing inline
await this.embeddingQueue.add('embed-documents', {
  tenantId,
  chunks: newChunks,
}, {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
});
```

For initial tenant onboarding, where we need to embed their entire schema and documentation, this can involve thousands of chunks. Running it synchronously would block the API for minutes. The queue worker processes chunks in batches of 512, with rate limiting to stay within OpenAI's API limits.

### Keeping Embeddings Fresh

Stale embeddings are a silent accuracy killer. When a tenant modifies their schema — adds a column, renames a table — the old embeddings no longer represent the current state.

We solve this with a change detection layer in the schema sync pipeline:

```typescript
async function onSchemaChange(tenantId: string, changes: SchemaChange[]) {
  const chunksToReEmbed = changes.flatMap(change => {
    switch (change.type) {
      case 'column_added':
      case 'column_removed':
      case 'column_renamed':
        return [buildTableChunk(change.tableName)];
      case 'table_added':
        return [buildTableChunk(change.tableName)];
      case 'table_removed':
        return [{ action: 'delete', sourceId: change.tableName }];
      default:
        return [];
    }
  });

  await this.embeddingQueue.add('re-embed', { tenantId, chunks: chunksToReEmbed });
}
```

This ensures that the vector index always reflects the current state of the tenant's data model.

## Integration with the Analytics Pipeline

The semantic search layer feeds directly into our LLM-to-SQL pipeline. When a user asks a natural language question, the first step is a similarity search against their schema embeddings to identify relevant tables and columns. This schema context is then injected into the SQL generation prompt.

The flow looks like this:

1. User asks: "What were the top selling products last month?"
2. Similarity search finds: `products` table, `order_items` table, `orders` table with date columns
3. Schema context is constructed from these matches
4. GPT-4o Mini generates a SQL query using this focused context
5. The query is validated and executed

Without semantic search, we would need to send the entire schema to the LLM — hundreds of tables across all domains. By narrowing the context to 5-8 relevant tables, we reduce token usage by 80% and improve SQL generation accuracy because the model has less noise to contend with.

## Conclusion

pgvector is not going to replace Pinecone for a billion-vector similarity search workload. That is not the point. For applications where vector search is one feature among many — and where PostgreSQL is already the operational database — pgvector eliminates an entire category of infrastructure complexity.

The key insight is that most applications do not need a dedicated vector database. They need vector search capabilities within their existing database. pgvector delivers exactly that, with the full power of PostgreSQL's query planner, ACID transactions, and battle-tested replication behind it.

Our production deployment handles 500K vectors across 100+ tenants with p99 query latency under 50ms. The HNSW index uses about 3GB of RAM, which is well within our PostgreSQL instance's capacity. If our vector count grows by 10x, we might revisit this decision. Until then, pgvector is the right tool for the job.
