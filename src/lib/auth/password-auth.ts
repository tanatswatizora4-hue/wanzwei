import "server-only";

import { getServerSupabase } from "@/lib/supabase/server";

function providerList(authUser: {
  app_metadata?: { providers?: unknown };
  identities?: Array<{ provider?: string }> | null;
}): string[] {
  const fromMeta = authUser.app_metadata?.providers;
  const metaProviders = Array.isArray(fromMeta)
    ? fromMeta.filter((value): value is string => typeof value === "string")
    : [];
  const fromIdentities = (authUser.identities ?? [])
    .map((identity) => identity.provider)
    .filter((value): value is string => typeof value === "string");
  return [...metaProviders, ...fromIdentities];
}

export function authUserHasPassword(authUser: {
  app_metadata?: { providers?: unknown };
  identities?: Array<{ provider?: string }> | null;
}): boolean {
  return providerList(authUser).includes("email");
}

export async function currentAuthHasPassword(): Promise<boolean> {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  return authUserHasPassword(user);
}
