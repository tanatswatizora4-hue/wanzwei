import { describe, expect, it } from "vitest";

import {
  deleteOwnAccount,
  readDeleteOwnAccountForm,
  type DeleteOwnAccountStore,
} from "./delete-own-account";
import { ACCOUNT_DELETION_CONFIRMATION } from "./account-deletion";
import { authUserHasPassword } from "./password-auth";
import type { User } from "@/lib/types";
import { readFileSync } from "node:fs";

const ACTOR: User = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "pro@example.com",
  role: "professional",
  name: "Tinashe Moyo",
  verified: false,
};

function form(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

function store(
  overrides: Partial<DeleteOwnAccountStore> = {},
): DeleteOwnAccountStore & {
  anonymized: string[];
  authDeleted: string[];
  signedOut: boolean;
} {
  const captured = {
    anonymized: [] as string[],
    authDeleted: [] as string[],
    signedOut: false,
  };
  const base: DeleteOwnAccountStore = {
    hasDbConfig: () => true,
    anonymizeOwnUserForDeletion: async (userId) => {
      captured.anonymized.push(userId);
      return true;
    },
    reauthenticate: async () => true,
    currentAuthHasPassword: async () => true,
    removePersonalUploads: async () => undefined,
    deleteAuthUser: async (userId) => {
      captured.authDeleted.push(userId);
      return true;
    },
    signOut: async () => {
      captured.signedOut = true;
    },
    deletePersonalRows: async () => undefined,
  };
  return Object.assign(captured, { ...base, ...overrides });
}

describe("deleteOwnAccount", () => {
  it("closes only the authenticated actor and ignores a posted userId", async () => {
    const posted = form({
      confirmation: ACCOUNT_DELETION_CONFIRMATION,
      emailConfirmation: "pro@example.com",
      password: "correct-password",
      userId: "99999999-9999-4999-8999-999999999999",
    });
    const input = readDeleteOwnAccountForm(posted);
    expect(input).not.toHaveProperty("userId");

    const deps = store();
    const result = await deleteOwnAccount(ACTOR, input, deps);
    expect(result).toEqual({ ok: true });
    expect(deps.anonymized).toEqual([ACTOR.id]);
    expect(deps.authDeleted).toEqual([ACTOR.id]);
    expect(deps.signedOut).toBe(true);
  });

  it("requires confirmation phrase, matching email, and password re-auth", async () => {
    const deps = store({
      reauthenticate: async () => false,
    });

    await expect(
      deleteOwnAccount(
        ACTOR,
        {
          confirmation: "delete",
          emailConfirmation: ACTOR.email,
          password: "pw",
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: false,
      error: `Type ${ACCOUNT_DELETION_CONFIRMATION} to confirm account deletion.`,
    });

    await expect(
      deleteOwnAccount(
        ACTOR,
        {
          confirmation: ACCOUNT_DELETION_CONFIRMATION,
          emailConfirmation: "other@example.com",
          password: "pw",
        },
        deps,
      ),
    ).resolves.toEqual({
      ok: false,
      error: "Enter the email address on this account to confirm.",
    });

    await expect(
      deleteOwnAccount(
        ACTOR,
        {
          confirmation: ACCOUNT_DELETION_CONFIRMATION,
          emailConfirmation: ACTOR.email,
          password: "wrong",
        },
        deps,
      ),
    ).resolves.toEqual({ ok: false, error: "Password was incorrect." });

    expect(deps.anonymized).toEqual([]);
  });

  it("does not require a password for Google-only accounts", async () => {
    const deps = store({
      currentAuthHasPassword: async () => false,
      reauthenticate: async () => {
        throw new Error("password re-auth must not run");
      },
    });
    const result = await deleteOwnAccount(
      ACTOR,
      {
        confirmation: ACCOUNT_DELETION_CONFIRMATION,
        emailConfirmation: "PRO@example.com",
      },
      deps,
    );
    expect(result).toEqual({ ok: true });
    expect(deps.signedOut).toBe(true);
  });

  it("does not delete verification or application tables", () => {
    const source = readFileSync("src/lib/auth/delete-own-account.ts", "utf8");
    expect(source).not.toContain("delete(applications)");
    expect(source).not.toContain("delete(verifications)");
    expect(source).not.toContain("delete(verificationEvents)");
    expect(source).not.toContain("delete(verificationDocuments)");
    expect(source).not.toContain("delete(listings)");
    expect(source).not.toContain("delete(courses)");
    expect(source).not.toContain("delete(courseEnrolments)");
    expect(source).not.toContain("delete(listingEnquiries)");
    expect(source).toContain("anonymizeOwnUserForDeletion");
  });
});

describe("authUserHasPassword", () => {
  it("treats email identities as password auth and Google-only as not", () => {
    expect(
      authUserHasPassword({
        app_metadata: { providers: ["google"] },
        identities: [{ provider: "google" }],
      }),
    ).toBe(false);
    expect(
      authUserHasPassword({
        app_metadata: { providers: ["email", "google"] },
        identities: [{ provider: "email" }],
      }),
    ).toBe(true);
  });
});
