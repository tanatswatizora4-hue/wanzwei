import { SettingsView } from "@/components/app/settings-view";
import { currentAuthHasPassword } from "@/lib/auth/password-auth";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/service";
import { createSignedAvatarUrl } from "@/lib/supabase/private-storage";

export default async function AdminSettingsPage() {
  const user = await requireRole(["admin"]);
  const hasPasswordAuth = await currentAuthHasPassword();
  const avatarUrl = await createSignedAvatarUrl(user.avatar);
  return (
    <SettingsView
      user={user}
      avatarUrl={avatarUrl}
      avatarUploadEnabled={isSupabaseConfigured()}
      hasPasswordAuth={hasPasswordAuth}
    />
  );
}
