import { ALLOWED_DOCUMENT_MIME } from "@/lib/upload-rules";
import {
  CREDENTIAL_EXTRACT_PROMPT,
  IDENTITY_EXTRACT_PROMPT,
  mapCredentialExtraction,
  mapIdentityExtraction,
  parseJsonObject,
} from "@/lib/verification/gemini/map-response";
import type { GeminiGenerateJson } from "@/lib/verification/gemini/types";
import type {
  CredentialAnalysis,
  CredentialDocumentAnalyzer,
  DocumentAnalyzerInput,
  IdentityAnalysis,
  IdentityDocumentAnalyzer,
} from "@/lib/verification/hybrid-types";

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function unsupported(input: DocumentAnalyzerInput): boolean {
  return !input.bytes?.length || !ALLOWED_DOCUMENT_MIME.has(input.contentType);
}

export function createGeminiIdentityAnalyzer(
  generate: GeminiGenerateJson,
): IdentityDocumentAnalyzer {
  return {
    async analyze(input): Promise<IdentityAnalysis> {
      if (unsupported(input)) return { status: "unavailable" };
      try {
        const text = await generate({
          prompt: IDENTITY_EXTRACT_PROMPT,
          mimeType: input.contentType,
          base64Data: toBase64(input.bytes!),
        });
        const parsed = parseJsonObject(text);
        if (!parsed) return { status: "unreadable", documentQuality: "poor" };
        return mapIdentityExtraction(parsed);
      } catch {
        return { status: "unavailable" };
      }
    },
  };
}

export function createGeminiCredentialAnalyzer(
  generate: GeminiGenerateJson,
): CredentialDocumentAnalyzer {
  return {
    async analyze(input): Promise<CredentialAnalysis> {
      if (unsupported(input)) return { status: "unavailable" };
      try {
        const text = await generate({
          prompt: CREDENTIAL_EXTRACT_PROMPT,
          mimeType: input.contentType,
          base64Data: toBase64(input.bytes!),
        });
        const parsed = parseJsonObject(text);
        if (!parsed) return { status: "unreadable", documentQuality: "poor" };
        return mapCredentialExtraction(parsed);
      } catch {
        return { status: "unavailable" };
      }
    },
  };
}
