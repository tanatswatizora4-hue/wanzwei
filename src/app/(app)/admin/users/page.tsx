import { Search, MoreHorizontal } from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown";
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

export default async function AdminUsersPage() {
  await requireRole(["admin"]);
  const rows = await listUsersForAdmin(200);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        description="Manage all platform accounts, roles and permissions."
        actions={
          <Button size="sm" disabled title="Invite user coming soon">
            Invite user
          </Button>
        }
      />

      <Card>
        <CardBody className="pt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--color-ink-400)]" />
              <Input
                placeholder="Search users by name or email"
                className="pl-9"
                disabled
                title="Search coming soon"
              />
            </div>
            <Select defaultValue="all" disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="pro">Professional</SelectItem>
                <SelectItem value="fac">Facility</SelectItem>
                <SelectItem value="adm">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-status" disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-status">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-[13px] text-[color:var(--color-ink-500)]">
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
                          : "Independent"}
                    </TableCell>
                    <TableCell className="text-[12.5px] text-[color:var(--color-ink-500)]">
                      {formatJoined(joinedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        tone={user.verified ? "success" : "amber"}
                        withDot
                      >
                        {user.verified ? "Active" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="iconSm" disabled>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem disabled>View profile</DropdownMenuItem>
                          <DropdownMenuItem disabled>Send message</DropdownMenuItem>
                          <DropdownMenuItem disabled>Change role</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem danger disabled>
                            Suspend account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
