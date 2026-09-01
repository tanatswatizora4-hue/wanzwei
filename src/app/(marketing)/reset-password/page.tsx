import Link from "next/link";

import { AuthSplit } from "@/components/app/auth-split";
import { ResetPasswordForm } from "@/app/(marketing)/reset-password/reset-password-form";
import { PASSWORD_RESET_PUBLIC_ERRORS } from "@/lib/auth/password-reset-errors";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata = {
  title: "Choose a new password — Wanzwei",
};

export default async function ResetPasswordPage() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthSplit>
      <div>
        <h2 className="text-[26px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          Choose a new password
        </h2>
        <p className="mt-1.5 text-[14px] text-[color:var(--color-ink-500)]">
          Enter a new password for your Wanzwei account.
        </p>
      </div>

      {user ? (
        <ResetPasswordForm />
      ) : (
        <div className="mt-7 flex flex-col gap-3.5">
          <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
            {PASSWORD_RESET_PUBLIC_ERRORS.missingSession}
          </p>
          <p className="text-center text-[13px] text-[color:var(--color-ink-500)]">
            <Link
              href="/forgot-password"
              className="font-medium text-[color:var(--color-brand-600)] hover:underline"
            >
              Request a new reset link
            </Link>
            {" · "}
            <Link
              href="/login"
              className="font-medium text-[color:var(--color-brand-600)] hover:underline"
            >
              Sign in
            </Link>
          </p>
        </div>
      )}
    </AuthSplit>
  );
}
