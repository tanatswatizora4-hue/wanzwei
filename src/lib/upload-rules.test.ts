import { describe, expect, it } from "vitest";

import {
  sanitizeStorageFileName,
  validateDocumentFile,
  validateProfilePhotoFile,
} from "./upload-rules";

describe("upload validation", () => {
  it("sanitizes storage names without leaking path separators", () => {
    expect(sanitizeStorageFileName(" ../Medical License 2026.pdf ")).toBe(
      "_Medical_License_2026.pdf",
    );
    expect(sanitizeStorageFileName("   ")).toBe("document");
  });

  it("accepts PDF documents only when extension, MIME, and bytes match", () => {
    const file = new File(["%PDF-1.7"], "license.pdf", {
      type: "application/pdf",
    });

    expect(validateDocumentFile(file, pdfBytes())).toBeNull();
    expect(validateDocumentFile(file, pngBytes())).toBe(
      "File contents do not match the declared file type.",
    );
  });

  it("rejects mismatched profile photo uploads", () => {
    const file = new File(["not an image"], "avatar.jpg", {
      type: "image/png",
    });

    expect(validateProfilePhotoFile(file, pngBytes())).toBe(
      "File extension and MIME type do not match.",
    );
  });
});

function pdfBytes() {
  return new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
}

function pngBytes() {
  return new Uint8Array([
    0x89,
    0x50,
    0x4e,
    0x47,
    0x0d,
    0x0a,
    0x1a,
    0x0a,
  ]);
}
