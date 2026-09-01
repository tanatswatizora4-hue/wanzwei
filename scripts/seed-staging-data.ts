/**
 * Seed staging data + align auth app_metadata.role via service role.
 *
 * Usage: npx tsx --env-file=.env.local scripts/seed-staging-data.ts
 */

import { createClient } from "@supabase/supabase-js";
import postgres from "postgres";

import type { Role } from "../src/lib/types";
import {
  assertDangerousScriptAllowed,
  assertNotProductionUnlessAllowed,
  requireScriptEnv,
} from "../src/lib/ops/script-guards";

const FACILITIES = [
  {
    id: "6ec626d4-c2dc-44ca-bcd1-a627fb2ad011",
    name: "Parirenyatwa Group of Hospitals",
    type: "Hospital",
    location: "Harare",
    verified: true,
    initials: "PG",
  },
  {
    id: "3ee72fba-a763-4d5d-aa19-324829a9d13c",
    name: "Cure Hospital",
    type: "Hospital",
    location: "Harare",
    verified: false,
    initials: "CH",
  },
  {
    id: "3d3c8143-a334-4efa-bee2-8971ed9f17b5",
    name: "Msasa Clinic",
    type: "Clinic",
    location: "Harare",
    verified: false,
    initials: "MC",
  },
] as const;

type SeedAppUser = {
  id: string;
  email: string;
  role: Role;
  name: string;
  facilityId: string | null;
  profession: string | null;
};

function loadSeedUsers(): SeedAppUser[] {
  return [
    {
      id: "5882ff01-392a-46b1-ab1c-97d55d9af598",
      email: requireScriptEnv("WANZWEI_SEED_ADMIN_EMAIL"),
      role: "admin",
      name: "Seed Admin",
      facilityId: null,
      profession: null,
    },
    {
      id: "e079dfc5-34cf-4dc2-978d-0bc238600a54",
      email: requireScriptEnv("WANZWEI_SEED_FACILITY_A_EMAIL"),
      role: "facility",
      name: "Seed Facility A",
      facilityId: "3ee72fba-a763-4d5d-aa19-324829a9d13c",
      profession: null,
    },
    {
      id: "f106a844-ca27-4566-b857-f76081985fe3",
      email: requireScriptEnv("WANZWEI_SEED_FACILITY_B_EMAIL"),
      role: "facility",
      name: "Seed Facility B",
      facilityId: "6ec626d4-c2dc-44ca-bcd1-a627fb2ad011",
      profession: null,
    },
    {
      id: "aee70f88-fe32-4d7b-9b47-f735684cd3e7",
      email: requireScriptEnv("WANZWEI_SEED_FACILITY_C_EMAIL"),
      role: "facility",
      name: "Seed Facility C",
      facilityId: "3d3c8143-a334-4efa-bee2-8971ed9f17b5",
      profession: null,
    },
    {
      id: "ffc05453-7bf4-4b8c-a242-b443a6d90896",
      email: requireScriptEnv("WANZWEI_SEED_PROFESSIONAL_EMAIL"),
      role: "professional",
      name: "Seed Professional",
      facilityId: null,
      profession: "Registered Nurse",
    },
  ];
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

function getAdminSupabase() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function setAuthRole(
  admin: ReturnType<typeof getAdminSupabase>,
  userId: string,
  role: Role,
): Promise<void> {
  const { data: existing, error: getErr } =
    await admin.auth.admin.getUserById(userId);
  if (getErr || !existing.user) {
    throw new Error(
      `Auth user ${userId} not found: ${getErr?.message ?? "missing"}`,
    );
  }
  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { ...existing.user.app_metadata, role },
  });
  if (error) {
    throw new Error(`Failed to set app_metadata.role for ${userId}: ${error.message}`);
  }
}

async function seedDatabase(
  sql: postgres.Sql,
  seedUsers: SeedAppUser[],
): Promise<void> {
  for (const f of FACILITIES) {
    await sql`
      INSERT INTO public.facilities (id, name, type, location, verified, initials)
      VALUES (${f.id}, ${f.name}, ${f.type}::facility_type, ${f.location}, ${f.verified}, ${f.initials})
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        location = EXCLUDED.location,
        verified = EXCLUDED.verified,
        initials = EXCLUDED.initials,
        updated_at = now()
    `;
  }
  console.log(`  ✓ ${FACILITIES.length} facilities`);

  for (const u of seedUsers) {
    await sql`
      INSERT INTO public.users (id, email, role, name, facility_id, profession, verified)
      VALUES (
        ${u.id},
        ${u.email},
        ${u.role}::role,
        ${u.name},
        ${u.facilityId},
        ${u.profession},
        ${u.role === "admin"}
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        name = EXCLUDED.name,
        facility_id = EXCLUDED.facility_id,
        profession = EXCLUDED.profession,
        verified = EXCLUDED.verified,
        updated_at = now()
    `;
  }
  console.log(`  ✓ ${seedUsers.length} users`);

  await sql`DELETE FROM public.jobs`;

  const jobs = [
    {
      facilityId: FACILITIES[0].id,
      title: "Registered Nurse — ICU",
      location: "Harare",
      type: "Locum",
      salary: "USD 25/hr",
      description: "ICU locum cover for weekend shifts.",
      tags: ["ICU", "Critical Care"],
    },
    {
      facilityId: FACILITIES[1].id,
      title: "Clinical Officer",
      location: "Harare",
      type: "Contract",
      salary: "USD 2,500/mo",
      description: "Outpatient clinic support.",
      tags: ["OPD"],
    },
    {
      facilityId: FACILITIES[2].id,
      title: "Pharmacist",
      location: "Harare",
      type: "Part-time",
      salary: "USD 18/hr",
      description: "Dispensing and stock management.",
      tags: ["Pharmacy"],
    },
    {
      facilityId: FACILITIES[0].id,
      title: "Midwife — Maternity",
      location: "Harare",
      type: "Permanent",
      salary: "USD 1,800/mo",
      description: "Maternity ward permanent post.",
      tags: ["Maternity"],
    },
  ] as const;

  for (const job of jobs) {
    await sql`
      INSERT INTO public.jobs (
        facility_id, title, location, type, salary, description, tags, status
      ) VALUES (
        ${job.facilityId},
        ${job.title},
        ${job.location},
        ${job.type}::employment_type,
        ${job.salary},
        ${job.description},
        ${sql.array([...job.tags])},
        'Open'::job_status
      )
    `;
  }
  console.log(`  ✓ ${jobs.length} jobs`);

  await sql`DELETE FROM public.courses`;
  const courses = [
    {
      title: "BLS Renewal 2026",
      provider: "Resuscitation Council",
      category: "Clinical",
      duration: "4 hours",
      credits: 4,
      cover: "/covers/bls.jpg",
      recommended: true,
    },
    {
      title: "IPC Fundamentals",
      provider: "MOHCC",
      category: "Compliance",
      duration: "2 hours",
      credits: 2,
      cover: "/covers/ipc.jpg",
      recommended: true,
    },
    {
      title: "Clinical Leadership",
      provider: "Wanzwei Academy",
      category: "Leadership",
      duration: "6 hours",
      credits: 6,
      cover: "/covers/leadership.jpg",
      recommended: false,
    },
  ] as const;

  for (const c of courses) {
    await sql`
      INSERT INTO public.courses (
        title, provider, category, duration, credits, cover, recommended
      ) VALUES (
        ${c.title},
        ${c.provider},
        ${c.category}::course_category,
        ${c.duration},
        ${c.credits},
        ${c.cover},
        ${c.recommended}
      )
    `;
  }
  console.log(`  ✓ ${courses.length} courses`);

  await sql`DELETE FROM public.listings`;
  const listings = [
    {
      title: "Harare Central Pharmacy",
      kind: "Pharmacy",
      mode: "Sale",
      location: "Harare CBD",
      price: 85000,
      currency: "USD",
      cover: "/covers/pharmacy.jpg",
      description: "Established retail pharmacy in the CBD.",
    },
    {
      title: "Suburban Clinic Space",
      kind: "Clinic",
      mode: "Lease",
      location: "Borrowdale",
      price: 1200,
      currency: "USD",
      cover: "/covers/clinic.jpg",
      description: "Turn-key consulting rooms available to lease.",
    },
    {
      title: "Diagnostic Laboratory",
      kind: "Laboratory",
      mode: "Sale",
      location: "Bulawayo",
      price: 150000,
      currency: "USD",
      cover: "/covers/lab.jpg",
      description: "Fully equipped pathology laboratory.",
    },
  ] as const;

  for (const l of listings) {
    await sql`
      INSERT INTO public.listings (
        title, kind, mode, location, price, currency, cover, description
      ) VALUES (
        ${l.title},
        ${l.kind}::listing_kind,
        ${l.mode}::listing_mode,
        ${l.location},
        ${l.price},
        ${l.currency},
        ${l.cover},
        ${l.description}
      )
    `;
  }
  console.log(`  ✓ ${listings.length} listings`);
}

async function verify(
  sql: postgres.Sql,
  admin: ReturnType<typeof getAdminSupabase>,
): Promise<void> {
  console.log("\n=== Verification ===");

  const adminEmail = requireScriptEnv("WANZWEI_SEED_ADMIN_EMAIL");
  const adminPassword = requireScriptEnv("WANZWEI_SEED_ADMIN_PASSWORD");

  const adminRow = await sql<
    { id: string; email: string; role: string }[]
  >`SELECT id, email, role::text FROM public.users WHERE email = ${adminEmail}`;

  const facilityRow = await sql<
    { email: string; facility_id: string | null }[]
  >`SELECT email, facility_id::text FROM public.users WHERE role = 'facility' AND facility_id IS NOT NULL LIMIT 1`;

  const proRow = await sql<
    { email: string; profession: string | null }[]
  >`SELECT email, profession FROM public.users WHERE role = 'professional' LIMIT 1`;

  const jobLinks = await sql<
    { total: number; linked: number }[]
  >`
    SELECT
      count(*)::int AS total,
      count(facility_id)::int AS linked
    FROM public.jobs
  `;

  const courseCount = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM public.courses
  `;
  const listingCount = await sql<{ count: number }[]>`
    SELECT count(*)::int AS count FROM public.listings
  `;

  const anon = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: loginData, error: loginError } =
    await anon.auth.signInWithPassword({
      email: adminEmail,
      password: adminPassword,
    });

  const authMeta = loginData.user
    ? (
        await admin.auth.admin.getUserById(loginData.user.id)
      ).data.user?.app_metadata
    : null;

  const checks = [
    {
      label: "Admin public.users row exists",
      ok: adminRow.length === 1,
      detail: adminRow[0]?.email,
    },
    {
      label: "Admin public.users.id matches auth.users.id",
      ok: adminRow[0]?.id === loginData.user?.id,
      detail: `${adminRow[0]?.id} = ${loginData.user?.id}`,
    },
    {
      label: "Admin can sign in (auth)",
      ok: !loginError && !!loginData.user,
      detail: loginError?.message ?? "ok",
    },
    {
      label: "Admin app_metadata.role = admin",
      ok: authMeta?.role === "admin",
      detail: String(authMeta?.role),
    },
    {
      label: "Facility user has facility_id",
      ok: !!facilityRow[0]?.facility_id,
      detail: `${facilityRow[0]?.email} → ${facilityRow[0]?.facility_id}`,
    },
    {
      label: "Professional user has profession",
      ok: !!proRow[0]?.profession,
      detail: `${proRow[0]?.email} → ${proRow[0]?.profession}`,
    },
    {
      label: "All jobs linked to facilities",
      ok:
        jobLinks[0].total > 0 && jobLinks[0].total === jobLinks[0].linked,
      detail: `${jobLinks[0].linked}/${jobLinks[0].total} linked`,
    },
    {
      label: "Courses exist",
      ok: (courseCount[0]?.count ?? 0) >= 3,
      detail: String(courseCount[0]?.count),
    },
    {
      label: "Listings exist",
      ok: (listingCount[0]?.count ?? 0) >= 3,
      detail: String(listingCount[0]?.count),
    },
  ];

  for (const c of checks) {
    console.log(`${c.ok ? "✓" : "✗"} ${c.label}: ${c.detail}`);
  }

  const failed = checks.filter((c) => !c.ok);
  if (failed.length > 0) {
    throw new Error(`${failed.length} verification check(s) failed.`);
  }
}

async function main(): Promise<void> {
  assertDangerousScriptAllowed("db:seed");
  assertNotProductionUnlessAllowed("db:seed");
  const seedUsers = loadSeedUsers();
  const admin = getAdminSupabase();
  const sql = postgres(requireEnv("SUPABASE_DB_URL"), {
    prepare: false,
    max: 1,
  });

  try {
    console.log("Setting app_metadata.role via service role…");
    for (const u of seedUsers) {
      await setAuthRole(admin, u.id, u.role);
      console.log(`  ✓ ${u.email} → ${u.role}`);
    }

    console.log("\nSeeding database…");
    await seedDatabase(sql, seedUsers);

    await verify(sql, admin);
    console.log("\nSeed complete — all checks passed.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
