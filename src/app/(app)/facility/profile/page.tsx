import Link from "next/link";
import {
  Building2,
  Pencil,
  MapPin,
} from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { FacilityVerifiedBadge } from "@/components/app/facility-verified-badge";
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
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-[12.5px] text-[color:var(--color-ink-500)]">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {f?.type ?? "Facility"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {f?.location ?? "Location pending"}
                </span>
                {user.name ? (
                  <span>Contact: {user.name}</span>
                ) : null}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Open roles" value={f?.openRoles ?? 0} />
            <Stat
              label="Verification"
              value={f?.verified ? "Verified" : "Unverified"}
            />
            <Stat label="Type" value={f?.type ?? "—"} />
          </div>

          <div className="mt-6">
            <h3 className="text-[14px] font-semibold">Organisation</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-[color:var(--color-ink-500)]">
              {f
                ? `${f.name} is listed as a ${f.type.toLowerCase()} in ${f.location}. Additional public description is not collected in this MVP.`
                : "Complete your facility profile in Settings so professionals can see your organisation."}
            </p>
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
