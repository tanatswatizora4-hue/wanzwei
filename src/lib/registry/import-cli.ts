import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import * as XLSX from "xlsx";

import {
  PERSONS_REGISTER_SHEET,
  PERSONS_REGISTER_SOURCE_FILE,
  assertAllowedPersonsRegisterFilename,
  assertExactPersonsRegisterHeaders,
  parsePersonsRegisterRows,
  parseRegistryImportArgs,
  sha256Hex,
  type PersonsRegisterParseResult,
} from "./persons-register";

export type RegistryImportCounts = {
  inserted: number;
  updated: number;
};

export type RegistryImportOutcome =
  | {
      mode: "dry-run";
      sourceName: string;
      sha256: string;
      byteLength: number;
      result: PersonsRegisterParseResult;
    }
  | {
      mode: "import";
      sourceName: string;
      sha256: string;
      byteLength: number;
      result: PersonsRegisterParseResult;
      counts: RegistryImportCounts;
    };

export function readPersonsRegisterXlsx(buffer: Buffer): {
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
} {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  if (!workbook.SheetNames.includes(PERSONS_REGISTER_SHEET)) {
    throw new Error(
      `Expected sheet "${PERSONS_REGISTER_SHEET}", found: ${
        workbook.SheetNames.length ? workbook.SheetNames.join(", ") : "(none)"
      }.`,
    );
  }
  const sheet = workbook.Sheets[PERSONS_REGISTER_SHEET];
  if (!sheet) {
    throw new Error(`Missing sheet: ${PERSONS_REGISTER_SHEET}.`);
  }

  const headerRows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  const headers = (headerRows[0] ?? []).map((value) => String(value));
  assertExactPersonsRegisterHeaders(headers);

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
    blankrows: false,
  });
  return { sheetName: PERSONS_REGISTER_SHEET, headers, rows };
}

export async function executeRegistryImport(
  argv: string[],
  deps: {
    readFile?: (filePath: string) => Buffer;
    importRecords?: (
      records: PersonsRegisterParseResult["records"],
    ) => Promise<RegistryImportCounts>;
  } = {},
): Promise<RegistryImportOutcome> {
  const args = parseRegistryImportArgs(argv);
  assertAllowedPersonsRegisterFilename(args.file);
  const buffer = deps.readFile
    ? deps.readFile(args.file)
    : (() => {
        if (!existsSync(args.file)) {
          throw new Error(`Registry file not found: ${args.file}`);
        }
        return readFileSync(args.file);
      })();
  const sha256 = sha256Hex(buffer);
  const { rows } = readPersonsRegisterXlsx(buffer);
  const result = parsePersonsRegisterRows(rows);

  const base = {
    sourceName: path.basename(args.file) || PERSONS_REGISTER_SOURCE_FILE,
    sha256,
    byteLength: buffer.length,
    result,
  };

  if (args.dryRun) {
    return { mode: "dry-run", ...base };
  }

  if (result.issues.length > 0) {
    throw new Error(
      "Import aborted: unexpected invalid records. No database changes were made.",
    );
  }

  if (!deps.importRecords) {
    throw new Error("Live import requires an importRecords implementation.");
  }

  const counts = await deps.importRecords(result.records);
  return { mode: "import", ...base, counts };
}

export function formatRegistryDryRunReport(outcome: Extract<
  RegistryImportOutcome,
  { mode: "dry-run" }
>): string {
  const { result, sourceName, sha256 } = outcome;
  const { stats } = result;
  const personNoCounts = new Map<string, number>();
  for (const record of result.records) {
    personNoCounts.set(
      record.registrationNumber,
      (personNoCounts.get(record.registrationNumber) ?? 0) + 1,
    );
  }
  let duplicatePersonNoCount = 0;
  for (const count of personNoCounts.values()) {
    if (count > 1) duplicatePersonNoCount += 1;
  }
  const blankExpiry = result.issues.filter(
    (issue) => issue.field === "Expiry Date",
  ).length;

  return [
    "Persons Register dry-run (no database writes).",
    `  source                 ${sourceName}`,
    `  sha256                 ${sha256}`,
    `  rows                   ${stats.totalRows}`,
    `  blank Address          ${stats.missingAddress}`,
    `  blank Town             ${stats.missingTown}`,
    `  blank Expiry Date      ${blankExpiry}`,
    `  duplicate Person No.   ${duplicatePersonNoCount}`,
    `  would insert           ${stats.validRows}`,
    `  placeholders           ${stats.placeholders} (P03-0000, not auto-verifiable)`,
  ].join("\n");
}
