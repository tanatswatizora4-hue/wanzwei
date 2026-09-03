export const SIGNUP_CHECK_EMAIL_PATH = "/signup/check-email";
export const EMAIL_CONFIRMED_LOGIN_PATH = "/login?verified=1";

export function signupCheckEmailLocation(email: string): string {
  const params = new URLSearchParams();
  const safe = displayableSignupEmail(email);
  if (safe) params.set("email", safe);
  const query = params.toString();
  return query ? `${SIGNUP_CHECK_EMAIL_PATH}?${query}` : SIGNUP_CHECK_EMAIL_PATH;
}

export function displayableSignupEmail(value: string | null | undefined): string | null {
  const email = value?.trim() ?? "";
  if (!email || email.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

type GateUser = {
  email_confirmed_at?: string | null;
  identities?: Array<{ provider?: string } | null> | null;
  app_metadata?: {
    provider?: unknown;
    providers?: unknown;
  } | null;
};

/**
 * Email/password signup must not enter the app until Confirm email has
 * succeeded. Google (and other OAuth) users are treated as confirmed.
 */
export function isEmailAuthConfirmed(user: GateUser | null | undefined): boolean {
  if (!user) return false;
  if (user.email_confirmed_at) return true;
  const identities = user.identities ?? [];
  if (identities.some((identity) => identity?.provider && identity.provider !== "email")) {
    return true;
  }
  const provider = user.app_metadata?.provider;
  if (typeof provider === "string" && provider.length > 0 && provider !== "email") {
    return true;
  }
  const providers = user.app_metadata?.providers;
  if (Array.isArray(providers) && providers.some((item) => item !== "email")) {
    return true;
  }
  return false;
}

export function unconfirmedUserDestination(email?: string | null): string {
  return signupCheckEmailLocation(email ?? "");
}
