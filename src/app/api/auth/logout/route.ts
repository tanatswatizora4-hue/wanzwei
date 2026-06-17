import { NextResponse } from "next/server";

import { signOut } from "@/lib/auth/session";
import { withRouteLogging } from "@/lib/observability/logger";

export const runtime = "nodejs";

export async function POST(req: Request) {
  return withRouteLogging("/api/auth/logout", req, () => handlePOST(req));
}

async function handlePOST(req: Request) {
  await signOut();
  return NextResponse.redirect(new URL("/login", req.url), { status: 303 });
}

// GET kept as a convenience so a bare <a href="/api/auth/logout"> works too;
// real form posts (CSRF-safe with same-origin) hit POST. CSRF hardening is
// tracked separately.
export async function GET(req: Request) {
  return POST(req);
}
