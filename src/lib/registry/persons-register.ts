import { createHash } from "node:crypto";
import path from "node:path";

export const HPA_REGISTERING_BODY = "HPA";
export const PERSONS_REGISTER_SOURCE_FILE = "Persons Register.xlsx";

export const PERSONS_REGISTER_SHEET = "Sheet1";

export const PERSONS_REGISTER_COLUMNS = [
  "Person No.",
  "Full Name",
  "Qualification",
  "Address",
  "Town",
  "Expiry Date",
] as const;

export type PersonsRegisterColumn = (typeof PERSONS_REGISTER_COLUMNS)[number];

const PERSON_NO_PATTERN = /^([A-Z]\d{2})-(\d{4})-(\d{4})$/;

export type RegistryDerivedStatus = "active" | "expired";

export type PersonsRegisterSourceRow = Record<string, unknown>;

export type ParsedLicenceNumber = {
  registrationNumber: string;
  registrationNumberNormalized: string;
  licenceClass: string;
  licenceSerial: string;
  licenceYear: number;
};

export type ParsedPractitionerRecord = {
  registeringBody: typeof HPA_REGISTERING_BODY;
  registrationNumber: string;
  registrationNumberNormalized: string;
  licenceClass: string;
  licenceSerial: string;
  licenceYear: number;
  fullName: string;
  fullNameNormalized: string;
  qualification: string;
  qualificationNormalized: string;
  address: string | null;
  town: string | null;
  expiryDate: string;
  derivedStatus: RegistryDerivedStatus;
  isPlaceholder: boolean;
  sourceFile: typeof PERSONS_REGISTER_SOURCE_FILE;
  sourceRow: Record<string, string>;
  excelRowNumber: number;
};

export type ParseIssue = {
  excelRowNumber: number;
  field: string;
  message: string;
};

export type PersonsRegisterParseResult = {
  records: ParsedPractitionerRecord[];
  issues: ParseIssue[];
  stats: PersonsRegisterStats;
};

export type PersonsRegisterStats = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  active: number;
  expired: number;
  placeholders: number;
  missingAddress: number;
  missingTown: number;
  qualificationCounts: Record<string, number>;
  duplicateNonPlaceholderNumbers: Array<{
    registrationNumberNormalized: string;
    excelRowNumbers: number[];
  }>;
  duplicatePlaceholderIdentities: Array<{
    fullNameNormalized: string;
    excelRowNumbers: number[];
  }>;
};

export function normalizeRegistrationNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/[\s-]/g, "");
}

export function normalizePersonName(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, " ");
}

export function normalizeQualification(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, " ");
}

export function isPlaceholderRegistration(
  licenceClass: string,
  licenceSerial: string,
): boolean {
  return licenceClass === "P03" && licenceSerial === "0000";
}

export function parsePersonNumber(raw: unknown): ParsedLicenceNumber | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const trimmed = String(raw).trim().toUpperCase();
  if (!trimmed) return null;
  const match = PERSON_NO_PATTERN.exec(trimmed);
  if (!match) return null;
  const licenceClass = match[1];
  const licenceSerial = match[2];
  const licenceYear = Number(match[3]);
  if (!Number.isInteger(licenceYear)) return null;
  return {
    registrationNumber: String(raw).trim(),
    registrationNumberNormalized: normalizeRegistrationNumber(trimmed),
    licenceClass,
    licenceSerial,
    licenceYear,
  };
}

export function parseExpiryDate(raw: unknown): string | null {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return formatUtcDate(raw);
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return excelSerialToIsoDate(raw);
  }
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    return isValidYmd(Number(iso[1]), Number(iso[2]), Number(iso[3]))
      ? trimmed
      : null;
  }

  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(trimmed);
  if (!us) return null;
  const month = Number(us[1]);
  const day = Number(us[2]);
  const yearRaw = Number(us[3]);
  const year = us[3].length === 2 ? (yearRaw < 50 ? 2000 + yearRaw : 1900 + yearRaw) : yearRaw;
  if (!isValidYmd(year, month, day)) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function deriveStatus(
  expiryDate: string,
  asOf: Date = new Date(),
): RegistryDerivedStatus {
  const today = calendarDateInHarare(asOf);
  return expiryDate >= today ? "active" : "expired";
}

export function missingPersonsRegisterColumns(headers: string[]): string[] {
  const present = new Set(headers.map((header) => header.trim()));
  return PERSONS_REGISTER_COLUMNS.filter((column) => !present.has(column));
}

const FORBIDDEN_SOURCE_BASENAMES = new Set([
  "premises 13052026.xlsx",
  "hpa facilities.xlsx",
]);

export function assertAllowedPersonsRegisterFilename(filePath: string): void {
  const base = path.basename(filePath);
  const lower = base.toLowerCase();
  if (!lower.endsWith(".xlsx")) {
    throw new Error(`Expected an .xlsx workbook, got "${base}".`);
  }
  if (FORBIDDEN_SOURCE_BASENAMES.has(lower)) {
    throw new Error(
      `"${base}" is not the Persons Register. Premises and HPA Facilities must not be imported.`,
    );
  }
  if (lower !== PERSONS_REGISTER_SOURCE_FILE.toLowerCase()) {
    throw new Error(
      `Refusing to import ${base}. This importer only accepts ${PERSONS_REGISTER_SOURCE_FILE}.`,
    );
  }
}

export function assertExactPersonsRegisterHeaders(headers: string[]): void {
  const trimmed = headers.map((header) => String(header).trim()).filter((header) => header !== "");
  const expected = [...PERSONS_REGISTER_COLUMNS];
  const matches =
    trimmed.length === expected.length &&
    trimmed.every((header, index) => header === expected[index]);
  if (!matches) {
    throw new Error(
      `Sheet1 headers must be exactly ${JSON.stringify(expected)}. Found ${JSON.stringify(trimmed)}.`,
    );
  }
}

export function sha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function parseRegistryImportArgs(argv: string[]): {
  file: string;
  dryRun: boolean;
} {
  let file: string | undefined;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--dry-run") dryRun = true;
    else if (arg === "--file" || arg === "-f") file = argv[++i];
    else if (arg.startsWith("--file=")) file = arg.slice("--file=".length);
  }
  if (!file?.trim()) {
    throw new Error(
      `Missing --file path. Example: npm run registry:import -- --file "C:\\path\\${PERSONS_REGISTER_SOURCE_FILE}" [--dry-run]`,
    );
  }
  return { file: file.trim(), dryRun };
}

export function parsePersonsRegisterRows(
  rows: PersonsRegisterSourceRow[],
  options: { asOf?: Date } = {},
): PersonsRegisterParseResult {
  const asOf = options.asOf ?? new Date();
  const issues: ParseIssue[] = [];
  const records: ParsedPractitionerRecord[] = [];

  rows.forEach((row, index) => {
    const excelRowNumber = index + 2;
    const parsed = parseSourceRow(row, excelRowNumber, asOf);
    if ("issues" in parsed) {
      issues.push(...parsed.issues);
      return;
    }
    records.push(parsed.record);
  });

  const duplicateNonPlaceholderNumbers = findDuplicateNonPlaceholders(records);
  const duplicatePlaceholderIdentities = findDuplicatePlaceholderIdentities(records);

  for (const duplicate of duplicateNonPlaceholderNumbers) {
    issues.push({
      excelRowNumber: duplicate.excelRowNumbers[0] ?? 0,
      field: "Person No.",
      message: `Duplicate non-placeholder registration ${duplicate.registrationNumberNormalized} on rows ${duplicate.excelRowNumbers.join(", ")}`,
    });
  }
  for (const duplicate of duplicatePlaceholderIdentities) {
    issues.push({
      excelRowNumber: duplicate.excelRowNumbers[0] ?? 0,
      field: "Full Name",
      message: `Duplicate placeholder identity on rows ${duplicate.excelRowNumbers.join(", ")}`,
    });
  }

  const stats = buildStats(rows.length, records, issues, {
    duplicateNonPlaceholderNumbers,
    duplicatePlaceholderIdentities,
  });

  return { records, issues, stats };
}

function parseSourceRow(
  row: PersonsRegisterSourceRow,
  excelRowNumber: number,
  asOf: Date,
): { record: ParsedPractitionerRecord } | { issues: ParseIssue[] } {
  const issues: ParseIssue[] = [];
  const personNo = cellString(row["Person No."]);
  const fullNameRaw = cellString(row["Full Name"]);
  const qualificationRaw = cellString(row["Qualification"]);
  const addressRaw = cellString(row["Address"]);
  const townRaw = cellString(row["Town"]);
  const expiryRaw = row["Expiry Date"];

  if (!personNo) {
    issues.push({
      excelRowNumber,
      field: "Person No.",
      message: "Person No. is blank",
    });
  }
  if (!fullNameRaw) {
    issues.push({
      excelRowNumber,
      field: "Full Name",
      message: "Full Name is blank",
    });
  }
  if (!qualificationRaw) {
    issues.push({
      excelRowNumber,
      field: "Qualification",
      message: "Qualification is blank",
    });
  }

  const licence = personNo ? parsePersonNumber(personNo) : null;
  if (personNo && !licence) {
    issues.push({
      excelRowNumber,
      field: "Person No.",
      message: "Person No. is not A99-9999-YYYY",
    });
  }

  const expiryDate = parseExpiryDate(expiryRaw);
  if (!expiryDate) {
    issues.push({
      excelRowNumber,
      field: "Expiry Date",
      message: "Expiry Date is missing or invalid",
    });
  }

  if (issues.length > 0 || !licence || !fullNameRaw || !qualificationRaw || !expiryDate) {
    return { issues };
  }

  const address = addressRaw || null;
  const town = townRaw || null;
  const isPlaceholder = isPlaceholderRegistration(
    licence.licenceClass,
    licence.licenceSerial,
  );

  return {
    record: {
      registeringBody: HPA_REGISTERING_BODY,
      registrationNumber: licence.registrationNumber,
      registrationNumberNormalized: licence.registrationNumberNormalized,
      licenceClass: licence.licenceClass,
      licenceSerial: licence.licenceSerial,
      licenceYear: licence.licenceYear,
      fullName: fullNameRaw,
      fullNameNormalized: normalizePersonName(fullNameRaw),
      qualification: qualificationRaw,
      qualificationNormalized: normalizeQualification(qualificationRaw),
      address,
      town,
      expiryDate,
      derivedStatus: deriveStatus(expiryDate, asOf),
      isPlaceholder,
      sourceFile: PERSONS_REGISTER_SOURCE_FILE,
      sourceRow: {
        "Person No.": cellOriginal(row["Person No."]),
        "Full Name": cellOriginal(row["Full Name"]),
        Qualification: cellOriginal(row["Qualification"]),
        Address: cellOriginal(row["Address"]),
        Town: cellOriginal(row["Town"]),
        "Expiry Date": cellOriginal(row["Expiry Date"]),
      },
      excelRowNumber,
    },
  };
}

function findDuplicateNonPlaceholders(
  records: ParsedPractitionerRecord[],
): PersonsRegisterStats["duplicateNonPlaceholderNumbers"] {
  const grouped = new Map<string, number[]>();
  for (const record of records) {
    if (record.isPlaceholder) continue;
    const rows = grouped.get(record.registrationNumberNormalized) ?? [];
    rows.push(record.excelRowNumber);
    grouped.set(record.registrationNumberNormalized, rows);
  }
  return [...grouped.entries()]
    .filter(([, excelRowNumbers]) => excelRowNumbers.length > 1)
    .map(([registrationNumberNormalized, excelRowNumbers]) => ({
      registrationNumberNormalized,
      excelRowNumbers,
    }));
}

function findDuplicatePlaceholderIdentities(
  records: ParsedPractitionerRecord[],
): PersonsRegisterStats["duplicatePlaceholderIdentities"] {
  const grouped = new Map<string, number[]>();
  for (const record of records) {
    if (!record.isPlaceholder) continue;
    const key = `${record.registrationNumberNormalized}|${record.fullNameNormalized}`;
    const rows = grouped.get(key) ?? [];
    rows.push(record.excelRowNumber);
    grouped.set(key, rows);
  }
  return [...grouped.entries()]
    .filter(([, excelRowNumbers]) => excelRowNumbers.length > 1)
    .map(([key, excelRowNumbers]) => ({
      fullNameNormalized: key.split("|")[1] ?? key,
      excelRowNumbers,
    }));
}

function buildStats(
  totalRows: number,
  records: ParsedPractitionerRecord[],
  issues: ParseIssue[],
  duplicates: Pick<
    PersonsRegisterStats,
    "duplicateNonPlaceholderNumbers" | "duplicatePlaceholderIdentities"
  >,
): PersonsRegisterStats {
  const qualificationCounts: Record<string, number> = {};
  let active = 0;
  let expired = 0;
  let placeholders = 0;
  let missingAddress = 0;
  let missingTown = 0;

  for (const record of records) {
    qualificationCounts[record.qualificationNormalized] =
      (qualificationCounts[record.qualificationNormalized] ?? 0) + 1;
    if (record.derivedStatus === "active") active += 1;
    else expired += 1;
    if (record.isPlaceholder) placeholders += 1;
    if (!record.address) missingAddress += 1;
    if (!record.town) missingTown += 1;
  }

  const invalidRowNumbers = new Set(issues.map((issue) => issue.excelRowNumber));

  return {
    totalRows,
    validRows: records.length,
    invalidRows: invalidRowNumbers.size,
    active,
    expired,
    placeholders,
    missingAddress,
    missingTown,
    qualificationCounts,
    ...duplicates,
  };
}

function cellString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return "";
  return String(value).trim();
}

function cellOriginal(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return formatUtcDate(value);
  return String(value);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function formatUtcDate(value: Date): string {
  return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
}

function excelSerialToIsoDate(serial: number): string | null {
  if (serial < 1 || serial > 1000000) return null;
  const utc = Date.UTC(1899, 11, 30) + Math.trunc(serial) * 86_400_000;
  return formatUtcDate(new Date(utc));
}

function calendarDateInHarare(asOf: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Harare",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(asOf);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    return asOf.toISOString().slice(0, 10);
  }
  return `${year}-${month}-${day}`;
}
