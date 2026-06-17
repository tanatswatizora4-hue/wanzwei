import Link from "next/link";
import {
  ShieldCheck,
  Sparkles,
  GraduationCap,
  Store,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Logo } from "@/components/app/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FacilityLogo } from "@/components/ui/avatar";
import { StatCard } from "@/components/app/stat-card";
import {
  marketingFacilityById,
  marketingJobs,
} from "@/lib/marketing-sample-data";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen">
      <MarketingNav />
      <Hero />
      <LogoStrip />
      <Features />
      <ProductPreview />
      <SocialProof />
      <FinalCTA />
      <MarketingFooter />
    </div>
  );
}

function MarketingNav() {
  return (
    <header className="glass-bar sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-6">
        <Link href="/" className="flex items-center">
          <Logo />
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
          <Link href="#cpd" className="hover:text-[color:var(--color-ink-900)]">
            CPD
          </Link>
          <Link
            href="#marketplace"
            className="hover:text-[color:var(--color-ink-900)]"
          >
            Marketplace
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/signup">
              Get started
              <ArrowRight className="h-3.5 w-3.5" />
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

      <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-12 lg:pt-24 lg:pb-16">
        <div className="mx-auto max-w-3xl text-center">
          <Badge tone="brand" className="px-2.5 py-1 text-[11.5px]">
            <Sparkles className="h-3 w-3" />
            Built for Zimbabwe&apos;s healthcare workforce
          </Badge>
          <h1 className="mt-5 font-display text-[44px] sm:text-[60px] font-bold leading-[1.02] tracking-[-0.02em]">
            Hire trusted healthcare{" "}
            <span className="text-pop">talent — faster.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-[16px] leading-relaxed text-[color:var(--color-ink-500)]">
            Wanzwei connects healthcare professionals with verified facilities for
            locum, contract and permanent roles — with CPD tracking, credential
            verification and a healthcare marketplace built in.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/signup?role=professional">
                Join as Professional
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/signup?role=facility">Join as Facility</Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-[color:var(--color-ink-500)]">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              No credit card required
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              SOC 2 ready
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              HPCSA & MCDZ compatible
            </span>
          </div>
        </div>

        <HeroMock />
      </div>
    </section>
  );
}

function HeroMock() {
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
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  accent="violet"
                  label="Open Jobs"
                  value="124"
                  delta={8}
                  trend={[88, 92, 95, 100, 104, 108, 112, 114, 118, 120, 122, 124]}
                />
                <StatCard
                  accent="emerald"
                  label="Applications"
                  value="42"
                  delta={0}
                  trend={[40, 38, 41, 39, 42, 40, 43, 42, 41, 42, 42, 42]}
                />
                <StatCard
                  accent="sky"
                  label="Matches"
                  value="89"
                  delta={12}
                  trend={[60, 64, 68, 72, 74, 78, 80, 82, 84, 86, 88, 89]}
                />
                <StatCard
                  accent="amber"
                  label="CPD Credits"
                  value="15.5"
                  delta={100}
                  deltaLabel="of 30 target"
                  trend={[2, 3, 5, 7, 8, 10, 11, 12, 13, 14, 15, 15.5]}
                />
              </div>

              <div className="mt-4 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-white p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[13.5px] font-semibold">Recommended Jobs</p>
                  <Link
                    href="/login"
                    className="text-[12px] font-medium text-[color:var(--color-brand-600)] hover:underline"
                  >
                    View all jobs →
                  </Link>
                </div>
                <ul className="mt-1 divide-y divide-[color:var(--color-border-default)]">
                  {marketingJobs.slice(0, 4).map((job) => {
                    const f = marketingFacilityById[job.facilityId]!;
                    return (
                      <li
                        key={job.id}
                        className="flex items-center gap-3 py-2.5"
                      >
                        <FacilityLogo
                          initials={f.initials}
                          gradient={f.logoColor}
                          size={32}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-[color:var(--color-ink-900)]">
                            {job.title}
                          </p>
                          <p className="truncate text-[11.5px] text-[color:var(--color-ink-500)]">
                            {f.name} · {job.location}
                          </p>
                        </div>
                        <Badge tone="emerald" className="hidden sm:inline-flex">
                          {job.type}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-white p-4">
                <p className="text-[13.5px] font-semibold">Upcoming Interviews</p>
                <ul className="mt-2 divide-y divide-[color:var(--color-border-default)]">
                  <li className="flex items-center gap-3 py-2.5">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-[8px] bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
                      <span className="text-[10px] font-medium leading-none">
                        MAY
                      </span>
                      <span className="text-[13px] font-semibold leading-none">
                        14
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold">
                        Clinical Officer Interview
                      </p>
                      <p className="truncate text-[11px] text-[color:var(--color-ink-500)]">
                        Parirenyatwa Group
                      </p>
                    </div>
                    <span className="text-[11px] text-[color:var(--color-ink-400)]">
                      10:00 AM
                    </span>
                  </li>
                  <li className="flex items-center gap-3 py-2.5">
                    <div className="flex h-10 w-10 flex-col items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700">
                      <span className="text-[10px] font-medium leading-none">
                        MAY
                      </span>
                      <span className="text-[13px] font-semibold leading-none">
                        16
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold">
                        Registered Nurse Interview
                      </p>
                      <p className="truncate text-[11px] text-[color:var(--color-ink-500)]">
                        Cure Hospital Harare
                      </p>
                    </div>
                    <span className="text-[11px] text-[color:var(--color-ink-400)]">
                      2:00 PM
                    </span>
                  </li>
                </ul>
              </div>

              <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-gradient-to-br from-[color:var(--color-brand-600)] to-[color:var(--color-brand-900)] p-4 text-white">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-white/15 p-1.5">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-semibold">
                      Stand out to employers
                    </p>
                    <p className="mt-1 text-[12px] text-white/80">
                      Complete your profile and get 3.2× more job matches.
                    </p>
                  </div>
                </div>
                <Link
                  href="/signup"
                  className="mt-3 inline-flex w-fit rounded-[8px] bg-white px-3 py-1.5 text-[12px] font-medium text-[color:var(--color-brand-700)] hover:bg-white/95"
                >
                  Complete profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogoStrip() {
  const logos = [
    "Cure Hospital",
    "Parirenyatwa",
    "Netcare",
    "PathCare",
    "Medradiology",
    "Mater Dei",
    "Baines",
  ];
  return (
    <section className="border-y border-[color:var(--color-border-default)] bg-white">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <p className="text-center text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-ink-400)]">
          Trusted by 200+ facilities and 10,000+ healthcare professionals
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 opacity-70">
          {logos.map((name) => (
            <div
              key={name}
              className="flex items-center gap-2 text-[14px] font-semibold tracking-tight text-[color:var(--color-ink-500)]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-ink-300)]" />
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FEATURES = [
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Verified Professionals",
    body: "Every clinician on Wanzwei is identity-checked, credential-verified and continuously monitored.",
    bg: "bg-violet-50 text-violet-600",
    id: "features",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "Faster Hiring",
    body: "Smart matching, structured pipelines and inline messaging cut average time-to-hire by 64%.",
    bg: "bg-emerald-50 text-emerald-600",
    id: "facilities",
  },
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "CPD Tracking",
    body: "Auto-track CPD credits across providers. Download certificates and meet regulator targets.",
    bg: "bg-amber-50 text-amber-600",
    id: "cpd",
  },
  {
    icon: <Store className="h-5 w-5" />,
    title: "Healthcare Marketplace",
    body: "Buy, sell or lease practices, clinics and equipment via confidential, broker-grade workflows.",
    bg: "bg-sky-50 text-sky-600",
    id: "marketplace",
  },
];

function Features() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20" id="features">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-brand-600)]">
          Why Wanzwei
        </p>
        <h2 className="mt-3 font-display text-[32px] sm:text-[38px] font-bold leading-tight tracking-[-0.015em]">
          Healthcare staffing, reimagined.
        </h2>
        <p className="mt-3 text-[15px] text-[color:var(--color-ink-500)]">
          A single platform that handles credentialing, hiring, learning and
          practice transactions — so facilities and clinicians can focus on care.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <article
            key={f.title}
            id={f.id}
            className="card card-hover relative p-5"
          >
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
            <div className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[color:var(--color-brand-600)]">
              Learn more <ArrowRight className="h-3 w-3" />
            </div>
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
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 lg:grid-cols-2 lg:py-20">
        <div>
          <Badge tone="brand">For professionals</Badge>
          <h2 className="mt-3 font-display text-[30px] sm:text-[34px] font-bold leading-tight tracking-[-0.015em]">
            One profile. Every opportunity.
          </h2>
          <p className="mt-3 text-[15px] text-[color:var(--color-ink-500)]">
            Apply once, match everywhere. Keep credentials current, log CPD, and
            see live offers from verified facilities.
          </p>
          <ul className="mt-5 grid gap-2.5 text-[13.5px] text-[color:var(--color-ink-700)]">
            {[
              "Smart matching across locum, contract and permanent roles",
              "Auto-tracked CPD credits across every provider",
              "Document vault with one-tap sharing to recruiters",
              "Availability calendar synced with shift offers",
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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-gradient-to-br from-rose-400 to-pink-500 text-white font-semibold">
              TM
            </div>
            <div>
              <p className="text-[14px] font-semibold">Tinashe Moyo</p>
              <p className="text-[12px] text-[color:var(--color-ink-500)]">
                Registered Nurse · Harare
              </p>
            </div>
            <Badge tone="success" withDot className="ml-auto">
              Verified
            </Badge>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat label="Matches" value="89" />
            <Stat label="Applications" value="12" />
            <Stat label="CPD" value="15.5" />
          </div>
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
              Active applications
            </p>
            <ul className="mt-2 divide-y divide-[color:var(--color-border-default)]">
              {marketingJobs.slice(0, 3).map((job) => {
                const f = marketingFacilityById[job.facilityId]!;
                return (
                  <li key={job.id} className="flex items-center gap-3 py-2.5">
                    <FacilityLogo
                      initials={f.initials}
                      gradient={f.logoColor}
                      size={28}
                    />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold truncate">
                        {job.title}
                      </p>
                      <p className="text-[11px] text-[color:var(--color-ink-400)] truncate">
                        {f.name}
                      </p>
                    </div>
                    <Badge tone="info" className="ml-auto">
                      Under Review
                    </Badge>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
      <div
        id="facilities"
        className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 lg:grid-cols-2 lg:pb-20"
      >
        <div className="card p-5 lg:order-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
            Facility · This week
          </p>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <Stat label="Active postings" value="6" />
            <Stat label="New applicants" value="38" />
            <Stat label="Avg. days to hire" value="9" />
          </div>
          <div className="mt-5 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)] p-3.5">
            <p className="text-[12.5px] font-semibold">Hiring pipeline</p>
            <div className="mt-3 grid grid-cols-5 gap-1.5">
              {["Open", "Interested", "Shortlisted", "Matched", "Closed"].map(
                (s, i) => (
                  <div
                    key={s}
                    className="rounded-md bg-white border border-[color:var(--color-border-default)] p-2"
                  >
                    <p className="text-[10px] text-[color:var(--color-ink-400)]">
                      {s}
                    </p>
                    <p className="text-[15px] font-semibold mt-0.5">
                      {[14, 9, 5, 3, 7][i]}
                    </p>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
        <div className="lg:order-2">
          <Badge tone="brand">For facilities</Badge>
          <h2 className="mt-3 font-display text-[30px] sm:text-[34px] font-bold leading-tight tracking-[-0.015em]">
            Post once. Hire 3× faster.
          </h2>
          <p className="mt-3 text-[15px] text-[color:var(--color-ink-500)]">
            Reach a curated pool of verified clinicians. Track your hiring
            pipeline, schedule interviews and onboard — all in one place.
          </p>
          <ul className="mt-5 grid gap-2.5 text-[13.5px] text-[color:var(--color-ink-700)]">
            {[
              "Branded careers page in minutes",
              "Compliance-ready applicant tracking",
              "Bulk SMS & email outreach to verified candidates",
              "Locum cover within hours, not days",
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-white px-3 py-2.5">
      <p className="text-[11px] text-[color:var(--color-ink-400)]">{label}</p>
      <p className="text-[18px] font-semibold tracking-tight mt-0.5">{value}</p>
    </div>
  );
}

function SocialProof() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            metric: "64%",
            label: "Faster time-to-hire",
            sub: "vs. traditional recruitment",
          },
          {
            metric: "10k+",
            label: "Verified professionals",
            sub: "across Zimbabwe",
          },
          {
            metric: "200+",
            label: "Hiring facilities",
            sub: "hospitals, clinics & pharmacies",
          },
        ].map((s) => (
          <div key={s.label} className="card p-6 text-center">
            <p className="font-display num text-[40px] font-bold tracking-[-0.02em] text-pop leading-none">
              {s.metric}
            </p>
            <p className="mt-3 text-[14px] font-semibold">{s.label}</p>
            <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-500)]">
              {s.sub}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="px-6 pb-16">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[20px] p-10 lg:p-14 text-white">
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
          <h2 className="font-display text-[36px] sm:text-[44px] font-bold leading-tight tracking-[-0.02em]">
            Ready to staff smarter?
          </h2>
          <p className="mt-3 text-[15px] text-white/85">
            Join thousands of healthcare professionals and the country&apos;s
            top-performing facilities already on Wanzwei.
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
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-3 max-w-xs text-[13px] text-[color:var(--color-ink-500)]">
            Wanzwei is Zimbabwe&apos;s healthcare workforce platform — connecting
            clinicians with verified facilities.
          </p>
        </div>
        <FooterCol
          title="Product"
          items={["Professionals", "Facilities", "CPD", "Marketplace"]}
        />
        <FooterCol title="Company" items={["About", "Careers", "Press", "Contact"]} />
        <FooterCol
          title="Resources"
          items={["Help center", "Privacy", "Terms", "Security"]}
        />
      </div>
      <div className="border-t border-[color:var(--color-border-default)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-[11.5px] text-[color:var(--color-ink-400)]">
          <p>© {new Date().getFullYear()} Wanzwei Health Inc. All rights reserved.</p>
          <p>Made with care in Harare.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-700)]">
        {title}
      </p>
      <ul className="mt-3 flex flex-col gap-2 text-[13px] text-[color:var(--color-ink-500)]">
        {items.map((i) => (
          <li key={i}>
            <Link href="#" className="hover:text-[color:var(--color-ink-900)]">
              {i}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
