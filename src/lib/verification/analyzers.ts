import type {
  CredentialDocumentAnalyzer,
  IdentityDocumentAnalyzer,
} from "@/lib/verification/hybrid-types";
import { isGeminiConfigured } from "@/lib/verification/gemini/config";
import {
  createGeminiCredentialAnalyzer,
  createGeminiIdentityAnalyzer,
} from "@/lib/verification/gemini/analyzers";

/**
 * Default analyzers when Gemini is not configured.
 * They never invent extracted fields and never imply a document was read.
 */
export const unavailableIdentityAnalyzer: IdentityDocumentAnalyzer = {
  async analyze(): Promise<{ status: "unavailable" }> {
    return { status: "unavailable" };
  },
};

export const unavailableCredentialAnalyzer: CredentialDocumentAnalyzer = {
  async analyze(): Promise<{ status: "unavailable" }> {
    return { status: "unavailable" };
  },
};

export function getIdentityDocumentAnalyzer(): IdentityDocumentAnalyzer {
  if (!isGeminiConfigured()) return unavailableIdentityAnalyzer;
  return createGeminiIdentityAnalyzer(async (input) => {
    const { generateGeminiJson } = await import("@/lib/verification/gemini/client");
    return generateGeminiJson(input);
  });
}

export function getCredentialDocumentAnalyzer(): CredentialDocumentAnalyzer {
  if (!isGeminiConfigured()) return unavailableCredentialAnalyzer;
  return createGeminiCredentialAnalyzer(async (input) => {
    const { generateGeminiJson } = await import("@/lib/verification/gemini/client");
    return generateGeminiJson(input);
  });
}
