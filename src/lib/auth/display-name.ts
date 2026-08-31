import type { User as SupabaseAuthUser } from "@supabase/supabase-js";

export function displayNameFromAuthUser(
  authUser: Pick<SupabaseAuthUser, "email" | "user_metadata">,
): string {
  const metadata = authUser.user_metadata as
    | { full_name?: unknown; name?: unknown }
    | undefined;

  const fullName = metadata?.full_name ?? metadata?.name;
  if (typeof fullName === "string" && fullName.trim().length > 0) {
    return fullName.trim();
  }

  const email = authUser.email?.trim();
  if (email) {
    const localPart = email.split("@")[0]?.trim();
    if (localPart) return localPart;
  }

  return "User";
}
