/**
 * Bootstrap the secret demo master account in Supabase Auth + public.users.
 *
 * Server-side only — never import this from app code. Credentials live here
 * (and in Supabase), not in the client bundle.
 *
 * Usage:
 *   npm run auth:bootstrap
 *
 * Requires .env.local with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 * Uses SUPABASE_DB_URL when set (Drizzle); otherwise upserts via the service-role
 * REST API. The public.users table must exist — run `npm run db:push` first.
 */

import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { users } from "../src/lib/db/schema";
import type { Role } from "../src/lib/types";

const DEMO_EMAIL = "erys@wanzwei.com";
const DEMO_PASSWORD = "12346";
const DEMO_NAME = "Erys";
const DEMO_ROLE: Role = "admin";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env.local (see .env.example).`);
  }
  return value;
}

function getAdminSupabase() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function findAuthUserIdByEmail(
  admin: ReturnType<typeof getAdminSupabase>,
  email: string,
): Promise<string | null> {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new Error(`Failed to list auth users: ${error.message}`);
    }

    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (match) return match.id;

    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

async function setUserRole(
  admin: ReturnType<typeof getAdminSupabase>,
  userId: string,
  role: Role,
): Promise<void> {
  const { data: existing, error: getErr } = await admin.auth.admin.getUserById(
    userId,
  );
  if (getErr || !existing.user) {
    throw new Error(
      `Failed to read user ${userId}: ${getErr?.message ?? "user not found"}`,
    );
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...existing.user.app_metadata, role },
  });
  if (error) {
    throw new Error(`Failed to set role on ${userId}: ${error.message}`);
  }
}

async function ensureAuthUser(
  admin: ReturnType<typeof getAdminSupabase>,
): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: { name: DEMO_NAME },
  });

  if (!error && data.user) {
    await setUserRole(admin, data.user.id, DEMO_ROLE);
    return data.user.id;
  }

  const message = error?.message.toLowerCase() ?? "";
  const alreadyExists =
    message.includes("registered") ||
    message.includes("already") ||
    message.includes("exists");

  if (!alreadyExists) {
    throw new Error(`Failed to create auth user: ${error?.message ?? "unknown"}`);
  }

  const userId = await findAuthUserIdByEmail(admin, DEMO_EMAIL);
  if (!userId) {
    throw new Error(
      `Auth user for ${DEMO_EMAIL} appears to exist but could not be found.`,
    );
  }

  const updatePayload: {
    email_confirm: boolean;
    user_metadata: { name: string };
    password?: string;
  } = {
    email_confirm: true,
    user_metadata: { name: DEMO_NAME },
  };
  // Supabase rejects password updates shorter than 6 chars; createUser may still
  // accept them. Only push a new password when it meets the update policy.
  if (DEMO_PASSWORD.length >= 6) {
    updatePayload.password = DEMO_PASSWORD;
  }

  const { error: updateErr } = await admin.auth.admin.updateUserById(
    userId,
    updatePayload,
  );
  if (updateErr) {
    throw new Error(`Failed to update auth user: ${updateErr.message}`);
  }

  await setUserRole(admin, userId, DEMO_ROLE);
  return userId;
}

function missingUsersTableMessage(): string {
  return (
    "public.users table is missing. Add SUPABASE_DB_URL to .env.local " +
    "(Supabase Dashboard → Project Settings → Database → Connection string), " +
    "then run: npm run db:push && npm run auth:bootstrap"
  );
}

function isMissingUsersTableError(message: string): boolean {
  return (
    message.includes("Could not find the table") ||
    message.includes('relation "users" does not exist')
  );
}

async function ensureAppProfileViaRest(
  admin: ReturnType<typeof getAdminSupabase>,
  authUserId: string,
): Promise<void> {
  const { data: existing, error: readErr } = await admin
    .from("users")
    .select("id")
    .eq("email", DEMO_EMAIL)
    .maybeSingle();

  if (readErr) {
    if (isMissingUsersTableError(readErr.message)) {
      throw new Error(missingUsersTableMessage());
    }
    throw new Error(`Failed to read public.users: ${readErr.message}`);
  }

  if (existing && existing.id !== authUserId) {
    const { error: deleteErr } = await admin
      .from("users")
      .delete()
      .eq("email", DEMO_EMAIL);
    if (deleteErr) {
      throw new Error(
        `Failed to remove mismatched public.users row: ${deleteErr.message}`,
      );
    }
  } else if (existing) {
    const { error } = await admin
      .from("users")
      .update({
        role: DEMO_ROLE,
        name: DEMO_NAME,
        verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authUserId);
    if (error) {
      throw new Error(`Failed to update public.users: ${error.message}`);
    }
    return;
  }

  const { error } = await admin.from("users").insert({
    id: authUserId,
    email: DEMO_EMAIL,
    role: DEMO_ROLE,
    name: DEMO_NAME,
    verified: true,
  });
  if (error) {
    if (isMissingUsersTableError(error.message)) {
      throw new Error(missingUsersTableMessage());
    }
    throw new Error(`Failed to insert public.users row: ${error.message}`);
  }
}

async function ensureAppProfileViaDrizzle(authUserId: string): Promise<void> {
  const sql = postgres(requireEnv("SUPABASE_DB_URL"), {
    prepare: false,
    max: 1,
    idle_timeout: 5,
    connect_timeout: 10,
  });

  try {
    const db = drizzle(sql);
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, DEMO_EMAIL))
      .limit(1);

    if (rows[0] && rows[0].id !== authUserId) {
      await db.delete(users).where(eq(users.email, DEMO_EMAIL));
    } else if (rows[0]) {
      await db
        .update(users)
        .set({
          role: DEMO_ROLE,
          name: DEMO_NAME,
          verified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, authUserId));
      return;
    }

    await db.insert(users).values({
      id: authUserId,
      email: DEMO_EMAIL,
      role: DEMO_ROLE,
      name: DEMO_NAME,
      verified: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (isMissingUsersTableError(message)) {
      throw new Error(missingUsersTableMessage());
    }
    throw err;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function ensureAppProfile(
  admin: ReturnType<typeof getAdminSupabase>,
  authUserId: string,
): Promise<void> {
  const dbUrl = process.env.SUPABASE_DB_URL?.trim();
  if (dbUrl) {
    await ensureAppProfileViaDrizzle(authUserId);
    return;
  }
  await ensureAppProfileViaRest(admin, authUserId);
}

async function main(): Promise<void> {
  const admin = getAdminSupabase();
  const authUserId = await ensureAuthUser(admin);
  await ensureAppProfile(admin, authUserId);

  console.log("Demo master account ready.");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  role:     ${DEMO_ROLE}`);
  console.log(`  auth id:  ${authUserId}`);
  console.log("  login at: /login");
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`auth:bootstrap failed: ${message}`);
  process.exit(1);
});
