import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { resolveWorkspaceForUser } from "@/lib/auth/workspace";
import { facilityMemberships } from "@/lib/auth/workspace-model";

export default async function FacilitySectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["facility"]);
  const { memberships } = await resolveWorkspaceForUser(user);
  if (facilityMemberships(memberships).length === 0 && user.role !== "facility") {
    redirect("/professional/dashboard");
  }
  return children;
}
