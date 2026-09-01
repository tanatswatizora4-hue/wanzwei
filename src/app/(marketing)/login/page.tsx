import Link from "next/link";
import { AuthSplit } from "@/components/app/auth-split";
import { AuthDivider } from "@/components/app/auth/auth-divider";
import { GoogleSignInButton } from "@/components/app/auth/google-sign-in-button";
import { ResendConfirmationForm } from "@/components/app/auth/resend-confirmation-form";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export const metadata = {
  title: "Sign in — Wanzwei",
};

type SearchParams = Promise<{
  error?: string;
  email?: string;
  next?: string;
  "check-email"?: string;
  "reset-email"?: string;
  "verification-email"?: string;
  "password-updated"?: string;
  verified?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const {
    error,
    email,
    next,
    "check-email": checkEmail,
    "reset-email": resetEmail,
    "verification-email": verificationEmail,
    "password-updated": passwordUpdated,
    verified,
  } = await searchParams;

  return (
    <AuthSplit>
      <div>
        <h2 className="text-[26px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          Welcome back
        </h2>
        <p className="mt-1.5 text-[14px] text-[color:var(--color-ink-500)]">
          Sign in to your Wanzwei account to continue.
        </p>
      </div>

      <div className="mt-7 flex flex-col gap-3.5">
        <GoogleSignInButton next={next} />

        <AuthDivider />

        {error === "unconfirmed" ? (
          <div className="rounded-[var(--radius-sm)] bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800">
            <p>You need to confirm your email before signing in.</p>
            <ResendConfirmationForm email={email} />
          </div>
        ) : null}
        {checkEmail === "1" ? (
          <div className="rounded-[var(--radius-sm)] bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
            <p>Check your email to verify your account before signing in.</p>
            <ResendConfirmationForm email={email} />
          </div>
        ) : null}

        <form action="/api/auth/login" method="post" className="flex flex-col gap-3.5">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <div className="grid gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@hospital.co.zw"
            defaultValue={email}
            required
          />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-[12px] font-medium text-[color:var(--color-brand-600)] hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            required
          />
        </div>

        {error === "google" ? (
          <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
            Google sign-in is unavailable. Check Supabase Google OAuth settings
            and try again.
          </p>
        ) : null}
        {error === "auth_callback" ? (
          <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
            Sign-in link expired or is invalid. Request a new verification or
            reset email and try again.
          </p>
        ) : null}
        {error === "link_used_or_expired" ? (
          <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
            This verification link has already been used or has expired. If you
            already confirmed your email, sign in with your password.
          </p>
        ) : null}
        {error === "rate_limited" ? (
          <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
            Too many requests. Please try again later.
          </p>
        ) : null}
        {error === "invalid" ? (
          <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
            Invalid email or password.
          </p>
        ) : null}
        {error === "unavailable" ? (
          <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
            Sign-in is temporarily unavailable. Please try again in a moment.
          </p>
        ) : null}
        {error === "no_role" ? (
          <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
            This account is not set up for sign-in. Contact support if you need
            help.
          </p>
        ) : null}
        {error === "db_not_configured" ? (
          <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
            Sign-in is temporarily unavailable. Please try again later.
          </p>
        ) : null}
        {error === "profile_missing" ? (
          <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
            We couldn&apos;t sign you in. Please try again. If this keeps
            happening, contact support.
          </p>
        ) : null}
        {resetEmail === "1" ? (
          <p className="rounded-[var(--radius-sm)] bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
            If an account exists, a password reset email is on the way.
          </p>
        ) : null}
        {passwordUpdated === "1" ? (
          <p className="rounded-[var(--radius-sm)] bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
            Your password was updated. Sign in with your new password.
          </p>
        ) : null}
        {verificationEmail === "1" ? (
          <p className="rounded-[var(--radius-sm)] bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
            If an account exists, a verification email is on the way.
          </p>
        ) : null}
        {verified === "1" ? (
          <p className="rounded-[var(--radius-sm)] bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-700">
            Email verified. You can sign in now.
          </p>
        ) : null}

        <Button type="submit" size="lg" className="mt-2 w-full">
          Continue
        </Button>

        <p className="mt-2 text-center text-[13px] text-[color:var(--color-ink-500)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-[color:var(--color-brand-600)] hover:underline"
          >
            Create one
          </Link>
        </p>
        </form>
      </div>
    </AuthSplit>
  );
}
