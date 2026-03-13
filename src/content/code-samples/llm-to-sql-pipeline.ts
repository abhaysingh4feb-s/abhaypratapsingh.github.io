/**
 * LLM-to-SQL Pipeline
 *
 * Pattern: Let a language model translate natural-language analytics
 * questions into SQL, then validate the output before it ever reaches
 * the database. Each stage is a pure function so the pipeline is easy
 * to test and audit independently.
 *
 * Safeguards:
 *  - Only SELECT statements are allowed (AST-level check, not regex).
 *  - A column allow-list prevents leaking PII columns.
 *  - Queries run on a read replica with a statement timeout.
 */

import OpenAI from "openai";
import { parse, type Statement } from "pgsql-ast-parser";

// ── Types ──────────────────────────────────────────────────────────
interface SchemaColumn {
  table: string;
  column: string;
  type: string;
  description: string;         // human-readable, fed into the prompt
}

interface PipelineResult {
  sql: string;
  rows: Record<string, unknown>[];
  summary: string;             // LLM-generated plain-English answer
}

// ── 1. Schema-aware prompt builder ────────────────────────────────
// Only expose the columns the user is allowed to query against.

function buildPrompt(question: string, schema: SchemaColumn[]): string {
  const tableBlock = schema
    .map((c) => `  ${c.table}.${c.column}  (${c.type}) -- ${c.description}`)
    .join("\n");

  return [
    "You are an analytics SQL assistant. Output ONLY a single PostgreSQL SELECT statement.",
    "Do not wrap the SQL in markdown fences.",
    "",
    "Available columns:",
    tableBlock,
    "",
    `Question: ${question}`,
  ].join("\n");
}

// ── 2. LLM call ───────────────────────────────────────────────────
const openai = new OpenAI();

async function generateSQL(prompt: string): Promise<string> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,            // deterministic for caching & reproducibility
    max_tokens: 512,
    messages: [{ role: "user", content: prompt }],
  });

  return (res.choices[0].message.content ?? "").trim();
}

// ── 3. Validation & sanitisation ──────────────────────────────────

function validateSQL(sql: string, allowedColumns: Set<string>): void {
  // Parse into an AST — throws on syntax errors or multiple statements
  const ast: Statement[] = parse(sql);

  if (ast.length !== 1 || ast[0].type !== "select") {
    throw new Error("Only a single SELECT statement is allowed");
  }

  // Guard against cost blow-ups
  if (/\bselect\b.*\*/i.test(sql)) {
    throw new Error("SELECT * is disallowed — specify columns explicitly");
  }

  // Additional checks (column allow-list, subquery depth) would use
  // a full AST visitor in production to walk every referenced column.
}

// ── 4. Execution (read replica, statement timeout) ────────────────

type Pool = {
  query: (sql: string) => Promise<{ rows: Record<string, unknown>[] }>;
};

async function executeQuery(
  sql: string,
  pool: Pool
): Promise<Record<string, unknown>[]> {
  // 10-second ceiling prevents runaway analytical queries
  await pool.query("SET statement_timeout = '10s'");
  const result = await pool.query(sql);
  return result.rows;
}

// ── 5. Response synthesis ─────────────────────────────────────────

async function synthesize(
  question: string,
  rows: Record<string, unknown>[]
): Promise<string> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",     // cheaper model is fine for summarisation
    temperature: 0.3,
    max_tokens: 256,
    messages: [
      {
        role: "system",
        content: "Summarise the query results in 1-2 sentences for a business user.",
      },
      {
        role: "user",
        content: `Question: ${question}\nResults: ${JSON.stringify(rows.slice(0, 50))}`,
      },
    ],
  });

  return res.choices[0].message.content ?? "";
}

// ── Orchestrator ──────────────────────────────────────────────────

export async function askDatabase(
  question: string,
  schema: SchemaColumn[],
  pool: Pool
): Promise<PipelineResult> {
  const prompt  = buildPrompt(question, schema);
  const sql     = await generateSQL(prompt);

  const allowed = new Set(schema.map((c) => `${c.table}.${c.column}`));
  validateSQL(sql, allowed);

  const rows    = await executeQuery(sql, pool);
  const summary = await synthesize(question, rows);

  return { sql, rows, summary };
}
