import { SettingsView } from "@/components/app/settings-view";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/service";
import { createSignedAvatarUrl } from "@/lib/supabase/private-storage";
import { findLatestVerificationForUser } from "@/lib/verification/submit";

export default async function ProfessionalSettingsPage() {
  const user = await requireRole(["professional"]);
  const avatarUrl = await createSignedAvatarUrl(user.avatar);
  const verification = await findLatestVerificationForUser(user.id);
  return (
    <SettingsView
      user={user}
      avatarUrl={avatarUrl}
      avatarUploadEnabled={isSupabaseConfigured()}
      verification={verification}
    />
  );
}
