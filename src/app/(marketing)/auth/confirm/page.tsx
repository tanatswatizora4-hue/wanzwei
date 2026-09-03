import { confirmEmailAction } from "@/app/(marketing)/auth/confirm/actions";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { parseConfirmEmailParams } from "@/lib/auth/confirm-email";
import { logAuthEvent, logAuthWarn } from "@/lib/observability/auth-log";
import { runWithRequestLog } from "@/lib/observability/request-context";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Confirm your email — Wanzwei",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{
  token_hash?: string;
  type?: string;
  code?: string;
  next?: string;
}>;

export default async function ConfirmEmailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const requestId = crypto.randomUUID();
  const params = await searchParams;
  return runWithRequestLog({ requestId, route: "/auth/confirm" }, () =>
    renderConfirmEmailPage(params),
  );
}

function renderConfirmEmailPage(params: {
  token_hash?: string;
  type?: string;
  code?: string;
  next?: string;
}) {
  const parsed = parseConfirmEmailParams({
    tokenHash: params.token_hash,
    type: params.type,
    code: params.code,
    next: params.next,
  });

  if (parsed.kind === "missing" || parsed.kind === "malformed") {
    logAuthWarn("auth.confirmation.invalid", { reason: parsed.kind });
    return (
      <ConfirmShell>
        <h1 className="text-[26px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
          This confirmation link is not valid
        </h1>
        <p className="mt-2 text-[14px] text-[color:var(--color-ink-500)]">
          Request a new confirmation or reset email, then use the button in
          that message. This page does not confirm an account by being opened.
        </p>
        <p className="mt-6">
          <Link
            href="/login"
            prefetch={false}
            className="font-medium text-[color:var(--color-brand-600)] hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </ConfirmShell>
    );
  }

  const isRecovery = parsed.kind === "otp" && parsed.type === "recovery";
  logAuthEvent("auth.confirmation.landing", {
    kind: parsed.kind,
    confirm_type: parsed.kind === "otp" ? parsed.type : undefined,
  });
  if (isRecovery) {
    logAuthEvent("auth.recovery.callback");
  }

  return (
    <ConfirmShell>
      <h1 className="text-[26px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
        {isRecovery ? "Continue password reset" : "Confirm your email"}
      </h1>
      <p className="mt-2 text-[14px] text-[color:var(--color-ink-500)]">
        {isRecovery
          ? "Click the button below to continue. Opening this page does not reset your password."
          : "Click the button below to confirm this email address. Opening this page does not confirm the account."}
      </p>
      <form action={confirmEmailAction} method="post" className="mt-6">
        {parsed.kind === "otp" ? (
          <>
            <input type="hidden" name="token_hash" value={parsed.tokenHash} />
            <input type="hidden" name="type" value={parsed.type} />
          </>
        ) : (
          <input type="hidden" name="code" value={parsed.code} />
        )}
        {parsed.next ? (
          <input type="hidden" name="next" value={parsed.next} />
        ) : null}
        <Button type="submit" size="lg" className="min-h-11 w-full">
          {isRecovery ? "Continue" : "Confirm email"}
        </Button>
      </form>
    </ConfirmShell>
  );
}

function ConfirmShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-12 sm:px-6">
      <Link href="/" prefetch={false} className="mb-8 inline-flex">
        <Logo tone="dark" size={30} />
      </Link>
      {children}
    </div>
  );
}
