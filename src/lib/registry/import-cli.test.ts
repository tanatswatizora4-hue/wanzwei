import { describe, expect, it, vi } from "vitest";

import { executeRegistryImport } from "./import-cli";

describe("executeRegistryImport dry-run", () => {
  it("does not invoke importRecords when dry-run parsing succeeds", async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Person No.", "Full Name", "Qualification", "Address", "Town", "Expiry Date"],
      ["P03-0000-2026", "BATSIRAI MUKOKA", "PHARMACIST", "", "HARARE", "2/28/27"],
      ["P01-6420-2026", "AARON MUGODI", "PHARMACIST", "23 BLACKROCK RD", "HARARE", "2/28/27"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buffer = Buffer.from(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );

    const importRecords = vi.fn(async () => ({ inserted: 99, updated: 99 }));
    const outcome = await executeRegistryImport(
      ["--file", "C:\\data\\Persons Register.xlsx", "--dry-run"],
      {
        readFile: () => buffer,
        importRecords,
      },
    );

    expect(outcome.mode).toBe("dry-run");
    expect(importRecords).not.toHaveBeenCalled();
    if (outcome.mode !== "dry-run") throw new Error("expected dry-run");
    expect(outcome.result.stats.placeholders).toBe(1);
    expect(outcome.result.records).toHaveLength(2);
    expect(outcome.result.records[0]?.address).toBeNull();
    expect(outcome.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects a workbook that does not have Sheet1", async () => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet([
      ["Person No.", "Full Name", "Qualification", "Address", "Town", "Expiry Date"],
    ]);
    XLSX.utils.book_append_sheet(workbook, sheet, "Premises");
    const buffer = Buffer.from(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );

    await expect(
      executeRegistryImport(["--file", "Persons Register.xlsx"], {
        readFile: () => buffer,
        importRecords: vi.fn(),
      }),
    ).rejects.toThrow(/Expected sheet "Sheet1"/);
  });
});
