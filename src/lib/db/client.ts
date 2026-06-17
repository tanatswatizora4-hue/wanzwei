import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres, { type Sql } from "postgres";

import * as schema from "./schema";

type Schema = typeof schema;
type DrizzleClient = PostgresJsDatabase<Schema>;

declare global {
  var __wanzweiDb: DrizzleClient | undefined;
  var __wanzweiSql: Sql | undefined;
}

function readUrl(): string {
  const url = process.env.SUPABASE_DB_URL?.trim();
  if (!url) {
    throw new Error(
      "SUPABASE_DB_URL is not set. Add it to .env.local (see .env.example).",
    );
  }
  return url;
}

export function hasDbConfig(): boolean {
  return !!process.env.SUPABASE_DB_URL?.trim();
}

function buildClients(): { drizzleClient: DrizzleClient; queryClient: Sql } {
  const queryClient = postgres(readUrl(), {
    // Supabase's connection pooler (PgBouncer in transaction mode) does not
    // support server-side prepared statements; disable to keep it happy.
    prepare: false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  const drizzleClient = drizzle(queryClient, { schema });
  return { queryClient, drizzleClient };
}

function getOrInitClients(): { drizzleClient: DrizzleClient; queryClient: Sql } {
  if (globalThis.__wanzweiDb && globalThis.__wanzweiSql) {
    return {
      drizzleClient: globalThis.__wanzweiDb,
      queryClient: globalThis.__wanzweiSql,
    };
  }
  const built = buildClients();
  globalThis.__wanzweiDb = built.drizzleClient;
  globalThis.__wanzweiSql = built.queryClient;
  return built;
}

/**
 * Lazy Drizzle client. Connects on first use and is cached for the process.
 * Server-only — importing from a client component will throw at build time.
 */
export function getDb(): DrizzleClient {
  return getOrInitClients().drizzleClient;
}

/**
 * Raw postgres-js client for cases where Drizzle's abstraction is in the way
 * (ad-hoc SQL from scripts, RPC calls, etc). Shares the same connection pool
 * as getDb().
 */
export function getSql(): Sql {
  return getOrInitClients().queryClient;
}

export { schema };
