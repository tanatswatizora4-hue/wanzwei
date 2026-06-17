import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "./logo";


const features = [
  "10,000+ verified healthcare professionals",
  "ZW-wide network of clinics, hospitals & pharmacies",
  "CPD-tracked, credential-verified, fast to hire",
];

export function AuthSplit({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-10 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 80% at 0% 0%, #6f5ef0 0%, #4a37c0 38%, #251a83 75%, #120c4d 100%)",
            }}
          />
          <div
            className="absolute -top-32 -left-24 h-[460px] w-[460px] rounded-full opacity-60 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(167,155,255,0.55) 0%, transparent 60%)",
            }}
          />
          <div
            className="absolute -bottom-40 -right-24 h-[420px] w-[420px] rounded-full opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(255,153,235,0.45) 0%, transparent 60%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
              backgroundSize: "26px 26px",
            }}
          />
        </div>

        <div className="relative">
          <Link href="/" className="inline-flex">
            <Logo tone="dark" size={32} />
          </Link>
        </div>

        <div className="relative max-w-md">
          <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-white/70">
            Healthcare workforce platform
          </p>
          <h1 className="mt-3 font-display text-[44px] font-bold leading-[1.05] tracking-[-0.02em]">
            Hire trusted healthcare talent — faster.
          </h1>
          <p className="mt-4 text-[15px] text-white/75 leading-relaxed">
            One platform for locum, contract, and permanent hiring across Zimbabwe&apos;s
            best clinics, hospitals and pharmacies.
          </p>
          <ul className="mt-7 flex flex-col gap-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[14px] text-white/85">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-white" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center justify-between text-[12px] text-white/55">
          <p>© {new Date().getFullYear()} Wanzwei Health Inc.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-white">
              Back to site
            </Link>
            <Link href="#" className="hover:text-white">
              Privacy
            </Link>
            <Link href="#" className="hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </aside>

      <section className="relative flex min-h-screen items-center justify-center px-6 py-10 lg:py-14">
        <div className="w-full max-w-[440px]">
          <Link
            href="/"
            className="mb-8 inline-flex lg:hidden items-center gap-2"
          >
            <Logo />
          </Link>
          <div className="glass glass-highlight rounded-[var(--radius-lg)] p-7 sm:p-8">
            {children}
          </div>
        </div>
      </section>
    </div>
  );
}
