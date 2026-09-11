import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { resolveWorkspaceForUser } from "@/lib/auth/workspace";
import { dashboardPathForWorkspace } from "@/lib/auth/workspace-model";

export default async function ProfessionalSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["professional"]);
  const { workspace } = await resolveWorkspaceForUser(user);
  if (workspace?.type === "facility") {
    redirect(dashboardPathForWorkspace(workspace, user.role));
  }
  return children;
}
