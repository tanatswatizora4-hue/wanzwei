/**
 * Read-only RLS metadata check (no app flows or access simulations).
 *
 * Usage: npx tsx --env-file=.env.local scripts/verify-rls-metadata.ts
 */

import postgres from "postgres";

const SCRIPT_DEADLINE_MS = 20_000;
const CONNECT_TIMEOUT_SECONDS = 15;
const CONNECT_PROBE_TIMEOUT_MS = 12_000;
const METADATA_QUERY_TIMEOUT_MS = 6_000;

const TARGET_TABLES = [
  "users",
  "jobs",
  "applications",
  "notifications",
  "saved_jobs",
  "verifications",
  "verification_documents",
  "emergency_alerts",
  "emergency_alert_recipients",
  "facilities",
  "interviews",
  "courses",
  "listings",
  "professional_documents",
  "facility_verification_documents",
  "practitioner_registry",
  "verification_events",
  "course_enrolments",
  "listing_enquiries",
] as const;

/** Registry/audit tables are RLS-enabled with no client policies (default deny). */
const DEFAULT_DENY_TABLES = new Set<string>([
  "practitioner_registry",
  "verification_events",
]);

const METADATA_SQL = `
  WITH targets AS (
    SELECT unnest(ARRAY[
      'users',
      'jobs',
      'applications',
      'notifications',
      'saved_jobs',
      'verifications',
      'verification_documents',
      'emergency_alerts',
      'emergency_alert_recipients',
      'facilities',
      'interviews',
      'courses',
      'listings',
      'professional_documents',
      'facility_verification_documents',
      'practitioner_registry',
      'verification_events',
      'course_enrolments',
      'listing_enquiries'
    ]::text[]) AS table_name
  )
  SELECT
    t.table_name,
    c.relrowsecurity AS rls_enabled,
    COALESCE(p.policy_count, 0)::int AS policy_count
  FROM targets t
  LEFT JOIN pg_class c
    ON c.relname = t.table_name
   AND c.relkind = 'r'
  LEFT JOIN pg_namespace n
    ON n.oid = c.relnamespace
   AND n.nspname = 'public'
  LEFT JOIN (
    SELECT tablename, count(*)::int AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
  ) p ON p.tablename = t.table_name
  ORDER BY t.table_name
`;

type TableMetadata = {
  table_name: string;
  rls_enabled: boolean | null;
  policy_count: number;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env.local.`);
  }
  return value;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}

function formatPassFail(ok: boolean): string {
  return ok ? "PASS" : "FAIL";
}

function printTable(rows: TableMetadata[]): void {
  const header = ["Table", "RLS", "Policies", "Status"];
  const colWidths = [36, 6, 10, 6];

  const line = (cells: string[]) =>
    cells.map((cell, index) => cell.padEnd(colWidths[index] ?? 0)).join("  ");

  console.log(line(header));
  console.log(line(colWidths.map((width) => "-".repeat(width))));

  for (const row of rows) {
    const rlsOk = row.rls_enabled === true;
    const policiesOk = DEFAULT_DENY_TABLES.has(row.table_name)
      ? row.policy_count === 0
      : row.policy_count >= 1;
    const statusOk = rlsOk && policiesOk;

    console.log(
      line([
        row.table_name,
        row.rls_enabled === true ? "on" : row.rls_enabled === false ? "off" : "n/a",
        String(row.policy_count),
        formatPassFail(statusOk),
      ]),
    );
  }
}

function failFast(message: string, reason?: string): never {
  console.error(`\n${message}`);
  if (reason) {
    console.error(`Reason: ${reason}`);
  }
  process.exit(1);
}

async function verifyRls(): Promise<void> {
  const url = requireEnv("SUPABASE_DB_URL");

  const sql = postgres(url, {
    prepare: false,
    max: 1,
    connect_timeout: CONNECT_TIMEOUT_SECONDS,
    idle_timeout: 1,
    max_lifetime: 18,
  });

  try {
    await withTimeout(sql`SELECT 1 AS ok`, CONNECT_PROBE_TIMEOUT_MS, "database connection");

    console.log("Verifying RLS metadata…\n");

    const rows = await withTimeout(
      sql.unsafe<TableMetadata[]>(METADATA_SQL),
      METADATA_QUERY_TIMEOUT_MS,
      "RLS metadata query",
    );

    const byName = new Map(rows.map((row) => [row.table_name, row]));
    const orderedRows: TableMetadata[] = TARGET_TABLES.map((table) => {
      const row = byName.get(table);
      return (
        row ?? {
          table_name: table,
          rls_enabled: null,
          policy_count: 0,
        }
      );
    });

    printTable(orderedRows);

    const failures = orderedRows.filter((row) => {
      const rlsOk = row.rls_enabled === true;
      const policiesOk = DEFAULT_DENY_TABLES.has(row.table_name)
        ? row.policy_count === 0
        : row.policy_count >= 1;
      return !rlsOk || !policiesOk;
    });

    console.log("");
    if (failures.length > 0) {
      failFast(
        `verify:rls failed: ${failures.length}/${TARGET_TABLES.length} table(s) missing RLS or policies.`,
      );
    }

    console.log(`verify:rls passed (${TARGET_TABLES.length}/${TARGET_TABLES.length} tables).`);
  } finally {
    void sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

void withTimeout(verifyRls(), SCRIPT_DEADLINE_MS, "verify:rls script").catch(
  (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (/timeout|ECONNREFUSED|ENOTFOUND|ECONNRESET|connect/i.test(message)) {
      failFast(
        `verify:rls failed: could not connect or query database within ${SCRIPT_DEADLINE_MS / 1000}s.`,
        message,
      );
    }
    failFast(`verify:rls failed: ${message}`);
  },
);
