import { SettingsView } from "@/components/app/settings-view";
import { currentAuthHasPassword } from "@/lib/auth/password-auth";
import { requireRole } from "@/lib/auth/session";
import { resolveWorkspaceForUser } from "@/lib/auth/workspace";
import { hasActiveProfessionalMembership } from "@/lib/auth/workspace-model";
import { isSupabaseConfigured } from "@/lib/supabase/service";
import { createSignedAvatarUrl } from "@/lib/supabase/private-storage";
import { listProfessionalDocuments } from "@/lib/supabase/documents-repo";
import { findLatestVerificationForUser } from "@/lib/verification/submit";

export default async function ProfessionalSettingsPage() {
  const user = await requireRole(["professional"]);
  const { memberships } = await resolveWorkspaceForUser(user);
  const hasPasswordAuth = await currentAuthHasPassword();
  const avatarUrl = await createSignedAvatarUrl(user.avatar);
  const verification = await findLatestVerificationForUser(user.id);
  const uploadsEnabled = isSupabaseConfigured();
  let professionalDocuments: Awaited<
    ReturnType<typeof listProfessionalDocuments>
  > = [];
  if (uploadsEnabled) {
    try {
      professionalDocuments = await listProfessionalDocuments(user.id);
    } catch {
      professionalDocuments = [];
    }
  }
  return (
    <SettingsView
      user={user}
      avatarUrl={avatarUrl}
      avatarUploadEnabled={uploadsEnabled}
      verification={verification}
      hasPasswordAuth={hasPasswordAuth}
      professionalDocuments={professionalDocuments}
      hasProfessionalMembership={hasActiveProfessionalMembership(memberships)}
      canAddFacility={user.role !== "admin"}
      showProfessionalCredentials
    />
  );
}
