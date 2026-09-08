import { SettingsView } from "@/components/app/settings-view";
import { currentAuthHasPassword } from "@/lib/auth/password-auth";
import { requireRole } from "@/lib/auth/session";
import { resolveWorkspaceForUser } from "@/lib/auth/workspace";
import { hasActiveProfessionalMembership } from "@/lib/auth/workspace-model";
import { resolveFacilityForUser } from "@/lib/facility-for-user";
import { isSupabaseConfigured } from "@/lib/supabase/service";
import { createSignedAvatarUrl } from "@/lib/supabase/private-storage";

export default async function FacilitySettingsPage() {
  const user = await requireRole(["facility"]);
  const { memberships } = await resolveWorkspaceForUser(user);
  const hasPasswordAuth = await currentAuthHasPassword();
  const facility = await resolveFacilityForUser(user);
  const avatarUrl = await createSignedAvatarUrl(user.avatar);
  const hasProfessional = hasActiveProfessionalMembership(memberships);
  return (
    <SettingsView
      user={user}
      facility={facility}
      avatarUrl={avatarUrl}
      avatarUploadEnabled={isSupabaseConfigured()}
      hasPasswordAuth={hasPasswordAuth}
      hasProfessionalMembership={hasProfessional}
      canAddProfessional={!hasProfessional && user.role !== "admin"}
    />
  );
}
