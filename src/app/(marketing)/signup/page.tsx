import Link from "next/link";
import { AuthSplit } from "@/components/app/auth-split";
import { SignupRolePicker } from "@/components/app/auth/signup-role-picker";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export const metadata = {
  title: "Create your account — Wanzwei",
};

type SearchParams = Promise<{
  role?: string;
  error?: string;
}>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { role: roleParam, error } = await searchParams;
  const role = roleParam === "facility" ? "facility" : "professional";

  return (
    <AuthSplit>
      <div>
        <h2 className="text-[26px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          Create your account
        </h2>
        <p className="mt-1.5 text-[14px] text-[color:var(--color-ink-500)]">
          Join Wanzwei in under a minute. No credit card required.
        </p>
      </div>

      <form
        action="/api/auth/signup"
        method="post"
        className="mt-7 flex flex-col gap-3.5"
      >
        <div>
          <Label>I&apos;m joining as</Label>
          <SignupRolePicker defaultRole={role} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" placeholder="Tinashe Moyo" required />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@hospital.co.zw"
            required
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </div>

        {error === "exists" ? (
          <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
            An account with that email already exists.
          </p>
        ) : null}
        {error === "missing" ? (
          <p className="rounded-[var(--radius-sm)] bg-rose-50 px-3 py-2 text-[12.5px] text-[color:var(--color-danger-700)]">
            Please fill in all fields.
          </p>
        ) : null}

        <Button type="submit" size="lg" className="mt-1 w-full">
          Create account
        </Button>

        <p className="mt-1 text-center text-[12px] text-[color:var(--color-ink-400)]">
          By continuing you agree to our{" "}
          <Link href="/terms" className="underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="mt-2 text-center text-[13px] text-[color:var(--color-ink-500)]">
          Already have an account?{" "}
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
