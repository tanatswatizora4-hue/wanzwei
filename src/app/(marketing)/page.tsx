import Link from "next/link";
import {
  ShieldCheck,
  Briefcase,
  Users,
  Siren,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      <MarketingNav />
      <Hero />
      <CapabilityStrip />
      <Features />
      <ProductPreview />
      <FinalCTA />
      <MarketingFooter />
    </div>
  );
}

function MarketingNav() {
  return (
    <header className="glass-bar sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-6xl min-w-0 items-center gap-2 px-4 sm:gap-6 sm:px-6">
        <Link href="/" className="flex min-w-0 shrink-0 items-center">
          <Logo showTagline={false} className="md:hidden" />
          <Logo className="hidden md:flex" />
        </Link>
        <nav className="ml-6 hidden md:flex items-center gap-5 text-[13.5px] text-[color:var(--color-ink-500)]">
          <Link href="#features" className="hover:text-[color:var(--color-ink-900)]">
            Product
          </Link>
          <Link href="#facilities" className="hover:text-[color:var(--color-ink-900)]">
            For facilities
          </Link>
          <Link
            href="#professionals"
            className="hover:text-[color:var(--color-ink-900)]"
          >
            For professionals
          </Link>
        </nav>
        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" asChild className="h-8 min-h-8 px-2.5">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild className="h-8 min-h-8 px-2.5">
            <Link href="/signup">
              Get started
              <ArrowRight className="hidden h-3.5 w-3.5 sm:inline" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 h-[520px] w-[1100px] rounded-full opacity-40 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, #c8c1ff 0%, transparent 60%)",
          }}
        />
        <div className="absolute inset-0 grid-bg opacity-50" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 lg:pt-24 lg:pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="brand" className="px-2.5 py-1 text-[11.5px]">
            Healthcare workforce platform
          </Badge>
          <h1 className="mt-5 font-display text-[32px] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[44px] lg:text-[60px] lg:leading-[1.02]">
            Hire trusted healthcare{" "}
            <span className="text-pop">talent — faster.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-[color:var(--color-ink-500)]">
            Wanzwei connects healthcare professionals with facilities for locum,
            contract, and permanent roles. Submit credentials for review, browse
            jobs, manage applications, and oversee hiring from one platform.
          </p>

          <div className="mt-7 flex w-full min-w-0 flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
            <Button size="lg" asChild className="w-full sm:w-auto">
              <Link href="/signup?role=professional">
                Join as Professional
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild className="w-full sm:w-auto">
              <Link href="/signup?role=facility">Join as Facility</Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="w-full sm:w-auto">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-[color:var(--color-ink-500)]">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Email and password accounts
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              HPA credential review
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Facility hiring pipeline
            </span>
          </div>
        </div>

        <HeroPreview />
      </div>
    </section>
  );
}

function HeroPreview() {
  const stages = [
    "Under Review",
    "Screening",
    "Shortlisted",
    "Interview",
    "Offer",
    "Hired",
  ];
  return (
    <div className="relative mx-auto mt-12 max-w-5xl">
      <div
        aria-hidden
        className="absolute -inset-x-12 -top-10 -bottom-10 -z-10 rounded-[40px] opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(80% 60% at 50% 0%, rgba(139,122,251,0.45), transparent 70%)",
        }}
      />
      <div className="glass glass-highlight rounded-[20px] p-2.5 shadow-[var(--shadow-lg)]">
        <div className="rounded-[14px] bg-white/70 backdrop-blur p-5 ring-1 ring-white/60">
          <p className="text-[13.5px] font-semibold">What ships today</p>
          <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-500)]">
            Live product surfaces — not sample metrics or upcoming modules.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "Credential review",
                body: "Professionals submit HPA details for automated checks and admin verification.",
              },
              {
                title: "Jobs and applications",
                body: "Browse roles, apply when verified, and track status in one place.",
              },
              {
                title: "Facility hiring",
                body: "Post jobs, review applicants, and move candidates through a real pipeline.",
              },
              {
                title: "Admin oversight",
                body: "Verification queue, users, facilities, jobs, applications, and emergency alerts.",
              },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-white p-4"
              >
                <p className="text-[13px] font-semibold">{item.title}</p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[color:var(--color-ink-500)]">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-white p-4">
            <p className="text-[12.5px] font-semibold">Application pipeline</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {stages.map((stage) => (
                <span
                  key={stage}
                  className="rounded-full border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)] px-2.5 py-1 text-[11.5px] font-medium text-[color:var(--color-ink-700)]"
                >
                  {stage}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CapabilityStrip() {
  return (
    <section className="border-y border-[color:var(--color-border-default)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <p className="text-center text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-ink-400)]">
          Built for hospitals, clinics, and pharmacies in Zimbabwe
        </p>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Credential verification",
    body: "Professionals submit registration details. Wanzwei checks available register data and supports admin review. Verification is not a licence or a guarantee of competence.",
    bg: "bg-violet-50 text-violet-600",
  },
  {
    icon: <Briefcase className="h-5 w-5" />,
    title: "Jobs and applications",
    body: "Facilities post roles. Verified professionals apply. Both sides see the same hiring status as it changes.",
    bg: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Hiring pipeline",
    body: "Facilities move applicants through Under Review, Screening, Shortlisted, Interview, Offer, and Hired.",
    bg: "bg-amber-50 text-amber-600",
  },
  {
    icon: <Siren className="h-5 w-5" />,
    title: "Emergency locum alerts",
    body: "Facilities can send locum alerts to verified professionals who match the role. Unverified accounts cannot accept.",
    bg: "bg-sky-50 text-sky-600",
  },
];

function Features() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20" id="features">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-brand-600)]">
          Why Wanzwei
        </p>
        <h2 className="mt-3 font-display text-[32px] sm:text-[38px] font-bold leading-tight tracking-[-0.015em]">
          Hiring tools that actually exist.
        </h2>
        <p className="mt-3 text-[15px] text-[color:var(--color-ink-500)]">
          Credential review, job applications, facility hiring, emergency locum
          alerts, and admin oversight — without claiming modules that are not
          in this release.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <article key={f.title} className="card card-hover relative p-5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] ${f.bg}`}
            >
              {f.icon}
            </div>
            <h3 className="mt-4 text-[15px] font-semibold tracking-tight">
              {f.title}
            </h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[color:var(--color-ink-500)]">
              {f.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductPreview() {
  return (
    <section
      id="professionals"
      className="bg-white border-y border-[color:var(--color-border-default)]"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div>
          <Badge tone="brand">For professionals</Badge>
          <h2 className="mt-3 font-display text-[30px] sm:text-[34px] font-bold leading-tight tracking-[-0.015em]">
            One account. Real hiring steps.
          </h2>
          <p className="mt-3 text-[15px] text-[color:var(--color-ink-500)]">
            Create a professional account, submit HPA credentials, browse jobs,
            and track applications after you are verified.
          </p>
          <ul className="mt-5 grid gap-2.5 text-[13.5px] text-[color:var(--color-ink-700)]">
            {[
              "Email signup, confirmation, and password sign-in",
              "HPA credential submission and verification status",
              "Job browsing, saved jobs, and applications",
              "Document uploads for your profile",
            ].map((l) => (
              <li key={l} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500" />
                {l}
              </li>
            ))}
          </ul>
          <Button className="mt-6" asChild>
            <Link href="/signup?role=professional">
              Create professional account <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="card p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
            Professional workflow
          </p>
          <ol className="mt-3 grid gap-3">
            {[
              "Create an account and confirm your email",
              "Submit HPA registration details for review",
              "Browse open jobs while verification is pending",
              "Apply after your account is verified",
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-50)] text-[11px] font-semibold text-[color:var(--color-brand-700)]">
                  {index + 1}
                </span>
                <span className="text-[13px] text-[color:var(--color-ink-700)]">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
      <div
        id="facilities"
        className="mx-auto grid max-w-6xl gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:pb-20"
      >
        <div className="card p-5 lg:order-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
            Facility workflow
          </p>
          <ol className="mt-3 grid gap-3">
            {[
              "Create a facility account for your organisation",
              "Post roles and review applicants",
              "Move applications through the hiring pipeline",
              "Send emergency locum alerts when cover is urgent",
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-brand-50)] text-[11px] font-semibold text-[color:var(--color-brand-700)]">
                  {index + 1}
                </span>
                <span className="text-[13px] text-[color:var(--color-ink-700)]">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="lg:order-2">
          <Badge tone="brand">For facilities</Badge>
          <h2 className="mt-3 font-display text-[30px] sm:text-[34px] font-bold leading-tight tracking-[-0.015em]">
            Post roles. Review applicants.
          </h2>
          <p className="mt-3 text-[15px] text-[color:var(--color-ink-500)]">
            Facilities manage their own jobs and applications. Status changes
            persist in the product. Hiring decisions remain yours.
          </p>
          <ul className="mt-5 grid gap-2.5 text-[13.5px] text-[color:var(--color-ink-700)]">
            {[
              "Organisation profile and job posting",
              "Applicant review for your own roles",
              "Canonical hiring statuses through Hired",
              "Emergency locum alerts to verified professionals",
            ].map((l) => (
              <li key={l} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500" />
                {l}
              </li>
            ))}
          </ul>
          <Button className="mt-6" asChild>
            <Link href="/signup?role=facility">
              Create facility account <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-4 pb-16 pt-16 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[20px] p-6 text-white sm:p-10 lg:p-14">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(80% 100% at 0% 0%, #6f5ef0 0%, #4a37c0 50%, #251a83 100%)",
          }}
        />
        <div
          className="absolute inset-0 -z-10 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.55) 1px, transparent 0)",
            backgroundSize: "26px 26px",
          }}
        />
        <div className="max-w-2xl">
          <h2 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em] sm:text-[36px] lg:text-[44px]">
            Ready to hire or apply?
          </h2>
          <p className="mt-3 text-[15px] text-white/85">
            Create a professional or facility account and use the hiring tools
            that are live on Wanzwei today.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/signup?role=professional">
                Join as Professional <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="ghost"
              className="text-white hover:bg-white/10"
              asChild
            >
              <Link href="/signup?role=facility">Join as Facility</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-[color:var(--color-border-default)] bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-3 max-w-xs text-[13px] text-[color:var(--color-ink-500)]">
            Wanzwei is a healthcare workforce platform connecting professionals
            with facilities for hiring and locum cover.
          </p>
        </div>
        <FooterCol
          title="Product"
          items={[
            { label: "Professionals", href: "/signup?role=professional" },
            { label: "Facilities", href: "/signup?role=facility" },
            { label: "Sign in", href: "/login" },
          ]}
        />
        <FooterCol
          title="Legal"
          items={[
            { label: "Privacy", href: "/privacy" },
            { label: "Terms", href: "/terms" },
          ]}
        />
      </div>
      <div className="border-t border-[color:var(--color-border-default)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4 text-[11.5px] text-[color:var(--color-ink-400)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Wanzwei. All rights reserved.</p>
          <p>Made with care in Harare.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: Array<{ label: string; href: string }>;
}) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-700)]">
        {title}
      </p>
      <ul className="mt-3 flex flex-col gap-2 text-[13px] text-[color:var(--color-ink-500)]">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="hover:text-[color:var(--color-ink-900)]"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
