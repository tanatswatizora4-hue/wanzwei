"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { updateOwnProfileAction } from "@/app/(app)/settings/actions";
import { PageHeader } from "@/components/app/topbar";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ProfileAvatarUploader } from "@/components/app/profile-avatar-uploader";
import { cn } from "@/lib/cn";
import type { Facility, User, Verification } from "@/lib/types";
import { VerificationCredentialsForm } from "@/components/app/professional/verification-credentials-form";
import { FacilityTypeSchema } from "@/lib/validation/auth";

type SettingsSection = "profile" | "security";

const NAV: { id: SettingsSection; label: string }[] = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
];

const FACILITY_TYPES = FacilityTypeSchema.options;

const nativeSelectClassName = cn(
  "flex h-9 w-full rounded-[var(--radius-sm)] border bg-white px-3 text-sm",
  "border-[color:var(--color-border-default)] text-[color:var(--color-ink-900)]",
  "shadow-[var(--shadow-xs)] transition-colors",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--color-brand-100)] focus-visible:border-[color:var(--color-brand-500)]",
);

export function SettingsView({
  user,
  facility = null,
  avatarUrl,
  avatarUploadEnabled,
  verification = null,
}: {
  user: User;
  facility?: Facility | null;
  avatarUrl?: string | null;
  avatarUploadEnabled: boolean;
  verification?: Verification | null;
}) {
  const [section, setSection] = React.useState<SettingsSection>("profile");
  const [saving, setSaving] = React.useState(false);

  const subtitle =
    user.role === "facility"
      ? (facility?.name ?? user.facilityName ?? user.title ?? "Facility account")
      : user.role === "admin"
        ? (user.title ?? "Administrator")
        : (user.profession ?? user.title ?? "Healthcare professional");

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const result = await updateOwnProfileAction(
        new FormData(event.currentTarget),
      );
      if (result.ok) {
        toast.success("Profile saved");
      } else {
        toast.error(result.error);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Settings"
        description="Manage your account details and preferences."
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
                    Account verification: Verified
                  </Badge>
                ) : (
                  <Badge tone="amber" withDot className="mt-2">
                    Account verification: Not verified
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
          {user.role === "professional" ? (
            <VerificationCredentialsForm
              defaultProfession={user.profession}
              defaultRegisteringBody={user.registeringBody}
              defaultRegistrationNumber={user.registrationNumber}
              initialVerification={verification}
              accountVerified={user.verified === true}
            />
          ) : null}

          {section === "profile" ? (
            <Card>
              <CardBody className="pt-5">
                <h2 className="text-[15px] font-semibold">
                  Profile information
                </h2>
                <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
                  {user.role === "facility"
                    ? "Update your contact details and facility profile."
                    : "Update your personal details. Profession and HPA credentials are managed through verification."}
                </p>
                <Separator className="my-4" />
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      label="Full name"
                      name="name"
                      defaultValue={user.name}
                      required
                    />
                    <Field
                      label="Email"
                      name="email"
                      defaultValue={user.email}
                      readOnly
                      disabled
                    />
                    {user.role === "professional" ? (
                      <Field
                        label="Profession"
                        defaultValue={user.profession ?? ""}
                        readOnly
                        disabled
                      />
                    ) : null}
                    {user.role === "facility" ? (
                      <>
                        <Field
                          label="Organisation name"
                          name="organisationName"
                          defaultValue={facility?.name ?? ""}
                          required
                        />
                        <Field
                          label="Facility location"
                          name="facilityLocation"
                          defaultValue={facility?.location ?? ""}
                          required
                        />
                        <div className="grid gap-1.5">
                          <Label htmlFor="facilityType">Facility type</Label>
                          <select
                            id="facilityType"
                            name="facilityType"
                            required
                            defaultValue={facility?.type ?? "Hospital"}
                            className={nativeSelectClassName}
                          >
                            {FACILITY_TYPES.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : null}
                    <Field
                      label={
                        user.role === "facility"
                          ? "Your location"
                          : "Location"
                      }
                      name="location"
                      defaultValue={user.location ?? ""}
                    />
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="submit" disabled={saving}>
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : null}
                      Save changes
                    </Button>
                  </div>
                </form>
              </CardBody>
            </Card>
          ) : null}

          {section === "security" ? (
            <>
              <Card>
                <CardBody className="pt-5">
                  <h2 className="text-[15px] font-semibold">Security</h2>
                  <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
                    To change your password, use Forgot password from the
                    sign-in page. Two-factor authentication is not part of
                    this MVP.
                  </p>
                </CardBody>
              </Card>

              <Card>
                <CardBody className="pt-5">
                  <h2 className="text-[15px] font-semibold text-[color:var(--color-danger-700)]">
                    Danger zone
                  </h2>
                  <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
                    Account deletion is not available in this MVP.
                  </p>
                </CardBody>
              </Card>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  ...props
}: { label: string; name?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = name ?? props.id;
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} {...props} />
    </div>
  );
}
