import "server-only";

import { headers } from "next/headers";

const FALLBACK_ORIGIN = "https://wanzwei.vercel.app";

export async function appOrigin(): Promise<string> {
  const headerList = await headers();
  const forwardedHost = headerList.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headerList.get("host")?.trim();
  if (!host) return FALLBACK_ORIGIN;
  const proto =
    headerList.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export function facilityInvitationUrl(origin: string, rawToken: string): string {
  return `${origin.replace(/\/$/, "")}/invitations/accept?token=${encodeURIComponent(rawToken)}`;
}
