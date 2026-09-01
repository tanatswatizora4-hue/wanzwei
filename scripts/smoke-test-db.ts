/**
 * Live DB smoke tests for core MVP write paths.
 *
 * Usage: npx tsx --env-file=.env.local scripts/smoke-test-db.ts
 */

import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/lib/db/schema";
import {
  assertDangerousScriptAllowed,
  assertNotProductionUnlessAllowed,
  requireScriptEnv,
} from "../src/lib/ops/script-guards";

const SEED_EMAILS = {
  admin: requireScriptEnv("WANZWEI_SMOKE_ADMIN_EMAIL"),
  facility: requireScriptEnv("WANZWEI_SMOKE_FACILITY_EMAIL"),
  professional: requireScriptEnv("WANZWEI_SMOKE_PROFESSIONAL_EMAIL"),
} as const;

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

function ok(message: string): void {
  console.log(`  ✓ ${message}`);
}

function fail(message: string): never {
  console.error(`  ✗ ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  assertDangerousScriptAllowed("smoke:test");
  assertNotProductionUnlessAllowed("smoke:test");
  const sql = postgres(requireEnv("SUPABASE_DB_URL"), {
    prepare: false,
    max: 1,
    connect_timeout: 15,
  });
  const db = drizzle(sql, { schema });

  try {
    console.log("Running DB smoke tests…\n");

    const [admin] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, SEED_EMAILS.admin))
      .limit(1);
    if (!admin || admin.role !== "admin") {
      fail("admin user exists");
    }
    ok(`admin user exists (${admin.email})`);

    const [facilityUser] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, SEED_EMAILS.facility))
      .limit(1);
    if (!facilityUser || facilityUser.role !== "facility" || !facilityUser.facilityId) {
      fail("facility user exists and has facility_id");
    }
    ok(
      `facility user exists with facility_id (${facilityUser.email} → ${facilityUser.facilityId})`,
    );

    const [professional] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, SEED_EMAILS.professional))
      .limit(1);
    if (!professional || professional.role !== "professional") {
      fail("professional user exists");
    }
    ok(`professional user exists (${professional.email})`);

    const testTitle = `Smoke Test Job ${Date.now()}`;
    const [createdJob] = await db
      .insert(schema.jobs)
      .values({
        facilityId: facilityUser.facilityId,
        title: testTitle,
        location: "Harare",
        type: "Locum",
        description: "Automated smoke test job — safe to delete.",
        status: "Open",
      })
      .returning();
    if (!createdJob) {
      fail("facility can create job");
    }
    ok("facility can create job");

    const [application] = await db
      .insert(schema.applications)
      .values({
        jobId: createdJob.id,
        professionalId: professional.id,
        status: "Under Review",
      })
      .returning();
    if (!application) {
      fail("professional can apply");
    }
    ok("professional can apply");

    let duplicateBlocked = false;
    try {
      await db.insert(schema.applications).values({
        jobId: createdJob.id,
        professionalId: professional.id,
        status: "Under Review",
      });
    } catch {
      duplicateBlocked = true;
    }
    if (!duplicateBlocked) {
      fail("duplicate application is blocked");
    }
    ok("duplicate application is blocked");

    const [savedJob] = await db
      .insert(schema.savedJobs)
      .values({
        userId: professional.id,
        jobId: createdJob.id,
      })
      .onConflictDoNothing()
      .returning();
    if (!savedJob) {
      const existing = await db
        .select()
        .from(schema.savedJobs)
        .where(
          and(
            eq(schema.savedJobs.userId, professional.id),
            eq(schema.savedJobs.jobId, createdJob.id),
          ),
        )
        .limit(1);
      if (!existing[0]) {
        fail("professional can save job");
      }
    }
    ok("professional can save job");

    const [updated] = await db
      .update(schema.applications)
      .set({ status: "Shortlisted", updatedAt: new Date() })
      .where(eq(schema.applications.id, application.id))
      .returning();
    if (!updated || updated.status !== "Shortlisted") {
      fail("facility/admin can update application status");
    }
    ok("facility/admin can update application status");

    await db
      .delete(schema.savedJobs)
      .where(
        and(
          eq(schema.savedJobs.userId, professional.id),
          eq(schema.savedJobs.jobId, createdJob.id),
        ),
      );
    await db
      .delete(schema.applications)
      .where(eq(schema.applications.id, application.id));
    await db.delete(schema.jobs).where(eq(schema.jobs.id, createdJob.id));

    console.log("\nAll smoke tests passed.");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
