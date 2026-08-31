const DUPLICATE_AUTH_CODES = new Set([
  "email_exists",
  "user_already_exists",
]);

const DUPLICATE_AUTH_MESSAGE =
  /already registered|already been registered|user already exists|email already registered/i;

const SCHEMA_MISSING_MESSAGE = /(?:relation|column|table|function) .* does not exist/i;

/**
 * True when an Auth admin/createUser failure means this email is already
 * registered. Must not match generic database errors such as
 * "relation public.users does not exist".
 */
export function isDuplicateAuthUserError(error: unknown): boolean {
  const code = errorCode(error);
  if (code && DUPLICATE_AUTH_CODES.has(code)) return true;

  const message = errorMessage(error);
  if (!message) return false;
  if (SCHEMA_MISSING_MESSAGE.test(message)) return false;
  return DUPLICATE_AUTH_MESSAGE.test(message);
}

export function isEmailNotConfirmedError(error: unknown): boolean {
  const code = errorCode(error);
  if (code === "email_not_confirmed") return true;
  return /email not confirmed/i.test(errorMessage(error));
}

function errorCode(error: unknown): string | null {
  if (error != null && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code.trim()) return code.trim();
  }
  return null;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error != null && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return typeof error === "string" ? error : "";
}
