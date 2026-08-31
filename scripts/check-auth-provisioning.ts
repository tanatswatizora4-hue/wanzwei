/**
 * Read-only local diagnostic for the post-auth Google provisioning path.
 *
 * Usage: npm run auth:diagnose
 *
 * Does not authenticate, create users, write public.users, or mutate
 * app_metadata. Does not print secrets, tokens, URLs, or keys.
 */

import type { User as AuthUser } from "@supabase/supabase-js";

const APP_ROLES = new Set(["professional", "facility", "admin"]);
const DETAIL_CAP = 25;

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
    .replace(/\b(sb_secret_[A-Za-z0-9]+|service_role)\b/gi, "[redacted]")
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

function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0) return "[redacted-email]";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).toLowerCase();
  const shown = local.slice(0, 1);
  return `${shown}***@${domain}`;
}

function normalizeEmail(email: string | null | undefined): string | null {
  const trimmed = email?.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
}

function jwtRole(appMetadata: unknown): string | null {
  const candidate = (appMetadata as { role?: unknown } | undefined)?.role;
  if (typeof candidate === "string" && APP_ROLES.has(candidate)) {
    return candidate;
  }
  return null;
}

function identityProviders(user: AuthUser): string[] {
  const providers = new Set<string>();
  for (const identity of user.identities ?? []) {
    if (identity.provider) providers.add(identity.provider);
  }
  const fromMeta = (user.app_metadata as { provider?: unknown } | undefined)
    ?.provider;
  if (typeof fromMeta === "string" && fromMeta) providers.add(fromMeta);
  return [...providers].sort();
}

function line(key: string, value: string | number | boolean): void {
  console.log(`${key}=${value}`);
}

function printDetails(
  title: string,
  rows: string[],
): void {
  if (rows.length === 0) return;
  console.log(`--- ${title} (showing ${Math.min(rows.length, DETAIL_CAP)} of ${rows.length}) ---`);
  for (const row of rows.slice(0, DETAIL_CAP)) {
    console.log(row);
  }
}

type ProfileRow = { id: string; email: string; role: string };

async function listAllAuthUsers(
  listUsers: (args: {
    page: number;
    perPage: number;
  }) => Promise<{ data: { users: AuthUser[] }; error: { message: string } | null }>,
): Promise<AuthUser[]> {
  const out: AuthUser[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const batch = data.users ?? [];
    out.push(...batch);
    if (batch.length < 200) break;
  }
  return out;
}

async function main(): Promise<void> {
  console.log("auth:diagnose — read-only post-auth provisioning inspection");
  line("HAS_NEXT_PUBLIC_SUPABASE_URL", present("NEXT_PUBLIC_SUPABASE_URL"));
  line("HAS_NEXT_PUBLIC_SUPABASE_ANON_KEY", present("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  line("HAS_SUPABASE_SERVICE_ROLE_KEY", present("SUPABASE_SERVICE_ROLE_KEY"));
  line("HAS_SUPABASE_DB_URL", present("SUPABASE_DB_URL"));

  let dbRepositoryOk = false;
  let adminAuthReadOk = false;
  let profiles: ProfileRow[] = [];
  let authUsers: AuthUser[] = [];
  let findByEmailOk = false;
  let findByIdOk = false;

  try {
    const { getSql } = await import("../src/lib/db/client");
    const { findUserByEmail, findUserById } = await import("../src/lib/repos/users");
    const sql = getSql();

    try {
      const raw = await sql<ProfileRow[]>`
        select id::text as id, email, role::text as role
        from public.users
      `;
      profiles = raw.map((row) => ({
        id: row.id,
        email: row.email,
        role: row.role,
      }));

      const probeEmail = profiles[0]?.email ?? "auth-diagnose-missing@invalid.example";
      const byEmail = await findUserByEmail(probeEmail);
      findByEmailOk =
        profiles.length === 0
          ? byEmail === null
          : byEmail?.email === probeEmail;

      const probeId = profiles[0]?.id ?? "00000000-0000-4000-8000-000000000000";
      const byId = await findUserById(probeId);
      findByIdOk =
        profiles.length === 0
          ? byId === null
          : byId?.id === probeId;

      dbRepositoryOk = findByEmailOk && findByIdOk;
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (error) {
    console.error(`DB_REPOSITORY_ERROR=${safeError(error)}`);
  }

  line("DB_REPOSITORY_OK", dbRepositoryOk);
  line("FIND_USER_BY_EMAIL_OK", findByEmailOk);
  line("FIND_USER_BY_ID_OK", findByIdOk);

  try {
    const { getAdminSupabase } = await import("../src/lib/supabase/admin");
    const admin = getAdminSupabase();
    authUsers = await listAllAuthUsers((args) => admin.auth.admin.listUsers(args));
    if (authUsers[0]?.id) {
      const { data, error } = await admin.auth.admin.getUserById(authUsers[0].id);
      if (error || !data.user) {
        throw new Error(error?.message ?? "getUserById returned no user");
      }
    }
    adminAuthReadOk = true;
  } catch (error) {
    console.error(`ADMIN_AUTH_READ_ERROR=${safeError(error)}`);
  }

  line("ADMIN_AUTH_READ_OK", adminAuthReadOk);
  line("AUTH_USERS_COUNT", authUsers.length);
  line("PUBLIC_USERS_COUNT", profiles.length);

  const profilesByEmail = new Map<string, ProfileRow[]>();
  const profilesById = new Map<string, ProfileRow>();
  for (const profile of profiles) {
    const key = normalizeEmail(profile.email);
    if (key) {
      const list = profilesByEmail.get(key) ?? [];
      list.push(profile);
      profilesByEmail.set(key, list);
    }
    profilesById.set(profile.id, profile);
  }

  const authByEmail = new Map<string, AuthUser[]>();
  const authById = new Map<string, AuthUser>();
  for (const user of authUsers) {
    authById.set(user.id, user);
    const key = normalizeEmail(user.email);
    if (key) {
      const list = authByEmail.get(key) ?? [];
      list.push(user);
      authByEmail.set(key, list);
    }
  }

  const matched: Array<{
    email: string;
    authId: string;
    profileId: string;
    dbRole: string;
    jwtRole: string | null;
    providers: string[];
  }> = [];
  const emailUuidMismatches: typeof matched = [];
  const authWithoutProfile: Array<{
    email: string;
    authId: string;
    jwtRole: string | null;
    providers: string[];
  }> = [];
  const profileWithoutAuth: Array<{
    email: string;
    profileId: string;
    dbRole: string;
  }> = [];
  const caseMismatches: typeof matched = [];
  const invalidRoles: Array<{ email: string; profileId: string; role: string }> = [];

  for (const profile of profiles) {
    if (!APP_ROLES.has(profile.role)) {
      invalidRoles.push({
        email: profile.email,
        profileId: profile.id,
        role: profile.role,
      });
    }
  }

  for (const user of authUsers) {
    const emailKey = normalizeEmail(user.email);
    const profileById = profilesById.get(user.id);
    const profilesForEmail = emailKey ? profilesByEmail.get(emailKey) ?? [] : [];
    const exactEmailProfile = profilesForEmail.find(
      (row) => row.email === (user.email ?? "").trim(),
    );
    if (
      exactEmailProfile === undefined &&
      profilesForEmail.some((row) => row.email !== (user.email ?? "").trim())
    ) {
      const other = profilesForEmail[0];
      if (other) {
        caseMismatches.push({
          email: user.email ?? other.email,
          authId: user.id,
          profileId: other.id,
          dbRole: other.role,
          jwtRole: jwtRole(user.app_metadata),
          providers: identityProviders(user),
        });
      }
    }

    if (profileById && emailKey && normalizeEmail(profileById.email) === emailKey) {
      matched.push({
        email: user.email ?? profileById.email,
        authId: user.id,
        profileId: profileById.id,
        dbRole: profileById.role,
        jwtRole: jwtRole(user.app_metadata),
        providers: identityProviders(user),
      });
      continue;
    }

    const emailHit = profilesForEmail[0];
    if (emailHit && emailHit.id !== user.id) {
      emailUuidMismatches.push({
        email: user.email ?? emailHit.email,
        authId: user.id,
        profileId: emailHit.id,
        dbRole: emailHit.role,
        jwtRole: jwtRole(user.app_metadata),
        providers: identityProviders(user),
      });
      continue;
    }

    if (!profileById) {
      authWithoutProfile.push({
        email: user.email ?? "",
        authId: user.id,
        jwtRole: jwtRole(user.app_metadata),
        providers: identityProviders(user),
      });
    }
  }

  for (const profile of profiles) {
    if (authById.has(profile.id)) continue;
    const emailKey = normalizeEmail(profile.email);
    const authHits = emailKey ? authByEmail.get(emailKey) ?? [] : [];
    if (authHits.some((user) => user.id !== profile.id)) {
      continue;
    }
    profileWithoutAuth.push({
      email: profile.email,
      profileId: profile.id,
      dbRole: profile.role,
    });
  }

  const persistNeeded = matched.filter((row) => row.jwtRole !== row.dbRole);
  const persistNotNeeded = matched.filter((row) => row.jwtRole === row.dbRole);
  const googleAuth = authUsers.filter((user) =>
    identityProviders(user).includes("google"),
  );
  const googleWithoutProfile = authWithoutProfile.filter((row) =>
    row.providers.includes("google"),
  );
  const googleEmailMismatch = emailUuidMismatches.filter((row) =>
    row.providers.includes("google"),
  );
  const googlePersistNeeded = persistNeeded.filter((row) =>
    row.providers.includes("google"),
  );

  line("MATCHED_UUID_EMAIL_COUNT", matched.length);
  line("AUTH_WITHOUT_PROFILE_COUNT", authWithoutProfile.length);
  line("PROFILE_WITHOUT_AUTH_COUNT", profileWithoutAuth.length);
  line("EMAIL_UUID_MISMATCH_COUNT", emailUuidMismatches.length);
  line("EMAIL_CASE_MISMATCH_COUNT", caseMismatches.length);
  line("INVALID_ROLE_COUNT", invalidRoles.length);
  line("GOOGLE_AUTH_USERS_COUNT", googleAuth.length);
  line("GOOGLE_WITHOUT_PROFILE_COUNT", googleWithoutProfile.length);
  line("GOOGLE_EMAIL_UUID_MISMATCH_COUNT", googleEmailMismatch.length);
  line("EXISTING_MATCH_WOULD_PERSIST_ROLE_COUNT", persistNeeded.length);
  line("EXISTING_MATCH_NO_WRITE_COUNT", persistNotNeeded.length);
  line("MISSING_APP_METADATA_ROLE_ON_MATCH_COUNT", persistNeeded.filter((row) => row.jwtRole === null).length);
  line("GOOGLE_EXISTING_MATCH_WOULD_PERSIST_ROLE_COUNT", googlePersistNeeded.length);

  console.log("--- predicted completeLoginAfterAuth branches (not executed) ---");
  line(
    "WOULD_FAIL_EMAIL_TAKEN",
    emailUuidMismatches.length > 0,
  );
  line(
    "WOULD_CREATE_PROFILE",
    authWithoutProfile.length > 0,
  );
  line(
    "WOULD_PERSIST_THEN_REFRESH",
    persistNeeded.length > 0 || googleWithoutProfile.length > 0,
  );
  line(
    "WOULD_SUCCEED_WITHOUT_WRITE",
    persistNotNeeded.length > 0 && emailUuidMismatches.length === 0,
  );

  printDetails(
    "EMAIL_UUID_MISMATCH",
    emailUuidMismatches.map(
      (row) =>
        `email=${maskEmail(row.email)} auth_id=${row.authId} public_users_id=${row.profileId} db_role=${row.dbRole} jwt_role=${row.jwtRole ?? "null"} providers=${row.providers.join(",") || "none"} predicted=email_taken`,
    ),
  );
  printDetails(
    "AUTH_WITHOUT_PROFILE",
    authWithoutProfile.map(
      (row) =>
        `email=${maskEmail(row.email)} auth_id=${row.authId} jwt_role=${row.jwtRole ?? "null"} providers=${row.providers.join(",") || "none"} predicted=persist_professional_then_create_profile`,
    ),
  );
  printDetails(
    "PROFILE_WITHOUT_AUTH",
    profileWithoutAuth.map(
      (row) =>
        `email=${maskEmail(row.email)} public_users_id=${row.profileId} db_role=${row.dbRole}`,
    ),
  );
  printDetails(
    "EXISTING_MATCH_WOULD_PERSIST_ROLE",
    persistNeeded.map(
      (row) =>
        `email=${maskEmail(row.email)} auth_id=${row.authId} public_users_id=${row.profileId} db_role=${row.dbRole} jwt_role=${row.jwtRole ?? "null"} providers=${row.providers.join(",") || "none"} predicted=persist_db_role_then_refreshSession`,
    ),
  );
  printDetails(
    "INVALID_ROLE",
    invalidRoles.map(
      (row) =>
        `email=${maskEmail(row.email)} public_users_id=${row.profileId} role=${row.role}`,
    ),
  );
  printDetails(
    "EMAIL_CASE_MISMATCH",
    caseMismatches.map(
      (row) =>
        `email=${maskEmail(row.email)} auth_id=${row.authId} public_users_id=${row.profileId} db_role=${row.dbRole} jwt_role=${row.jwtRole ?? "null"} predicted=profile_lookup_miss_then_create_or_email_taken`,
    ),
  );

  console.log("--- notes ---");
  console.log(
    "OAuth callback maps any completeLoginAfterAuth failure to /login?error=profile_missing.",
  );
  console.log(
    "persistAppRole writes app_metadata then refreshSession(); this script does not execute those writes.",
  );
  console.log(
    "ensureAppUserProfile createUser is not executed. First Google login with no public.users row would take that branch.",
  );
}

main().catch((error) => {
  console.error(`FAIL=${safeError(error)}`);
  process.exit(1);
});
