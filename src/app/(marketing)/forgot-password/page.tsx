import Link from "next/link";
import { AuthSplit } from "@/components/app/auth-split";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export const metadata = {
  title: "Reset password — Wanzwei",
};

type SearchParams = Promise<{
  email?: string;
  error?: string;
}>;

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { email, error } = await searchParams;

  return (
    <AuthSplit>
      <div>
        <h2 className="text-[26px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          Reset your password
        </h2>
        <p className="mt-1.5 text-[14px] text-[color:var(--color-ink-500)]">
          Enter your email and we&apos;ll send a reset link if an account exists.
        </p>
      </div>

      <form
        action="/api/auth/password-reset"
        method="post"
        className="mt-7 flex flex-col gap-3.5"
      >
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

        {error === "invalid_email" ? (
          <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
            Enter a valid email address.
          </p>
        ) : null}
        {error === "rate_limited" ? (
          <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
            Too many requests. Please try again later.
          </p>
        ) : null}

        <Button type="submit" size="lg" className="mt-2 w-full">
          Send reset link
        </Button>

        <p className="mt-2 text-center text-[13px] text-[color:var(--color-ink-500)]">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-medium text-[color:var(--color-brand-600)] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthSplit>
  );
}
