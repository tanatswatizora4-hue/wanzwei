import type { ReactNode } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Award,
  GraduationCap,
  Briefcase,
  Languages,
  Pencil,
  Shield,
} from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { ProfileAvatarUploader } from "@/components/app/profile-avatar-uploader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { requireRole } from "@/lib/auth/session";
import { DocumentUploadPanel } from "@/components/app/document-upload-panel";
import { ProfessionalProfileCertUploadButton } from "@/components/app/professional-profile-cert-upload-button";
import { ProfessionalProfileTimelineSection } from "@/components/app/professional-profile-timeline-section";
import { isSupabaseConfigured } from "@/lib/supabase/service";
import { listProfessionalDocuments } from "@/lib/supabase/documents-repo";
import { createSignedAvatarUrl } from "@/lib/supabase/private-storage";

export default async function ProfilePage() {
  const user = await requireRole(["professional"]);
  const uploadsEnabled = isSupabaseConfigured();
  const avatarUrl = await createSignedAvatarUrl(user.avatar);
  let initialDocs: Awaited<
    ReturnType<typeof listProfessionalDocuments>
  > = [];
  if (uploadsEnabled) {
    try {
      initialDocs = await listProfessionalDocuments(user.id);
    } catch {
      initialDocs = [];
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Profile"
        description="The information facilities see when reviewing your applications."
        actions={
          <Button asChild>
            <Link href="/professional/settings">
              <Pencil className="h-3.5 w-3.5" /> Edit profile
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardBody className="pt-5">
              <div className="flex items-start gap-5">
                <div className="shrink-0 pt-0.5">
                  <ProfileAvatarUploader
                    name={user.name}
                    avatarUrl={avatarUrl}
                    enabled={uploadsEnabled}
                    size={72}
                    showCaption={false}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[20px] font-semibold tracking-tight">
                      {user.name}
                    </h2>
                    {user.verified ? (
                      <Badge tone="success" withDot>
                        <Shield className="h-3 w-3" /> Account verification: Verified
                      </Badge>
                    ) : (
                      <Badge tone="amber" withDot>
                        Account verification: Not verified
                      </Badge>
                    )}
                  </div>
                  <p className="text-[13.5px] text-[color:var(--color-ink-500)]">
                    {user.profession ?? "Healthcare Professional"} · {user.location}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="brand">Open to locum</Badge>
                    <Badge tone="slate">Open to full-time</Badge>
                    <Badge tone="slate">Available immediately</Badge>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          <DocumentUploadPanel
            title="Uploaded documents"
            description="Licences, credentials, and supporting files for facilities. Files are stored in your Supabase bucket."
            hint="PDF, JPG, or PNG · max 15 MB · bucket: documents"
            apiPath="/api/uploads/professional"
            initialDocuments={initialDocs}
            enabled={uploadsEnabled}
          />

          <ProfessionalProfileTimelineSection
            icon={<Briefcase className="h-4 w-4" />}
            title="Experience"
            actionLabel="Add role"
            dialogTitle="Add experience"
            dialogDescription="Add a role or placement. Entries are saved in your browser until you refresh the page."
            titleFieldLabel="Role title"
            orgFieldLabel="Organisation"
            metaFieldLabel="Dates"
            metaPlaceholder="e.g. 2023 — Present"
            bodyFieldLabel="Summary"
            initialItems={[
              {
                title: "Registered Nurse",
                org: "Cure Hospital Harare",
                meta: "2023 — Present",
                body: "Acute care, post-op recovery and ICU rotations. Mentored 4 junior nurses.",
              },
              {
                title: "Ward Nurse",
                org: "Parirenyatwa Group of Hospitals",
                meta: "2020 — 2023",
                body: "Surgical ward — managed patient loads of up to 24.",
              },
              {
                title: "Clinical Intern",
                org: "Avenues Clinic",
                meta: "2019 — 2020",
                body: "Rotational placement across emergency, paediatrics and OPD.",
              },
            ]}
          />

          <ProfessionalProfileTimelineSection
            icon={<GraduationCap className="h-4 w-4" />}
            title="Education"
            actionLabel="Add education"
            dialogTitle="Add education"
            dialogDescription="Add a qualification. Entries are saved in your browser until you refresh the page."
            titleFieldLabel="Qualification"
            orgFieldLabel="Institution"
            metaFieldLabel="Years"
            metaPlaceholder="e.g. 2015 — 2019"
            bodyFieldLabel="Notes"
            initialItems={[
              {
                title: "BSc Nursing (Hons)",
                org: "University of Zimbabwe",
                meta: "2015 — 2019",
                body: "Distinction in adult nursing.",
              },
            ]}
          />
          <Section
            icon={<Award className="h-4 w-4" />}
            title="Certifications & licences"
            actionSlot={
              <ProfessionalProfileCertUploadButton enabled={uploadsEnabled} />
            }
          >
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {[
                { name: "Nurses Council registration", issuer: "NCZ", until: "2027" },
                { name: "BLS — Adult & Paediatric", issuer: "Resus Council", until: "2026" },
                { name: "Phlebotomy certificate", issuer: "MCDZ", until: "2028" },
                { name: "Sepsis early management", issuer: "WHO Academy", until: "2027" },
              ].map((c) => (
                <div
                  key={c.name}
                  className="rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-white p-3.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[13px] font-semibold">{c.name}</p>
                      <p className="text-[11.5px] text-[color:var(--color-ink-500)]">
                        {c.issuer}
                      </p>
                    </div>
                    <Badge tone="success" withDot>
                      Valid
                    </Badge>
                  </div>
                  <p className="mt-2 text-[11px] text-[color:var(--color-ink-400)]">
                    Valid until {c.until}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardBody className="pt-5">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Profile strength
              </p>
              <p className="mt-2 text-[28px] font-semibold tracking-tight leading-none">
                82%
              </p>
              <Progress value={82} className="mt-2" />
              <Separator className="my-4" />
              <ul className="flex flex-col gap-2 text-[13px]">
                <li className="flex items-center justify-between">
                  <span>Add a profile photo</span>
                  <Badge tone="emerald" withDot>
                    Done
                  </Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span>Verify licences</span>
                  <Badge tone="emerald" withDot>
                    Done
                  </Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span>Add 2+ references</span>
                  <Badge tone="amber" withDot>
                    Pending
                  </Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span>Complete CPD profile</span>
                  <Badge tone="amber" withDot>
                    Pending
                  </Badge>
                </li>
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="pt-5">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-[color:var(--color-ink-400)]" />
                <p className="text-[13.5px] font-semibold">Skills</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[
                  "Adult care",
                  "Paediatrics",
                  "ICU",
                  "Phlebotomy",
                  "Triage",
                  "Patient education",
                  "BLS",
                  "Wound care",
                ].map((s) => (
                  <Badge key={s} tone="slate">
                    {s}
                  </Badge>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="flex items-center gap-2">
                <Languages className="h-4 w-4 text-[color:var(--color-ink-400)]" />
                <p className="text-[13.5px] font-semibold">Languages</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="slate">English · Native</Badge>
                <Badge tone="slate">Shona · Native</Badge>
                <Badge tone="slate">Ndebele · Conversational</Badge>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  action,
  actionSlot,
  children,
}: {
  icon: ReactNode;
  title: string;
  action?: string;
  actionSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardBody className="pt-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]">
              {icon}
            </span>
            <p className="text-[14px] font-semibold">{title}</p>
          </div>
          {actionSlot ? (
            actionSlot
          ) : action ? (
            <Button variant="ghost" size="sm">
              + {action}
            </Button>
          ) : null}
        </div>
        <div className="mt-4">{children}</div>
      </CardBody>
    </Card>
  );
}


