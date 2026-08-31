/**
 * Read-only local check: can this machine reach the same Postgres
 * SUPABASE_DB_URL that production uses?
 *
 * Usage: npm run db:ping
 *
 * Does not print URLs, passwords, keys, JWTs, or connection strings.
 * Does not write data or run migrations.
 */

import postgres from "postgres";

function present(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function redact(value: string): string {
  return value
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"'`]+/gi, "[redacted-url]")
    .replace(
      /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
      "[redacted-token]",
    )
    .slice(0, 240);
}

function safeError(error: unknown): string {
  if (error instanceof Error) return redact(error.message);
  if (error != null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return redact(message);
  }
  return "Unknown error";
}

function describePooler(url: string): { port: string; looksLikeTransactionPooler: boolean } {
  try {
    const parsed = new URL(url);
    const port = parsed.port || "default";
    return {
      port,
      looksLikeTransactionPooler: port === "6543",
    };
  } catch {
    return { port: "unparseable", looksLikeTransactionPooler: false };
  }
}

async function main(): Promise<void> {
  console.log("db:ping — read-only connectivity check");
  console.log(
    `  env names set: NEXT_PUBLIC_SUPABASE_URL=${present("NEXT_PUBLIC_SUPABASE_URL")} NEXT_PUBLIC_SUPABASE_ANON_KEY=${present("NEXT_PUBLIC_SUPABASE_ANON_KEY")} SUPABASE_SERVICE_ROLE_KEY=${present("SUPABASE_SERVICE_ROLE_KEY")} SUPABASE_DB_URL=${present("SUPABASE_DB_URL")}`,
  );

  const dbUrl = process.env.SUPABASE_DB_URL?.trim();
  if (!dbUrl) {
    console.error("  FAIL: SUPABASE_DB_URL is not set in .env.local");
    process.exit(1);
  }

  const target = describePooler(dbUrl);
  console.log(
    `  URI port=${target.port} transaction_pooler=${target.looksLikeTransactionPooler} (app client uses prepare: false)`,
  );

  // Same pooler-safe options as src/lib/db/client.ts (server-only; not imported here).
  const sql = postgres(dbUrl, {
    prepare: false,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  try {
    const one = await sql`select 1 as ok`;
    if (one[0]?.ok !== 1) {
      console.error("  FAIL: SELECT 1 did not return 1");
      process.exitCode = 1;
      return;
    }
    console.log("  OK: SELECT 1");

    try {
      const users = await sql`select 1 from public.users limit 1`;
      console.log(
        users.length > 0
          ? "  OK: public.users is readable"
          : "  OK: public.users is readable (table empty)",
      );
    } catch (error) {
      console.error(`  FAIL: public.users query: ${safeError(error)}`);
      process.exitCode = 1;
      return;
    }

    console.log("  PASS: local client can reach this Postgres database");
  } catch (error) {
    console.error(`  FAIL: ${safeError(error)}`);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(`  FAIL: ${safeError(error)}`);
  process.exit(1);
});
