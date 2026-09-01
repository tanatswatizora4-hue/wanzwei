/**
 * Fail-closed guards for scripts that can write Auth, seed data, or mutate
 * a live database. Import from `scripts/`; do not use in the web app.
 */

export const DESTRUCTIVE_ACK = "I_UNDERSTAND";
export const PRODUCTION_ACK = "I_UNDERSTAND";

export function assertDangerousScriptAllowed(scriptName: string): void {
  const ack = process.env.WANZWEI_ALLOW_DESTRUCTIVE?.trim();
  if (ack !== DESTRUCTIVE_ACK) {
    throw new Error(
      `${scriptName} can change Auth or database data. Set WANZWEI_ALLOW_DESTRUCTIVE=${DESTRUCTIVE_ACK} to continue.`,
    );
  }
}

export function looksLikeProductionTarget(): boolean {
  const haystack = [
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_DB_URL,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(" ")
    .toLowerCase();
  return (
    haystack.includes("irgkeksrittimdwwxckl") ||
    haystack.includes("wanzwei.vercel.app")
  );
}

export function assertNotProductionUnlessAllowed(scriptName: string): void {
  if (!looksLikeProductionTarget()) return;
  const ack = process.env.WANZWEI_ALLOW_PRODUCTION?.trim();
  if (ack !== PRODUCTION_ACK) {
    throw new Error(
      `${scriptName} refuses the production project unless WANZWEI_ALLOW_PRODUCTION=${PRODUCTION_ACK} is set.`,
    );
  }
}

export function requireScriptEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required and has no default.`);
  }
  return value;
}
