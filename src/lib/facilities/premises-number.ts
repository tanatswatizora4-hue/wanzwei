/**
 * Conservative premises-number handling.
 *
 * There is no encoded authoritative format in this repo. The example
 * W01-2026-#### is documentation only — do not reject legitimate numbers
 * that do not match that shape.
 *
 * Submitting a premises number never verifies a facility.
 */

export const PREMISES_NUMBER_MAX_LENGTH = 40;
export const PREMISES_NUMBER_MIN_LENGTH = 4;

export function normalizePremisesNumber(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const collapsed = raw.trim().replace(/\s+/g, "").toUpperCase();
  return collapsed.length > 0 ? collapsed : null;
}

export function isValidPremisesNumber(raw: string | null | undefined): boolean {
  const normalized = normalizePremisesNumber(raw);
  if (normalized == null) return true;
  if (
    normalized.length < PREMISES_NUMBER_MIN_LENGTH ||
    normalized.length > PREMISES_NUMBER_MAX_LENGTH
  ) {
    return false;
  }
  return /^[A-Z0-9][A-Z0-9\-\/]*$/.test(normalized);
}

export function parsePremisesNumberInput(
  raw: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; message: string } {
  if (raw == null || raw.trim() === "") {
    return { ok: true, value: null };
  }
  if (!isValidPremisesNumber(raw)) {
    return {
      ok: false,
      message:
        "Premises number should be 4–40 characters using letters, numbers, hyphens, or slashes.",
    };
  }
  return { ok: true, value: normalizePremisesNumber(raw) };
}
