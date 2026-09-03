import { SettingsView } from "@/components/app/settings-view";
import { currentAuthHasPassword } from "@/lib/auth/password-auth";
import { requireRole } from "@/lib/auth/session";
import { findFacilityForUserEmail } from "@/lib/repos/facilities";
import { isSupabaseConfigured } from "@/lib/supabase/service";
import { createSignedAvatarUrl } from "@/lib/supabase/private-storage";

export default async function FacilitySettingsPage() {
  const user = await requireRole(["facility"]);
  const hasPasswordAuth = await currentAuthHasPassword();
  const facility = await findFacilityForUserEmail(user.email);
  const avatarUrl = await createSignedAvatarUrl(user.avatar);
  return (
    <SettingsView
      user={user}
      facility={facility}
      avatarUrl={avatarUrl}
      avatarUploadEnabled={isSupabaseConfigured()}
      hasPasswordAuth={hasPasswordAuth}
    />
  );
}
