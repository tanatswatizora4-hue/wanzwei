import { SettingsView } from "@/components/app/settings-view";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/service";
import { createSignedAvatarUrl } from "@/lib/supabase/private-storage";

export default async function ProfessionalSettingsPage() {
  const user = await requireRole(["professional"]);
  const avatarUrl = await createSignedAvatarUrl(user.avatar);
  return (
    <SettingsView
      user={user}
      avatarUrl={avatarUrl}
      avatarUploadEnabled={isSupabaseConfigured()}
    />
  );
}
