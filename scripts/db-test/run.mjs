#!/usr/bin/env node
/**
 * Local database test runner (no Docker needed).
 *
 * Boots PGlite (Postgres compiled to WebAssembly), loads a minimal Supabase shim
 * (auth/storage schemas, API roles, default privileges), applies every migration in
 * supabase/migrations, optionally the dev seed, then runs supabase/tests/database/*.test.sql
 * and reports pgTAP-style results.
 *
 * The same test files run unchanged on a real local Supabase stack with `supabase test db`.
 *
 * Usage: node scripts/db-test/run.mjs [--no-seed] [--verbose]
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..", "..");
const args = new Set(process.argv.slice(2));
const verbose = args.has("--verbose");
const withSeed = !args.has("--no-seed");

const read = (p) => readFileSync(p, "utf8");
const migrationsDir = join(root, "supabase", "migrations");
const testsDir = join(root, "supabase", "tests", "database");

/** Expands psql `\ir file` includes relative to the including file. */
function expandIncludes(sql, baseDir) {
  return sql.replace(/^\\ir\s+(\S+)\s*$/gm, (_, file) => expandIncludes(read(join(baseDir, file)), baseDir));
}

function rowsToText(results) {
  const lines = [];
  for (const r of results) {
    for (const row of r.rows ?? []) {
      const v = Object.values(row)[0];
      if (typeof v === "string") lines.push(v);
    }
  }
  return lines;
}

const db = await PGlite.create({ extensions: { pgcrypto } });

async function step(label, sql) {
  try {
    await db.exec(sql);
    if (verbose) console.log(`✓ ${label}`);
  } catch (e) {
    console.error(`✗ ${label}\n  ${e.message}`);
    if (e.position) {
      const pos = Number(e.position);
      console.error(`  near: …${sql.slice(Math.max(0, pos - 120), pos + 80).replace(/\n/g, "⏎")}…`);
    }
    process.exit(1);
  }
}

await step("Supabase shim", read(join(here, "supabase-shim.sql")));
await step("mini pgTAP", read(join(here, "mini-pgtap.sql")));

const migrations = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
for (const m of migrations) await step(`migration ${m}`, read(join(migrationsDir, m)));
console.log(`Applied ${migrations.length} migrations.`);

if (withSeed) {
  await step("seed.sql", read(join(root, "supabase", "seed.sql")));
  console.log("Applied development seed.");
}

const files = readdirSync(testsDir).filter((f) => f.endsWith(".test.sql")).sort();
let totalPass = 0;
let totalFail = 0;
let fileFailures = 0;

for (const f of files) {
  const sql = expandIncludes(read(join(testsDir, f)), testsDir);
  let lines;
  try {
    await db.exec("set search_path to public, extensions");
    lines = rowsToText(await db.exec(sql));
  } catch (e) {
    fileFailures++;
    console.log(`\n✗ ${f}: aborted with ${e.code ?? ""} ${e.message}`);
    try {
      await db.exec("rollback");
    } catch {}
    continue;
  }
  const planLine = lines.find((l) => /^1\.\.\d+$/.test(l));
  const planned = planLine ? Number(planLine.slice(3)) : null;
  const results = lines.filter((l) => /^(not )?ok \d+/.test(l));
  const failed = results.filter((l) => l.startsWith("not ok"));
  const passed = results.length - failed.length;
  totalPass += passed;
  totalFail += failed.length;
  const planOk = planned === null || planned === results.length;
  if (!planOk) fileFailures++;
  const mark = failed.length === 0 && planOk ? "✓" : "✗";
  console.log(`\n${mark} ${f}: ${passed}/${results.length} passed${planOk ? "" : ` (planned ${planned})`}`);
  for (const l of verbose ? results : failed) console.log(`   ${l.replace(/\n/g, "\n   ")}`);
}

console.log(`\n${totalPass} passed, ${totalFail} failed, ${files.length} files${fileFailures ? `, ${fileFailures} file error(s)` : ""}.`);
await db.close();
process.exit(totalFail > 0 || fileFailures > 0 ? 1 : 0);
