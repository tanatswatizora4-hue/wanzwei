import type { PostgrestError } from "@supabase/supabase-js";

type PostgrestLikeError = Pick<
  PostgrestError,
  "message" | "code" | "details" | "hint"
>;

export function isPostgrestError(error: unknown): error is PostgrestLikeError {
  return (
    error != null &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as PostgrestError).message === "string"
  );
}

/** Table or view missing from PostgREST schema cache (migration not applied). */
export function isMissingTableError(error: unknown): boolean {
  return isPostgrestError(error) && error.code === "PGRST205";
}

/** Column missing because a later additive migration is not applied yet. */
export function isUndefinedColumnError(error: unknown): boolean {
  if (!isPostgrestError(error)) return false;
  if (error.code === "42703") return true;
  return /column .* does not exist/i.test(error.message);
}

export function toRepositoryError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (isPostgrestError(error)) {
    const err = new Error(error.message);
    err.name = error.code ?? "PostgrestError";
    return err;
  }
  return new Error(String(error));
}
