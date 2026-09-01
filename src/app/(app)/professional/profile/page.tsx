import Link from "next/link";
import { Pencil, Shield } from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { ProfileAvatarUploader } from "@/components/app/profile-avatar-uploader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth/session";
import { DocumentUploadPanel } from "@/components/app/document-upload-panel";
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
                    {user.profession ?? "Profession not set"}
                    {user.location ? ` · ${user.location}` : ""}
                  </p>
                  {user.registeringBody || user.registrationNumber ? (
                    <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-500)]">
                      {[user.registeringBody, user.registrationNumber]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  ) : null}
                </div>
              </div>
            </CardBody>
          </Card>

          <DocumentUploadPanel
            title="Uploaded documents"
            description="Licences, credentials, and supporting files for facilities. Files are stored in your private documents bucket."
            hint="PDF, JPG, or PNG · max 15 MB · bucket: documents"
            apiPath="/api/uploads/professional"
            initialDocuments={initialDocs}
            enabled={uploadsEnabled}
          />
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardBody className="pt-5">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--color-ink-400)]">
                Profile
              </p>
              <ul className="mt-3 flex flex-col gap-2 text-[13px]">
                <ProfileFact
                  label="Name"
                  done={Boolean(user.name?.trim())}
                />
                <ProfileFact
                  label="Location"
                  done={Boolean(user.location?.trim())}
                />
                <ProfileFact
                  label="Profession"
                  done={Boolean(user.profession?.trim())}
                />
                <ProfileFact
                  label="HPA verification"
                  done={user.verified === true}
                />
                <ProfileFact
                  label="Documents"
                  done={initialDocs.length > 0}
                />
              </ul>
              {!user.verified ? (
                <Button size="sm" className="mt-4 w-full" asChild>
                  <Link href="/professional/settings">Submit verification</Link>
                </Button>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ProfileFact({ label, done }: { label: string; done: boolean }) {
  return (
    <li className="flex items-center justify-between">
      <span>{label}</span>
      <Badge tone={done ? "emerald" : "slate"} withDot>
        {done ? "Added" : "Not added"}
      </Badge>
    </li>
  );
}

