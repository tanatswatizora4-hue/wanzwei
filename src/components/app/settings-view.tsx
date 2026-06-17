"use client";

import * as React from "react";
import { PageHeader } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ProfileAvatarUploader } from "@/components/app/profile-avatar-uploader";
import { cn } from "@/lib/cn";
import type { User } from "@/lib/types";

type SettingsSection =
  | "profile"
  | "security"
  | "notifications"
  | "integrations"
  | "billing";

const NAV: { id: SettingsSection; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
  { id: "notifications", label: "Notifications" },
  { id: "integrations", label: "Integrations" },
  { id: "billing", label: "Billing & invoices" },
];

export function SettingsView({
  user,
  avatarUrl,
  avatarUploadEnabled,
}: {
  user: User;
  avatarUrl?: string | null;
  avatarUploadEnabled: boolean;
}) {
  const [section, setSection] = React.useState<SettingsSection>("profile");

  const subtitle =
    user.role === "facility"
      ? (user.facilityName ?? user.title ?? "Facility account")
      : user.role === "admin"
        ? (user.title ?? "Administrator")
        : (user.profession ?? user.title ?? "Healthcare professional");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Settings"
        description="Manage your account, security, billing and notification preferences."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="min-w-0">
          <Card>
            <CardBody>
              <div className="flex flex-col items-center text-center">
                <ProfileAvatarUploader
                  name={user.name}
                  avatarUrl={avatarUrl}
                  enabled={avatarUploadEnabled}
                  size={64}
                />
                <p className="mt-3 text-[15px] font-semibold">{user.name}</p>
                <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
                  {subtitle}
                </p>
                {user.verified ? (
                  <Badge tone="success" withDot className="mt-2">
                    Verified
                  </Badge>
                ) : (
                  <Badge tone="amber" withDot className="mt-2">
                    Verification pending
                  </Badge>
                )}
              </div>
              <Separator className="my-4" />
              <nav aria-label="Settings sections">
                <ul className="flex flex-col gap-1 text-[13px]">
                  {NAV.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setSection(item.id)}
                        className={cn(
                          "w-full rounded-[8px] px-2.5 py-1.5 text-left font-medium transition",
                          section === item.id
                            ? "bg-[color:var(--color-brand-50)] text-[color:var(--color-brand-700)]"
                            : "text-[color:var(--color-ink-700)] hover:bg-[color:var(--color-ink-900)]/[0.04]",
                        )}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>
            </CardBody>
          </Card>
        </aside>

        <div className="flex min-w-0 flex-col gap-6">
          {section === "profile" ? (
            <Card>
              <CardBody className="pt-5">
                <h2 className="text-[15px] font-semibold">
                  Profile information
                </h2>
                <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
                  Update your personal details. This information is shown to
                  facilities you apply to.
                </p>
                <Separator className="my-4" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Full name" defaultValue={user.name} />
                  <Field label="Email" defaultValue={user.email} />
                  <Field
                    label={
                      user.role === "facility" ? "Facility name" : "Profession"
                    }
                    defaultValue={
                      user.role === "facility"
                        ? (user.facilityName ?? "")
                        : (user.profession ?? "")
                    }
                  />
                  <Field
                    label="Location"
                    defaultValue={user.location ?? ""}
                  />
                </div>
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <Button variant="ghost">Cancel</Button>
                  <Button>Save changes</Button>
                </div>
              </CardBody>
            </Card>
          ) : null}

          {section === "security" ? (
            <>
              <Card>
                <CardBody className="pt-5">
                  <h2 className="text-[15px] font-semibold">Security</h2>
                  <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
                    Manage password and two-factor authentication.
                  </p>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      label="Current password"
                      type="password"
                      placeholder="••••••••"
                    />
                    <Field
                      label="New password"
                      type="password"
                      placeholder="••••••••"
                    />
                  </div>
                  <div className="mt-4 flex flex-col gap-3 rounded-[var(--radius-md)] border border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold">
                        Two-factor authentication
                      </p>
                      <p className="text-[12px] text-[color:var(--color-ink-500)]">
                        Add an extra layer of security to your account.
                      </p>
                    </div>
                    <Button size="sm" variant="secondary" className="shrink-0">
                      Enable 2FA
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="pt-5">
                  <h2 className="text-[15px] font-semibold text-[color:var(--color-danger-700)]">
                    Danger zone
                  </h2>
                  <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
                    Permanently delete your account and all associated data.
                  </p>
                  <div className="mt-3">
                    <Button variant="danger" size="sm">
                      Delete account
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </>
          ) : null}

          {section === "notifications" ? (
            <ComingSoonSection
              title="Notifications"
              body="Soon you’ll be able to tune email alerts, shifts, messages, and reminders from one place."
            />
          ) : null}

          {section === "integrations" ? (
            <ComingSoonSection
              title="Integrations"
              body="Calendar sync, SSO, HR systems (and more) will appear here."
            />
          ) : null}

          {section === "billing" ? (
            <ComingSoonSection
              title="Billing & invoices"
              body="Payment methods and invoice history will be available soon."
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ComingSoonSection({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardBody className="pt-5">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        <p className="mt-1 text-[12.5px] text-[color:var(--color-ink-500)]">
          {body}
        </p>
        <Separator className="my-4" />
        <p className="rounded-[var(--radius-md)] border border-dashed border-[color:var(--color-border-default)] bg-[color:var(--color-surface-muted)] px-4 py-6 text-center text-[13px] text-[color:var(--color-ink-500)]">
          This section is coming soon.
        </p>
      </CardBody>
    </Card>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  );
}
