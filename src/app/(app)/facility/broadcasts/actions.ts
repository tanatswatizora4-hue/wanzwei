"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import {
  capabilityForBroadcastType,
} from "@/lib/broadcasts/access";
import {
  applyBroadcastTypeConstraints,
  formatTargetingSummaryLines,
  summarizeTargetingCriteria,
} from "@/lib/broadcasts/criteria";
import { deliverWorkforceBroadcast } from "@/lib/broadcasts/delivery";
import {
  generateGeminiTextJson,
} from "@/lib/broadcasts/gemini-text";
import {
  improveBroadcastCopy,
  interpretTargetingIntent,
} from "@/lib/broadcasts/interpret";
import { matchProfessionals, recipientsForSend, toPreviewProfessionals } from "@/lib/broadcasts/match";
import type {
  PreviewProfessional,
  TargetingCriteria,
  TargetingSummary,
} from "@/lib/broadcasts/network-types";
import { hasDbConfig } from "@/lib/db/client";
import { requireFacilityCapability } from "@/lib/facility-for-user";
import { getFacility } from "@/lib/repos/facilities";
import { createEmergencyAlertForRecipientIds } from "@/lib/repos/emergency-alerts";
import { listActiveNetworkMemberships } from "@/lib/repos/facility-professional-network";
import { getJobForFacility } from "@/lib/repos/jobs";
import {
  insertBroadcastRecipients,
  insertWorkforceBroadcast,
  listProfessionalsForBroadcastMatch,
} from "@/lib/repos/workforce-broadcasts";
import { checkRateLimit } from "@/lib/rate-limit";
import { isGeminiConfigured } from "@/lib/verification/gemini/config";
import {
  ImproveBroadcastCopySchema,
  InterpretTargetingSchema,
  PreviewBroadcastSchema,
  SendBroadcastSchema,
} from "@/lib/validation/broadcasts";
import { ServerActionValidationError } from "@/lib/validation/errors";

export type InterpretBroadcastResult =
  | { ok: true; criteria: TargetingCriteria }
  | { ok: false; error: string };

export type ImproveBroadcastResult =
  | { ok: true; title: string; message: string }
  | { ok: false; error: string };

export type PreviewBroadcastResult =
  | {
      ok: true;
      count: number;
      professionals: PreviewProfessional[];
      criteria: TargetingCriteria;
      summary: TargetingSummary;
      summaryLines: string[];
    }
  | { ok: false; error: string };

export type SendBroadcastResult =
  | { ok: true; broadcastId: string; count: number }
  | { ok: false; error: string };

function revalidateBroadcasts() {
  revalidatePath("/facility/broadcasts");
  revalidatePath("/facility/emergency");
  revalidatePath("/professional/opportunities");
  revalidatePath("/professional/dashboard");
}

export async function interpretBroadcastTargetingAction(
  input: unknown,
): Promise<InterpretBroadcastResult> {
  const user = await requireUser();
  const parsed = InterpretTargetingSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const previewContext = await requireFacilityCapability(
    user,
    "createRecruitmentBroadcast",
  );
  const emergencyContext = previewContext
    ? previewContext
    : await requireFacilityCapability(user, "manageEmergency");
  if (!emergencyContext) {
    return { ok: false, error: "You cannot interpret targeting for this facility." };
  }

  const rateLimit = await checkRateLimit("broadcastAi", user.id);
  if (!rateLimit.success) {
    return { ok: false, error: "Too many AI requests. Please try again later." };
  }

  if (!isGeminiConfigured()) {
    return {
      ok: false,
      error: "AI targeting is not configured. Set filters manually.",
    };
  }

  const result = await interpretTargetingIntent(
    parsed.data.intent,
    generateGeminiTextJson,
  );
  if (!result.ok) {
    const unavailable = result.error.includes("not configured");
    return {
      ok: false,
      error: unavailable
        ? "AI targeting is not configured. Set filters manually."
        : "Could not interpret that targeting request. Set filters manually.",
    };
  }
  return result;
}

export async function improveBroadcastCopyAction(
  input: unknown,
): Promise<ImproveBroadcastResult> {
  const user = await requireUser();
  const parsed = ImproveBroadcastCopySchema.safeParse(input);
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const context =
    (await requireFacilityCapability(user, "createRecruitmentBroadcast")) ??
    (await requireFacilityCapability(user, "manageEmergency"));
  if (!context) {
    return { ok: false, error: "You cannot edit broadcasts for this facility." };
  }

  const rateLimit = await checkRateLimit("broadcastAi", user.id);
  if (!rateLimit.success) {
    return { ok: false, error: "Too many AI requests. Please try again later." };
  }
  if (!isGeminiConfigured()) {
    return {
      ok: false,
      error: "AI copy assist is not configured.",
    };
  }

  const result = await improveBroadcastCopy(
    parsed.data,
    generateGeminiTextJson,
  );
  if (!result.ok) {
    return { ok: false, error: "Could not improve this advert." };
  }
  return result;
}

export async function previewBroadcastAction(
  input: unknown,
): Promise<PreviewBroadcastResult> {
  const user = await requireUser();
  if (!hasDbConfig()) return { ok: false, error: "Database is not configured." };

  const parsed = PreviewBroadcastSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const context = await requireFacilityCapability(
    user,
    capabilityForBroadcastType(parsed.data.type),
  );
  if (!context) {
    return { ok: false, error: "You cannot preview this broadcast." };
  }

  const criteria = applyBroadcastTypeConstraints(
    parsed.data.type,
    parsed.data.criteria,
  );
  const [candidates, network] = await Promise.all([
    listProfessionalsForBroadcastMatch(),
    listActiveNetworkMemberships(context.facilityId),
  ]);
  const matched = matchProfessionals({ candidates, network, criteria });
  return {
    ok: true,
    count: matched.length,
    professionals: toPreviewProfessionals({ matched, network }),
    criteria,
    summary: summarizeTargetingCriteria(criteria),
    summaryLines: formatTargetingSummaryLines(criteria),
  };
}

export async function sendBroadcastAction(
  input: unknown,
): Promise<SendBroadcastResult> {
  const user = await requireUser();
  if (!hasDbConfig()) return { ok: false, error: "Database is not configured." };

  const parsed = SendBroadcastSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServerActionValidationError(parsed.error);
  }

  const context = await requireFacilityCapability(
    user,
    capabilityForBroadcastType(parsed.data.type),
  );
  if (!context) {
    return { ok: false, error: "You cannot send this broadcast." };
  }

  const rateName =
    parsed.data.type === "emergency" ? "emergencyAlert" : "workforceBroadcast";
  const rateLimit = await checkRateLimit(rateName, user.id);
  if (!rateLimit.success) {
    return { ok: false, error: "Too many requests. Please try again later." };
  }

  if (parsed.data.jobId) {
    const job = await getJobForFacility(parsed.data.jobId, context.facilityId);
    if (!job) {
      return { ok: false, error: "That job does not belong to this facility." };
    }
  }

  const criteria = applyBroadcastTypeConstraints(
    parsed.data.type,
    parsed.data.criteria,
  );
  const [candidates, network, facility] = await Promise.all([
    listProfessionalsForBroadcastMatch(),
    listActiveNetworkMemberships(context.facilityId),
    getFacility(context.facilityId),
  ]);
  const matched = matchProfessionals({ candidates, network, criteria });
  const { recipients, count } = recipientsForSend(matched);
  if (count === 0) {
    return { ok: false, error: "No professionals match these filters." };
  }

  let emergencyAlertId: string | undefined;
  if (parsed.data.type === "emergency") {
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + (parsed.data.expiresInMinutes ?? 60) * 60 * 1000,
    ).toISOString();
    const alert = await createEmergencyAlertForRecipientIds(
      {
        facilityId: context.facilityId,
        profession: criteria.professions[0],
        location: parsed.data.location ?? criteria.locations[0] ?? "Harare",
        urgency: parsed.data.urgency ?? "High",
        shiftStart: new Date(parsed.data.shiftStart!).toISOString(),
        shiftEnd: new Date(parsed.data.shiftEnd!).toISOString(),
        notes: parsed.data.message,
        payMin: parsed.data.payMin ?? 0,
        payMax: parsed.data.payMax ?? 0,
        payCurrency: parsed.data.payCurrency ?? "USD",
        payPeriod: parsed.data.payPeriod ?? "shift",
        expiresAt,
      },
      recipients.map((professional) => professional.id),
    );
    if (!alert) {
      return { ok: false, error: "Could not create the emergency alert." };
    }
    emergencyAlertId = alert.id;
  }

  const broadcast = await insertWorkforceBroadcast({
    facilityId: context.facilityId,
    createdBy: user.id,
    type: parsed.data.type,
    title: parsed.data.title,
    message: parsed.data.message,
    location: parsed.data.location,
    positionsNeeded: parsed.data.positionsNeeded,
    shiftStart: parsed.data.shiftStart ? new Date(parsed.data.shiftStart) : undefined,
    shiftEnd: parsed.data.shiftEnd ? new Date(parsed.data.shiftEnd) : undefined,
    status: "sent",
    targetingCriteria: criteria,
    matchedRecipientCount: count,
    jobId: parsed.data.jobId,
    emergencyAlertId,
    sentAt: new Date(),
  });
  if (!broadcast) {
    return { ok: false, error: "Could not save this broadcast." };
  }

  await insertBroadcastRecipients({
    broadcastId: broadcast.id,
    professionalUserIds: recipients.map((professional) => professional.id),
  });

  await deliverWorkforceBroadcast({
    broadcast,
    facilityName: facility?.name ?? "A facility",
    professionals: recipients,
  });

  revalidateBroadcasts();
  return { ok: true, broadcastId: broadcast.id, count };
}
