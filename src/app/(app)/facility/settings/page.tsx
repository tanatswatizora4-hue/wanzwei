import { SettingsView } from "@/components/app/settings-view";
import { currentAuthHasPassword } from "@/lib/auth/password-auth";
import { requireRole } from "@/lib/auth/session";
import { hasFacilityCapability } from "@/lib/auth/facility-capabilities";
import { resolveWorkspaceForUser } from "@/lib/auth/workspace";
import { hasActiveProfessionalMembership } from "@/lib/auth/workspace-model";
import { getActiveFacilityContext } from "@/lib/facility-for-user";
import { getFacility } from "@/lib/repos/facilities";
import { isSupabaseConfigured } from "@/lib/supabase/service";
import { createSignedAvatarUrl } from "@/lib/supabase/private-storage";
import { redirect } from "next/navigation";

export default async function FacilitySettingsPage() {
  const user = await requireRole(["facility"]);
  const { memberships } = await resolveWorkspaceForUser(user);
  const context = await getActiveFacilityContext(user);
  if (!context) redirect("/workspaces/add");
  const hasPasswordAuth = await currentAuthHasPassword();
  const facility = await getFacility(context.facilityId);
  const avatarUrl = await createSignedAvatarUrl(user.avatar);
  const hasProfessional = hasActiveProfessionalMembership(memberships);
  const canManageSettings = hasFacilityCapability(
    context.membership.membershipRole,
    "manageFacilitySettings",
  );
  return (
    <SettingsView
      user={user}
      facility={facility}
      avatarUrl={avatarUrl}
      avatarUploadEnabled={isSupabaseConfigured()}
      hasPasswordAuth={hasPasswordAuth}
      hasProfessionalMembership={hasProfessional}
      canAddFacility
      canAddProfessional={!hasProfessional && user.role !== "admin"}
      showFacilitySettings={canManageSettings}
      workspaceKind="facility"
    />
  );
}
