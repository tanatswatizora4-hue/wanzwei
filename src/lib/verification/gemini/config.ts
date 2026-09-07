export const GEMINI_API_KEY_ENV = "GEMINI_API_KEY";
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export function getGeminiApiKey(): string | null {
  const value = process.env[GEMINI_API_KEY_ENV]?.trim();
  return value || null;
}

export function isGeminiConfigured(): boolean {
  return getGeminiApiKey() != null;
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}
