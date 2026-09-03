const GRADIENT_TOKEN = /(?:from-|to-|via-|bg-gradient)/;

const FALLBACK = "from-slate-500 to-slate-800";

/** CSS gradient utility classes only. File paths and URLs are not shipped. */
export function catalogueCoverClass(
  cover: string | null | undefined,
  fallback = FALLBACK,
): string {
  const trimmed = cover?.trim() ?? "";
  if (!trimmed) return fallback;
  if (trimmed.startsWith("/") || trimmed.startsWith("http")) return fallback;
  if (!GRADIENT_TOKEN.test(trimmed)) return fallback;
  return trimmed;
}
