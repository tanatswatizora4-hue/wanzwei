/**
 * Deterministic name comparison for verification evidence.
 * Gemini extracts names; Wanzwei decides whether they refer to the same person.
 */

const PUNCTUATION = /[''`.,/\\()[\]]/g;

export function normalizeComparableName(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(PUNCTUATION, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizePersonName(raw: string): string[] {
  return normalizeComparableName(raw)
    .split(" ")
    .map((token) => token.replace(/\./g, ""))
    .filter(Boolean);
}

function tokensMatch(left: string, right: string): boolean {
  if (left === right) return true;
  if (left.length === 1 && right.startsWith(left)) return true;
  if (right.length === 1 && left.startsWith(right)) return true;
  return false;
}

function givenNamesCompatible(left: string[], right: string[]): boolean {
  const [shorter, longer] =
    left.length <= right.length ? [left, right] : [right, left];
  const used = new Set<number>();
  for (const token of shorter) {
    const matchIndex = longer.findIndex(
      (candidate, index) => !used.has(index) && tokensMatch(token, candidate),
    );
    if (matchIndex === -1) return false;
    used.add(matchIndex);
  }
  return longer
    .filter((_, index) => !used.has(index))
    .every((token) => token.length === 1);
}

/**
 * Conservative compatibility:
 * - surnames must match
 * - each side needs a given name or initial plus a surname
 * - initials may match a full given name with the same first letter
 * - extra unmatched full given names fail
 */
export function namesAreCompatible(
  left?: string | null,
  right?: string | null,
): boolean {
  const a = tokenizePersonName(left ?? "");
  const b = tokenizePersonName(right ?? "");
  if (a.length < 2 || b.length < 2) return false;
  if (a.join(" ") === b.join(" ")) return true;
  if (a[a.length - 1] !== b[b.length - 1]) return false;
  return givenNamesCompatible(a.slice(0, -1), b.slice(0, -1));
}
