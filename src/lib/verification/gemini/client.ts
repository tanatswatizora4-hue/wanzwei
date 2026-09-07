import "server-only";

import { createLogger } from "@/lib/observability/logger";
import {
  getGeminiApiKey,
  getGeminiModel,
} from "@/lib/verification/gemini/config";
import type {
  GeminiGenerateJsonInput,
} from "@/lib/verification/gemini/types";

const logger = createLogger("verification-gemini");

export class GeminiUnavailableError extends Error {
  constructor(message = "Gemini is not configured.") {
    super(message);
    this.name = "GeminiUnavailableError";
  }
}

export class GeminiApiError extends Error {
  constructor(message = "Gemini document analysis failed.") {
    super(message);
    this.name = "GeminiApiError";
  }
}

type GeminiPart = { text?: string };
type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
};

function generateUrl(model: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
}

/**
 * Official Gemini generateContent REST call.
 * Never logs the API key, document bytes, or model text.
 */
export async function generateGeminiJson(
  input: GeminiGenerateJsonInput,
): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new GeminiUnavailableError();

  const model = getGeminiModel();
  let response: Response;
  try {
    response = await fetch(generateUrl(model), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: input.prompt },
              {
                inline_data: {
                  mime_type: input.mimeType,
                  data: input.base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch {
    logger.warn("verification.gemini_network_failed", {
      model,
      mimeType: input.mimeType,
    });
    throw new GeminiApiError();
  }

  if (!response.ok) {
    logger.warn("verification.gemini_http_failed", {
      model,
      status: response.status,
      mimeType: input.mimeType,
    });
    throw new GeminiApiError();
  }

  const payload = (await response.json()) as GeminiResponse;
  const text = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw new GeminiApiError("Gemini returned an empty analysis.");
  return text;
}
