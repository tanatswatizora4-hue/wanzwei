import { Search } from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth/session";
import { listUsersForAdmin } from "@/lib/repos/users";
import type { Role } from "@/lib/types";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Admin",
  facility: "Facility",
  professional: "Professional",
};

const ROLE_TONE: Record<Role, "violet" | "sky" | "amber"> = {
  admin: "violet",
  facility: "sky",
  professional: "amber",
};

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString("en", {
    month: "short",
    year: "numeric",
  });
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  await requireRole(["admin"]);
  const params = await searchParams;
  const q = first(params.q)?.trim() || undefined;
  const roleRaw = first(params.role);
  const role =
    roleRaw === "professional" || roleRaw === "facility" || roleRaw === "admin"
      ? roleRaw
      : undefined;
  const rows = await listUsersForAdmin(200, { q, role });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Oversight of platform accounts. Roles cannot be changed here."
      />

      <Card>
        <CardBody className="pt-5">
          <form method="get" className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--color-ink-400)]" />
              <Input
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search users by name or email"
                className="pl-9"
              />
            </div>
            <select
              name="role"
              defaultValue={role ?? ""}
              className="h-10 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-white px-3 text-[13px]"
            >
              <option value="">All roles</option>
              <option value="professional">Professional</option>
              <option value="facility">Facility</option>
              <option value="admin">Admin</option>
            </select>
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Verified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-[13px] text-[color:var(--color-ink-500)]">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(({ user, facilityName, joinedAt }) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={user.name} size={32} />
                        <div>
                          <p className="font-semibold">{user.name}</p>
                          <p className="text-[11px] text-[color:var(--color-ink-400)]">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge tone={ROLE_TONE[user.role]}>
                        {ROLE_LABEL[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === "facility"
                        ? (facilityName ?? "—")
                        : user.role === "admin"
                          ? "Wanzwei"
                          : "—"}
                    </TableCell>
                    <TableCell className="text-[12.5px] text-[color:var(--color-ink-500)]">
                      {formatJoined(joinedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        tone={user.verified ? "success" : "amber"}
                        withDot
                      >
                        {user.verified ? "Verified" : "Not verified"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
