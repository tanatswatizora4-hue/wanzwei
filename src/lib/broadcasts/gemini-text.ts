import "server-only";

import { createLogger } from "@/lib/observability/logger";
import {
  getGeminiApiKey,
  getGeminiModel,
} from "@/lib/verification/gemini/config";

const logger = createLogger("broadcasts-gemini");

export class BroadcastGeminiUnavailableError extends Error {
  constructor(message = "Gemini is not configured.") {
    super(message);
    this.name = "BroadcastGeminiUnavailableError";
  }
}

export class BroadcastGeminiApiError extends Error {
  constructor(message = "Gemini targeting interpretation failed.") {
    super(message);
    this.name = "BroadcastGeminiApiError";
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
 * Text-only Gemini JSON generation for broadcast targeting/copy.
 * Never logs the API key or model text.
 */
export async function generateGeminiTextJson(prompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new BroadcastGeminiUnavailableError();

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
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
        },
      }),
    });
  } catch {
    logger.warn("broadcasts.gemini_network_failed", { model });
    throw new BroadcastGeminiApiError();
  }

  if (!response.ok) {
    logger.warn("broadcasts.gemini_http_failed", {
      model,
      status: response.status,
    });
    throw new BroadcastGeminiApiError();
  }

  const payload = (await response.json()) as GeminiResponse;
  const text = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
  if (!text) throw new BroadcastGeminiApiError("Gemini returned empty JSON.");
  return text;
}
