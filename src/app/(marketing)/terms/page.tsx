import Link from "next/link";
import { Logo } from "@/components/app/logo";

export const metadata = {
  title: "Terms of Use — Wanzwei",
};

export default function TermsPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-12">
      <Link href="/" className="mb-8 inline-flex">
        <Logo tone="dark" size={30} />
      </Link>
      <h1 className="text-[26px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
        Terms of Use
      </h1>
      <p className="mt-2 text-[13px] text-[color:var(--color-ink-400)]">
        Last updated: 1 September 2026. These are baseline terms for using
        Wanzwei. They are not legal advice and have not been approved by
        counsel.
      </p>

      <div className="mt-6 space-y-5 text-[14px] leading-relaxed text-[color:var(--color-ink-600)]">
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            The service
          </h2>
          <p className="mt-2">
            Wanzwei is a platform that helps healthcare professionals and
            facilities manage hiring, applications, and related verification
            workflows. Access depends on account type and verification state.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Account responsibilities
          </h2>
          <p className="mt-2">
            You must provide accurate account information, keep credentials
            confidential, and use only the role assigned to your account.
            You may not attempt to change your role, verification status, or
            facility ownership except through the platform’s authorised
            processes.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Professional credentials
          </h2>
          <p className="mt-2">
            Professionals are responsible for the accuracy of registration
            numbers and related credential information. Submitting another
            person’s registration number, or a fabricated number intended to
            impersonate a real practitioner, is prohibited.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Facilities, jobs, and applications
          </h2>
          <p className="mt-2">
            Facilities are responsible for job postings, applicant handling,
            and organisation details they publish. Facilities may only access
            and update applications for their own jobs. Hiring decisions
            remain the facility’s responsibility.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Verification limitations
          </h2>
          <p className="mt-2">
            Platform verification checks submitted credentials against
            available register data and authorised review. It is not a
            licence, a regulator approval, or a guarantee of competence,
            employment, or clinical outcomes.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Prohibited misuse
          </h2>
          <p className="mt-2">
            You may not scrape or attack the service, bypass access controls,
            upload malware, harass other users, or use the platform to
            misrepresent professional or facility identity.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Availability, IP, and termination
          </h2>
          <p className="mt-2">
            The platform may change, be interrupted, or be withdrawn. Wanzwei
            and its licensors retain intellectual property in the service.
            Accounts may be suspended or terminated for misuse, risk, or
            operational need.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Liability and changes
          </h2>
          <p className="mt-2">
            To the fullest extent permitted by applicable law, the service is
            provided as available and the operator is not liable for hiring
            outcomes, clinical decisions, or losses caused by inaccurate
            user-submitted information. These terms may be updated; continued
            use after an update constitutes acceptance of the revised terms.
          </p>
        </section>
        <section>
          <h2 className="text-[16px] font-semibold text-[color:var(--color-ink-900)]">
            Contact and legal review
          </h2>
          <p className="mt-2">
            Governing-law, entity, and notice details will be published after
            legal review. Until then, contact the platform operator through
            the signed-in Wanzwei application at{" "}
            <a
              href="https://wanzwei.vercel.app"
              className="font-medium text-[color:var(--color-brand-600)] hover:underline"
            >
              https://wanzwei.vercel.app
            </a>
            .
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
