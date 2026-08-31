/** Auth and GoTrue treat emails as case-insensitive. Keep app lookups aligned. */
export function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}
