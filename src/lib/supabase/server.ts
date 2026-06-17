import "server-only";

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Create a Supabase client bound to the current request's cookie store.
 * Safe to call from Server Components, Server Actions, and Route Handlers.
 *
 * - In Server Components, cookie writes (which happen when Supabase rotates
 *   the access token) are silently ignored — the middleware refresh handles
 *   that case for us, so this is the right behaviour.
 * - In Server Actions / Route Handlers, cookie writes succeed.
 *
 * NOTE: We don't pass a Database generic yet — table queries arrive in PR-3.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options as CookieOptions);
            }
          } catch {
            // Server Components cannot write cookies. The middleware
            // refresh path will set them on the next response, so
            // silently dropping here is correct.
          }
        },
      },
    },
  );
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
