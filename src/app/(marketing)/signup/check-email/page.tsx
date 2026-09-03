import Link from "next/link";
import { AuthSplit } from "@/components/app/auth-split";
import { ResendConfirmationForm } from "@/components/app/auth/resend-confirmation-form";
import { displayableSignupEmail } from "@/lib/auth/signup-session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Check your email — Wanzwei",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  email?: string;
  sent?: string;
}>;

export default async function SignupCheckEmailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const email = displayableSignupEmail(params.email);

  return (
    <AuthSplit>
      <div>
        <h2 className="text-[26px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          Check your email
        </h2>
        <p className="mt-1.5 text-[14px] text-[color:var(--color-ink-500)]">
          Check your email to verify your account before signing in.
        </p>
      </div>

      <div className="mt-7 flex flex-col gap-3.5">
        {params.sent === "1" ? (
          <p className="rounded-[var(--radius-sm)] bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
            If an account exists, a verification email is on the way.
          </p>
        ) : null}

        <p className="text-[14px] text-[color:var(--color-ink-600)]">
          {email ? (
            <>
              We sent a confirmation link to{" "}
              <span className="font-medium text-[color:var(--color-ink-900)]">
                {email}
              </span>
              . Open that message, then click Confirm email. Opening the link
              does not verify the account by itself.
            </>
          ) : (
            <>
              We sent a confirmation link to the address you used. Open that
              message, then click Confirm email. Opening the link does not
              verify the account by itself.
            </>
          )}
        </p>

        <ResendConfirmationForm
          email={email ?? undefined}
          next="/signup/check-email"
        />

        <p className="mt-2 text-center text-[13px] text-[color:var(--color-ink-500)]">
          Already confirmed?{" "}
          <Link
            href={email ? `/login?email=${encodeURIComponent(email)}` : "/login"}
            prefetch={false}
            className="font-medium text-[color:var(--color-brand-600)] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplit>
  );
}
