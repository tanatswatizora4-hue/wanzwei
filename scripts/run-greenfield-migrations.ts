/**
 * Greenfield migration runner — drops legacy tables, applies 0001–0004.
 *
 * Usage (requires SUPABASE_DB_URL in .env.local — direct or pooler URI):
 *   npx tsx --env-file=.env.local scripts/run-greenfield-migrations.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const ROOT = join(import.meta.dirname, "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

const DROP_LEGACY = `
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.facilities CASCADE;

DO $$
DECLARE
  remaining int;
BEGIN
  SELECT count(*) INTO remaining
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'facilities', 'jobs', 'applications');

  IF remaining > 0 THEN
    RAISE EXCEPTION 'Legacy tables still exist after drop (%).', remaining;
  END IF;
END $$;
`;

const MIGRATION_FILES = [
  "0001_init.sql",
  "0002_phase1_domains.sql",
  "0003_phase4_rls.sql",
  "0004_phase5_storage_hardening.sql",
] as const;

function requireDbUrl(): string {
  const url = process.env.SUPABASE_DB_URL?.trim();
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL is not set. Add it to .env.local from Supabase Dashboard → " +
        "Project Settings → Database → Connection string (URI). Use direct (5432) for migrations.",
    );
  }
  return url;
}

function readMigration(file: string): string {
  return readFileSync(join(MIGRATIONS_DIR, file), "utf8");
}

async function main() {
  const sql = postgres(requireDbUrl(), { prepare: false, max: 1 });

  try {
    console.log("Step 1: Dropping legacy tables…");
    await sql.unsafe(DROP_LEGACY);
    console.log("  ✓ Legacy tables removed");

    for (const file of MIGRATION_FILES) {
      console.log(`Step: Applying ${file}…`);
      await sql.unsafe(readMigration(file));
      console.log(`  ✓ ${file}`);
    }

    const tables = await sql<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    const enums = await sql<{ typname: string }[]>`
      SELECT typname FROM pg_type t
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public' AND t.typtype = 'e'
      ORDER BY typname
    `;

    const policies = await sql<{ count: string }[]>`
      SELECT count(*)::text AS count FROM pg_policies WHERE schemaname = 'public'
    `;

    const bucket = await sql`
      SELECT id, public FROM storage.buckets WHERE id = 'documents'
    `;

    console.log("\n=== Verification ===");
    console.log(`Tables (${tables.length}):`, tables.map((t) => t.table_name).join(", "));
    console.log(`Enums (${enums.length}):`, enums.map((e) => e.typname).join(", "));
    console.log(`RLS policies: ${policies[0]?.count ?? 0}`);
    console.log(`documents bucket:`, bucket[0] ? `id=${bucket[0].id}, public=${bucket[0].public}` : "MISSING");
    console.log("\nGreenfield migration complete.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
