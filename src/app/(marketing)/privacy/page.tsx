import Link from "next/link";
import { Logo } from "@/components/app/logo";

export const metadata = {
  title: "Privacy Policy — Wanzwei",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
      <Link href="/" className="mb-8 inline-flex">
        <Logo tone="dark" size={30} />
      </Link>
      <h1 className="text-[26px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
        Privacy Policy
      </h1>
      <p className="mt-2 text-[13px] text-[color:var(--color-ink-400)]">
        Last updated: 1 September 2026. This is a baseline policy for the
        Wanzwei platform. It is not legal advice and has not been approved by
        counsel.
      </p>

      <div className="mt-6 space-y-5 text-[14px] leading-relaxed text-[color:var(--color-ink-600)]">
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Who we are
          </h2>
          <p className="mt-2">
            Wanzwei is a healthcare workforce platform (“the platform”, “the
            service”). This policy describes how the service processes
            information when you create an account, apply for roles, hire, or
            operate a facility on the platform.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Information we process
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Account and profile information, such as name, email, role, and organisation details you provide.</li>
            <li>Professional credential information you submit for verification, including registering body and registration number.</li>
            <li>Facility information, including organisation name, type, location, and verification status.</li>
            <li>Job and application information, including postings, applications, and hiring-status updates.</li>
            <li>Documents you upload, such as identity or credential files stored in private storage.</li>
            <li>Authentication data processed by our identity provider, including sign-in events and recovery requests.</li>
            <li>Operational and security logs needed to run, protect, and debug the service.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Why we process it
          </h2>
          <p className="mt-2">
            We process this information to create and secure accounts, connect
            professionals with facilities, run verification and hiring
            workflows, communicate about your use of the service, prevent
            abuse, and comply with legal obligations that apply to the
            operator of the platform.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Service providers
          </h2>
          <p className="mt-2">
            The platform uses infrastructure and software providers to host
            the application, store data, authenticate users, and (when
            configured) send transactional email. Those providers process
            information only as needed to operate the service.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Security and retention
          </h2>
          <p className="mt-2">
            We use access controls, encrypted transport, and private document
            storage to protect information. We retain account, verification,
            job, and application records for as long as needed to provide the
            service and keep an audit trail, unless a longer or shorter period
            is required.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Your choices
          </h2>
          <p className="mt-2">
            You can update profile fields the product allows you to edit. You
            cannot self-assign roles, verification status, or facility
            ownership. To request access, correction, or deletion where the
            product does not already provide it, contact the platform operator
            through the Wanzwei application.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Contact and legal review
          </h2>
          <p className="mt-2">
            Until a dedicated privacy contact, registered office, and
            jurisdiction statement are published after legal review, contact
            the platform operator through the signed-in Wanzwei application at{" "}
            <a
              href="https://wanzwei.vercel.app"
              className="font-medium text-[color:var(--color-brand-600)] hover:underline"
            >
              https://wanzwei.vercel.app
            </a>
            . Do not treat this baseline as a complete regulatory notice.
          </p>
        </section>
      </div>

      <p className="mt-8 text-[13px]">
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
