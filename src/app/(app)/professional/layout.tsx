import { requireRole } from "@/lib/auth/session";

export default async function ProfessionalSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(["professional"]);
  return children;
}
