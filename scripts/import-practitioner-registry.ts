/**
 * Import the HPA Persons Register into public.practitioner_registry.
 *
 * Usage:
 *   npm run registry:import -- --dry-run
 *   npm run registry:import
 *
 * Loads `.env.local` when present (needed for the real import).
 * Dry-run does not require database credentials.
 * Default source:
 *   C:\Users\dell\Downloads\registers\Persons Register.xlsx
 * Override with --file or HPA_PERSONS_REGISTER_PATH.
 *
 * Dry-run validates and reports; it does not connect to Supabase.
 * The real import requires SUPABASE_DB_URL and migration 0006.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import postgres from "postgres";
import * as XLSX from "xlsx";

import {
  HPA_REGISTERING_BODY,
  PERSONS_REGISTER_SOURCE_FILE,
  missingPersonsRegisterColumns,
  parsePersonsRegisterRows,
  type ParsedPractitionerRecord,
  type PersonsRegisterParseResult,
} from "../src/lib/registry/persons-register";

const DEFAULT_SOURCE_PATH =
  "C:\\Users\\dell\\Downloads\\registers\\Persons Register.xlsx";

function loadDotEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}

type ImportCounts = {
  inserted: number;
  updated: number;
};

function parseArgs(argv: string[]): { dryRun: boolean; filePath: string } {
  const dryRun = argv.includes("--dry-run");
  const fileFlag = argv.indexOf("--file");
  const fileFromFlag =
    fileFlag >= 0 && argv[fileFlag + 1] && !argv[fileFlag + 1]!.startsWith("-")
      ? argv[fileFlag + 1]
      : undefined;
  const filePath =
    fileFromFlag?.trim() ||
    process.env.HPA_PERSONS_REGISTER_PATH?.trim() ||
    DEFAULT_SOURCE_PATH;
  return { dryRun, filePath };
}

function readWorkbookRows(filePath: string): Record<string, unknown>[] {
  if (!existsSync(filePath)) {
    throw new Error(`Registry file not found: ${filePath}`);
  }

  const basename = path.basename(filePath);
  if (basename.toLowerCase() !== PERSONS_REGISTER_SOURCE_FILE.toLowerCase()) {
    throw new Error(
      `Refusing to import ${basename}. This importer only accepts ${PERSONS_REGISTER_SOURCE_FILE}.`,
    );
  }

  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Workbook has no sheets.");
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Missing sheet: ${sheetName}`);
  }

  const headerRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  const headers = (headerRows[0] ?? []).map((value) => String(value).trim());
  const missing = missingPersonsRegisterColumns(headers);
  if (missing.length > 0) {
    throw new Error(
      `Workbook is not the HPA Persons Register. Missing columns: ${missing.join(", ")}. Found: ${headers.join(", ") || "(none)"}`,
    );
  }

  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
    blankrows: false,
  });
}

function printStats(result: PersonsRegisterParseResult): void {
  const { stats } = result;
  console.log("HPA Persons Register validation");
  console.log(`  total rows:        ${stats.totalRows}`);
  console.log(`  valid rows:        ${stats.validRows}`);
  console.log(`  invalid rows:      ${stats.invalidRows}`);
  console.log(`  active:            ${stats.active}`);
  console.log(`  expired:           ${stats.expired}`);
  console.log(`  placeholders:      ${stats.placeholders}`);
  console.log(`  missing address:   ${stats.missingAddress}`);
  console.log(`  missing town:      ${stats.missingTown}`);
  console.log("  qualifications:");
  for (const [qualification, count] of Object.entries(
    stats.qualificationCounts,
  ).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${qualification}: ${count}`);
  }
  console.log(
    `  duplicate non-placeholder numbers: ${stats.duplicateNonPlaceholderNumbers.length}`,
  );
  for (const duplicate of stats.duplicateNonPlaceholderNumbers) {
    console.log(
      `    ${duplicate.registrationNumberNormalized} rows ${duplicate.excelRowNumbers.join(", ")}`,
    );
  }
}

function printIssues(result: PersonsRegisterParseResult): void {
  if (result.issues.length === 0) return;
  console.error(`\n${result.issues.length} validation issue(s):`);
  for (const issue of result.issues.slice(0, 50)) {
    console.error(
      `  row ${issue.excelRowNumber} [${issue.field}]: ${issue.message}`,
    );
  }
  if (result.issues.length > 50) {
    console.error(`  … ${result.issues.length - 50} more`);
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not set. Add it to .env.local.`);
  }
  return value;
}

function projectRefFromConfiguredUrl(primary: string): string | null {
  try {
    const host = new URL(primary).hostname.toLowerCase();
    const direct = host.match(/^db\.([^.]+)\.supabase\.co$/i)?.[1];
    if (direct) return direct;
  } catch {
    // ignore
  }
  const api = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!api) return null;
  try {
    const apiHost = new URL(api).hostname.toLowerCase();
    return apiHost.match(/^([^.]+)\.supabase\.co$/i)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Direct db.*.supabase.co is IPv6-only; fall back to the IPv4 session pooler. */
function candidateDbUrls(primary: string): string[] {
  const out: string[] = [primary];
  try {
    const parsed = new URL(primary);
    const password = decodeURIComponent(parsed.password || "");
    const passwords = [password];
    if (password.startsWith("[") && password.endsWith("]") && password.length > 2) {
      passwords.push(password.slice(1, -1));
    }
    const projectRef = projectRefFromConfiguredUrl(primary);
    const poolerHosts = [
      "aws-0-eu-west-1.pooler.supabase.com",
      "aws-1-eu-west-1.pooler.supabase.com",
      "aws-0-eu-central-1.pooler.supabase.com",
    ];
    for (const pwd of passwords) {
      const encoded = encodeURIComponent(pwd);
      const userEncoded = encodeURIComponent(parsed.username || "postgres");
      const pathAndDb = parsed.pathname || "/postgres";
      out.push(
        `postgresql://${userEncoded}:${encoded}@${parsed.hostname}:${parsed.port || "5432"}${pathAndDb}`,
      );
      if (projectRef) {
        const poolUser = encodeURIComponent(`postgres.${projectRef}`);
        for (const host of poolerHosts) {
          out.push(`postgresql://${poolUser}:${encoded}@${host}:5432/postgres`);
          out.push(`postgresql://${poolUser}:${encoded}@${host}:6543/postgres`);
        }
      }
    }
  } catch {
    // keep the configured URL only
  }
  return [...new Set(out)];
}

async function connectDb(primary: string): Promise<postgres.Sql> {
  let lastError: unknown;
  for (const url of candidateDbUrls(primary)) {
    for (const ssl of [true, { rejectUnauthorized: false }] as const) {
      const sql = postgres(url, {
        prepare: false,
        max: 1,
        connect_timeout: 8,
        ssl,
      });
      try {
        await sql`select 1 as ok`;
        return sql;
      } catch (error) {
        lastError = error;
        await sql.end({ timeout: 1 }).catch(() => undefined);
      }
    }
  }
  const code =
    lastError && typeof lastError === "object" && "code" in lastError
      ? String((lastError as { code?: unknown }).code)
      : "connect_failed";
  throw new Error(`Database connection failed (${code}).`);
}

async function assertRegistryTable(sql: postgres.Sql): Promise<void> {
  const rows = await sql<{ exists: boolean }[]>`
    select exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'practitioner_registry'
    ) as exists
  `;
  if (!rows[0]?.exists) {
    throw new Error(
      "public.practitioner_registry does not exist. Apply supabase/migrations/0006_practitioner_registry.sql before importing.",
    );
  }
}

async function upsertNonPlaceholder(
  sql: postgres.TransactionSql,
  record: ParsedPractitionerRecord,
  importedAt: Date,
): Promise<"inserted" | "updated"> {
  const rows = await sql<{ inserted: boolean }[]>`
    insert into public.practitioner_registry (
      registering_body,
      registration_number,
      registration_number_normalized,
      licence_class,
      licence_serial,
      licence_year,
      full_name,
      full_name_normalized,
      qualification,
      qualification_normalized,
      address,
      town,
      expiry_date,
      derived_status,
      is_placeholder,
      source_file,
      source_imported_at,
      source_row
    ) values (
      ${HPA_REGISTERING_BODY},
      ${record.registrationNumber},
      ${record.registrationNumberNormalized},
      ${record.licenceClass},
      ${record.licenceSerial},
      ${record.licenceYear},
      ${record.fullName},
      ${record.fullNameNormalized},
      ${record.qualification},
      ${record.qualificationNormalized},
      ${record.address},
      ${record.town},
      ${record.expiryDate}::date,
      ${record.derivedStatus},
      false,
      ${record.sourceFile},
      ${importedAt},
      ${sql.json(record.sourceRow)}
    )
    on conflict (registering_body, registration_number_normalized)
    where is_placeholder = false
    do update set
      registration_number = excluded.registration_number,
      licence_class = excluded.licence_class,
      licence_serial = excluded.licence_serial,
      licence_year = excluded.licence_year,
      full_name = excluded.full_name,
      full_name_normalized = excluded.full_name_normalized,
      qualification = excluded.qualification,
      qualification_normalized = excluded.qualification_normalized,
      address = excluded.address,
      town = excluded.town,
      expiry_date = excluded.expiry_date,
      derived_status = excluded.derived_status,
      source_file = excluded.source_file,
      source_imported_at = excluded.source_imported_at,
      source_row = excluded.source_row,
      updated_at = now()
    returning (xmax = 0) as inserted
  `;
  return rows[0]?.inserted ? "inserted" : "updated";
}

async function upsertPlaceholder(
  sql: postgres.TransactionSql,
  record: ParsedPractitionerRecord,
  importedAt: Date,
): Promise<"inserted" | "updated"> {
  const updated = await sql<{ id: string }[]>`
    update public.practitioner_registry
    set
      registration_number = ${record.registrationNumber},
      licence_class = ${record.licenceClass},
      licence_serial = ${record.licenceSerial},
      licence_year = ${record.licenceYear},
      full_name = ${record.fullName},
      qualification = ${record.qualification},
      qualification_normalized = ${record.qualificationNormalized},
      address = ${record.address},
      town = ${record.town},
      expiry_date = ${record.expiryDate}::date,
      derived_status = ${record.derivedStatus},
      source_file = ${record.sourceFile},
      source_imported_at = ${importedAt},
      source_row = ${sql.json(record.sourceRow)},
      updated_at = now()
    where registering_body = ${HPA_REGISTERING_BODY}
      and registration_number_normalized = ${record.registrationNumberNormalized}
      and full_name_normalized = ${record.fullNameNormalized}
      and is_placeholder = true
    returning id
  `;
  if (updated.length > 1) {
    throw new Error(
      "Placeholder update matched multiple rows; aborting to avoid merging distinct people.",
    );
  }
  if (updated.length === 1) return "updated";

  await sql`
    insert into public.practitioner_registry (
      registering_body,
      registration_number,
      registration_number_normalized,
      licence_class,
      licence_serial,
      licence_year,
      full_name,
      full_name_normalized,
      qualification,
      qualification_normalized,
      address,
      town,
      expiry_date,
      derived_status,
      is_placeholder,
      source_file,
      source_imported_at,
      source_row
    ) values (
      ${HPA_REGISTERING_BODY},
      ${record.registrationNumber},
      ${record.registrationNumberNormalized},
      ${record.licenceClass},
      ${record.licenceSerial},
      ${record.licenceYear},
      ${record.fullName},
      ${record.fullNameNormalized},
      ${record.qualification},
      ${record.qualificationNormalized},
      ${record.address},
      ${record.town},
      ${record.expiryDate}::date,
      ${record.derivedStatus},
      true,
      ${record.sourceFile},
      ${importedAt},
      ${sql.json(record.sourceRow)}
    )
  `;
  return "inserted";
}

async function importRecords(
  records: ParsedPractitionerRecord[],
): Promise<ImportCounts> {
  const url = requireEnv("SUPABASE_DB_URL");
  const importedAt = new Date();
  const sql = await connectDb(url);
  const counts: ImportCounts = { inserted: 0, updated: 0 };

  try {
    await assertRegistryTable(sql);
    await sql.begin(async (tx) => {
      for (const record of records) {
        const result = record.isPlaceholder
          ? await upsertPlaceholder(tx, record, importedAt)
          : await upsertNonPlaceholder(tx, record, importedAt);
        counts[result] += 1;
      }
    });
  } finally {
    await sql.end({ timeout: 5 });
  }

  return counts;
}

async function main(): Promise<void> {
  loadDotEnvLocal();
  const { dryRun, filePath } = parseArgs(process.argv.slice(2));
  const rows = readWorkbookRows(filePath);
  const result = parsePersonsRegisterRows(rows);

  printStats(result);
  if (result.issues.length > 0) {
    printIssues(result);
    throw new Error(
      "Import aborted: unexpected invalid records. No database changes were made.",
    );
  }

  if (dryRun) {
    console.log("\nDry-run complete. Would import:");
    console.log(`  ${result.records.length} practitioner_registry rows`);
    console.log(
      `  ${result.stats.placeholders} placeholders (P03-0000, not auto-verifiable)`,
    );
    console.log("  0 database writes.");
    return;
  }

  const counts = await importRecords(result.records);
  console.log("\nImport complete:");
  console.log(`  inserted: ${counts.inserted}`);
  console.log(`  updated:  ${counts.updated}`);
  console.log(`  skipped:  0`);
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  const safe = message
    .replace(/postgres(?:ql)?:\/\/[^@\s]+@/gi, "postgres://***@")
    .replace(/[a-z0-9.-]+\.supabase\.co/gi, "[supabase-host]")
    .replace(/[a-z0-9.-]+\.pooler\.supabase\.com/gi, "[pooler-host]");
  console.error(safe);
  process.exit(1);
});
