import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { User } from "@supabase/supabase-js";

/**
 * Refreshes the Supabase auth session for a request and returns:
 *  - `response`: the NextResponse with refreshed auth cookies attached
 *  - `user`:     the authenticated Supabase Auth user, or null
 *
 * Pattern adapted from the official @supabase/ssr Next.js guide. The
 * Supabase access token rotates on each call; we need to forward any
 * refreshed cookies on both the *request* (for downstream handlers in
 * the same request lifecycle) and the *response* (so the browser
 * receives the new cookie).
 *
 * IMPORTANT — when the consuming middleware returns a redirect, it MUST
 * copy `response.cookies` onto the redirect, otherwise the session cookie
 * gets lost mid-flight. See `applyAuthCookies` below.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
}> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: do not put any code between createServerClient and getUser().
  // The Supabase docs warn that doing so can break the cookie-refresh flow.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}

/**
 * Copy auth cookies from the session-refresh response onto a redirect so
 * the browser still receives them.
 */
export function applyAuthCookies(
  redirect: NextResponse,
  sessionResponse: NextResponse,
): NextResponse {
  for (const cookie of sessionResponse.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(
      `Missing required environment variable ${key}. Add it to .env.local.`,
    );
  }
  return value;
}
