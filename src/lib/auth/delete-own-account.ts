import "server-only";

import { eq } from "drizzle-orm";

import { actionError, actionOk, type ActionResult } from "@/lib/action-result";
import { normalizeEmailAddress } from "@/lib/auth/email-normalize";
import { authUserHasPassword } from "@/lib/auth/password-auth";
import { getDb, hasDbConfig } from "@/lib/db/client";
import { notifications, savedJobs } from "@/lib/db/schema";
import { createLogger } from "@/lib/observability/logger";
import { anonymizeOwnUserForDeletion } from "@/lib/repos/users";
import { deleteAuthUser, getAdminSupabase } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/service";
import { getServerSupabase } from "@/lib/supabase/server";
import { DOCUMENTS_BUCKET } from "@/lib/upload-rules";
import type { User } from "@/lib/types";

import { ACCOUNT_DELETION_CONFIRMATION } from "@/lib/auth/account-deletion";

const logger = createLogger("auth");

export type DeleteOwnAccountInput = {
  confirmation: string;
  emailConfirmation: string;
  password?: string;
};

export type DeleteOwnAccountStore = {
  hasDbConfig: () => boolean;
  anonymizeOwnUserForDeletion: typeof anonymizeOwnUserForDeletion;
  reauthenticate: (email: string, password: string) => Promise<boolean>;
  currentAuthHasPassword: () => Promise<boolean>;
  removePersonalUploads: (userId: string, avatarPath?: string | null) => Promise<void>;
  deleteAuthUser: (userId: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  deletePersonalRows: (userId: string) => Promise<void>;
};

async function defaultReauthenticate(email: string, password: string) {
  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

async function defaultCurrentAuthHasPassword() {
  const supabase = await getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  return authUserHasPassword(user);
}

async function defaultSignOut() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
}

async function defaultDeletePersonalRows(userId: string) {
  const db = getDb();
  await db.delete(savedJobs).where(eq(savedJobs.userId, userId));
  await db.delete(notifications).where(eq(notifications.userId, userId));
}

async function defaultRemovePersonalUploads(
  userId: string,
  avatarPath?: string | null,
) {
  if (!isSupabaseConfigured()) return;

  const admin = getAdminSupabase();
  const { data: docs, error } = await admin
    .from("professional_documents")
    .select("storage_path")
    .eq("user_id", userId);

  if (error) {
    logger.warn("account_deletion.personal_docs_list_failed", {
      userId,
      supabaseError: error.message,
    });
  } else {
    const paths = (docs ?? [])
      .map((row) =>
        typeof row.storage_path === "string" ? row.storage_path : null,
      )
      .filter((path): path is string => Boolean(path));
    if (paths.length > 0) {
      await admin.storage.from(DOCUMENTS_BUCKET).remove(paths);
    }
    await admin.from("professional_documents").delete().eq("user_id", userId);
  }

  if (avatarPath && !avatarPath.startsWith("http")) {
    await admin.storage.from(DOCUMENTS_BUCKET).remove([avatarPath]);
  }
}

const defaultStore: DeleteOwnAccountStore = {
  hasDbConfig,
  anonymizeOwnUserForDeletion,
  reauthenticate: defaultReauthenticate,
  currentAuthHasPassword: defaultCurrentAuthHasPassword,
  removePersonalUploads: defaultRemovePersonalUploads,
  deleteAuthUser,
  signOut: defaultSignOut,
  deletePersonalRows: defaultDeletePersonalRows,
};

export function readDeleteOwnAccountForm(
  formData: FormData,
): DeleteOwnAccountInput {
  const confirmation =
    typeof formData.get("confirmation") === "string"
      ? String(formData.get("confirmation")).trim()
      : "";
  const emailConfirmation =
    typeof formData.get("emailConfirmation") === "string"
      ? String(formData.get("emailConfirmation")).trim()
      : "";
  const passwordRaw = formData.get("password");
  const password =
    typeof passwordRaw === "string" && passwordRaw.length > 0
      ? passwordRaw
      : undefined;

  return { confirmation, emailConfirmation, password };
}

/**
 * Close the authenticated user's own account.
 *
 * Soft-deletes/anonymizes `public.users` so application and verification
 * audit rows can be retained. Does not accept a target user id.
 */
export async function deleteOwnAccount(
  actor: User,
  input: DeleteOwnAccountInput,
  store: DeleteOwnAccountStore = defaultStore,
): Promise<ActionResult> {
  if (!store.hasDbConfig()) {
    return actionError("Database is not configured.");
  }

  if (input.confirmation !== ACCOUNT_DELETION_CONFIRMATION) {
    return actionError(
      `Type ${ACCOUNT_DELETION_CONFIRMATION} to confirm account deletion.`,
    );
  }

  const confirmedEmail = normalizeEmailAddress(input.emailConfirmation);
  if (!confirmedEmail || confirmedEmail !== normalizeEmailAddress(actor.email)) {
    return actionError("Enter the email address on this account to confirm.");
  }

  const needsPassword = await store.currentAuthHasPassword();
  if (needsPassword) {
    if (!input.password) {
      return actionError("Re-enter your password to delete this account.");
    }
    const ok = await store.reauthenticate(actor.email, input.password);
    if (!ok) {
      return actionError("Password was incorrect.");
    }
  }

  try {
    await store.deletePersonalRows(actor.id);
    await store.removePersonalUploads(actor.id, actor.avatar);
    const anonymized = await store.anonymizeOwnUserForDeletion(actor.id);
    if (!anonymized) {
      return actionError("This account is already closed.");
    }
  } catch (error) {
    logger.error("account_deletion.anonymize_failed", error, {
      userId: actor.id,
    });
    return actionError("Could not close this account. Try again.");
  }

  const authDeleted = await store.deleteAuthUser(actor.id);
  if (!authDeleted) {
    logger.error(
      "account_deletion.auth_delete_failed",
      new Error("Auth user remained after profile anonymization"),
      { userId: actor.id },
    );
  }

  await store.signOut();
  return actionOk();
}
