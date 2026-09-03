import Link from "next/link";
import { Logo } from "@/components/app/logo";

export const metadata = {
  title: "Account deletion — Wanzwei",
};

export default function AccountDeletionPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-6 py-12">
      <Link href="/" className="mb-8 inline-flex">
        <Logo tone="dark" size={30} />
      </Link>
      <h1 className="text-[26px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
        Delete a Wanzwei account
      </h1>
      <p className="mt-2 text-[13px] text-[color:var(--color-ink-400)]">
        Last updated: 1 September 2026. This page describes how account
        deletion works in the current product. It is not legal advice.
      </p>

      <div className="mt-6 space-y-5 text-[14px] leading-relaxed text-[color:var(--color-ink-600)]">
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            How to delete your account
          </h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Sign in at https://wanzwei.vercel.app</li>
            <li>Open Settings, then Security</li>
            <li>Choose Delete account</li>
            <li>
              Confirm with your email, type DELETE, and re-enter your password
              if your account uses email sign-in
            </li>
          </ol>
          <p className="mt-3">
            Direct links:{" "}
            <Link
              href="/professional/settings"
              className="font-medium text-[color:var(--color-brand-600)] hover:underline"
            >
              professional settings
            </Link>
            ,{" "}
            <Link
              href="/facility/settings"
              className="font-medium text-[color:var(--color-brand-600)] hover:underline"
            >
              facility settings
            </Link>
            , or{" "}
            <Link
              href="/admin/settings"
              className="font-medium text-[color:var(--color-brand-600)] hover:underline"
            >
              admin settings
            </Link>
            . Unauthenticated requests are sent to sign-in first.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            What deletion does
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Ends the sign-in session and removes the Auth user.</li>
            <li>
              Anonymizes the profile (name, email, location, credentials on the
              user record, avatar).
            </li>
            <li>Removes personal saved jobs, notifications, and non-audit uploads.</li>
            <li>
              Does not hard-delete job applications, hiring records, or
              verification audit records, because no counsel-approved retention
              schedule exists yet.
            </li>
            <li>
              Does not delete a facility organisation or its job listings when a
              facility user closes their own account.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            If you cannot sign in
          </h2>
          <p className="mt-2">
            Use Forgot password, then complete deletion from Settings after you
            regain access. Do not send account credentials to an informal inbox
            to request deletion.
          </p>
        </section>
      </div>

      <p className="mt-8 text-[13px]">
        <Link
          href="/privacy"
          className="font-medium text-[color:var(--color-brand-600)] hover:underline"
        >
          Privacy Policy
        </Link>
        {" · "}
        <Link
          href="/"
          className="font-medium text-[color:var(--color-brand-600)] hover:underline"
        >
          Back to home
        </Link>
      </p>
    </div>
  );
}
