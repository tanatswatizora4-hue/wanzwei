import Link from "next/link";
import { Logo } from "@/components/app/logo";

export const metadata = {
  title: "Privacy Policy — Wanzwei",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-6 py-12">
      <Link href="/" className="mb-8 inline-flex">
        <Logo tone="dark" size={30} />
      </Link>
      <h1 className="text-[26px] font-semibold tracking-tight text-[color:var(--color-ink-900)]">
        Privacy Policy
      </h1>
      <p className="mt-4 text-[14px] leading-relaxed text-[color:var(--color-ink-500)]">
        Placeholder privacy policy for the Wanzwei private beta. A complete
        policy will be published before general availability.
      </p>
      <p className="mt-6 text-[13px]">
        <Link
          href="/signup"
          className="font-medium text-[color:var(--color-brand-600)] hover:underline"
        >
          Back to sign up
        </Link>
      </p>
    </div>
  );
}
