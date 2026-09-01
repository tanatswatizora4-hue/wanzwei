import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Star,
  Pencil,
  Users,
  MapPin,
  Globe,
} from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { FacilityVerifiedBadge } from "@/components/app/facility-verified-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FacilityLogo } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { DocumentUploadPanel } from "@/components/app/document-upload-panel";
import { requireRole } from "@/lib/auth/session";
import { findFacilityForUserEmail } from "@/lib/repos/facilities";
import { isSupabaseConfigured } from "@/lib/supabase/service";
import { listFacilityVerificationDocuments } from "@/lib/supabase/documents-repo";

export default async function FacilityProfilePage() {
  const user = await requireRole(["facility"]);
  const f = await findFacilityForUserEmail(user.email);
  const facilityId = f?.id;

  const uploadsEnabled = isSupabaseConfigured();
  let initialFacilityDocs: Awaited<
    ReturnType<typeof listFacilityVerificationDocuments>
  > = [];
  if (uploadsEnabled && facilityId) {
    try {
      initialFacilityDocs = await listFacilityVerificationDocuments(
        facilityId,
        user.id,
      );
    } catch {
      initialFacilityDocs = [];
    }
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Facility Profile"
        description="The public-facing information clinicians see when applying to your roles."
        actions={
          <Button asChild>
            <Link href="/facility/settings">
              <Pencil className="h-3.5 w-3.5" /> Edit profile
            </Link>
          </Button>
        }
      />

      <Card>
        <div className="relative h-32 overflow-hidden">
          <div
            className={`absolute inset-0 bg-gradient-to-br ${f?.logoColor ?? "from-slate-400 to-slate-600"}`}
          />
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
              backgroundSize: "20px 20px",
            }}
          />
        </div>
        <CardBody className="-mt-10 relative">
          <div className="flex items-end gap-4">
            <FacilityLogo
              initials={f?.initials ?? "FA"}
              gradient={f?.logoColor ?? "from-slate-400 to-slate-600"}
              size={80}
              className="ring-4 ring-white"
            />
            <div className="flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[20px] font-semibold tracking-tight">
                  {f?.name ?? "Facility profile pending"}
                </h2>
                <FacilityVerifiedBadge verified={f?.verified === true} />
                <Badge tone="brand">Pro plan</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[12.5px] text-[color:var(--color-ink-500)]">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {f?.type ?? "Facility"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {f?.location ?? "Location pending"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {f?.rating ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Open roles" value={f?.openRoles ?? 0} />
            <Stat label="Hires (YTD)" value={42} />
            <Stat label="Avg. days to hire" value={9} />
            <Stat label="Profile views" value="2.1k" />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            <div>
              <h3 className="text-[14px] font-semibold">About</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[color:var(--color-ink-500)]">
                Cure Hospital is one of Harare&apos;s leading private hospitals,
                offering acute and elective care across 18 specialities. We
                invest heavily in our 600+ clinical staff with structured CPD,
                competitive remuneration and a supportive culture.
              </p>

              <h3 className="mt-6 text-[14px] font-semibold">Specialities</h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[
                  "Cardiology",
                  "ICU",
                  "Maternity",
                  "Paediatrics",
                  "Orthopedics",
                  "Oncology",
                  "Emergency",
                ].map((s) => (
                  <Badge key={s} tone="slate">
                    {s}
                  </Badge>
                ))}
              </div>

              <h3 className="mt-6 text-[14px] font-semibold">Why work here</h3>
              <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
                {[
                  "Modern infrastructure and equipment",
                  "Structured CPD and mentorship",
                  "Above-market remuneration",
                  "Onsite parking and meals",
                ].map((b) => (
                  <li key={b} className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <Card>
              <CardBody className="pt-5">
                <p className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                  Quick facts
                </p>
                <ul className="mt-3 grid gap-2.5 text-[13px]">
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-[color:var(--color-ink-400)]" />
                    600+ clinical staff
                  </li>
                  <li className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[color:var(--color-ink-400)]" />
                    220 beds
                  </li>
                  <li className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[color:var(--color-ink-400)]" />
                    curehospital.co.zw
                  </li>
                </ul>
              </CardBody>
            </Card>
          </div>
        </CardBody>
      </Card>

      <DocumentUploadPanel
        title="Verification documents"
        description="Upload registration, accreditation, or compliance files for Wanzwei verification. Stored under your facility scope in Supabase."
        hint="PDF, JPG, or PNG · max 15 MB · bucket: documents"
        apiPath="/api/uploads/facility-verification"
        initialDocuments={initialFacilityDocs}
        enabled={uploadsEnabled}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)] px-3 py-2.5">
      <p className="text-[10.5px] uppercase tracking-wider text-[color:var(--color-ink-400)] font-semibold">
        {label}
      </p>
      <p className="mt-1 text-[20px] font-semibold tracking-tight leading-none">
        {value}
      </p>
    </div>
  );
}
