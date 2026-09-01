import "server-only";

import { and, desc, eq, inArray, lt } from "drizzle-orm";

import { getDb, hasDbConfig } from "@/lib/db/client";
import {
  emergencyAlertRecipients,
  emergencyAlerts,
  facilities,
  users,
} from "@/lib/db/schema";
import {
  sendEmergencyAlertEmail,
  sendEmergencyAlertResponseEmail,
} from "@/lib/email/notifications";
import type {
  DbEmergencyAlert,
  DbEmergencyAlertRecipient,
  NewDbEmergencyAlert,
} from "@/lib/db/schema";
import { withRepositoryLogging } from "@/lib/observability/logger";
import type {
  AlertResponseStatus,
  EmergencyAlert,
  User,
} from "@/lib/types";
import { toUser } from "./users";

type RecipientRow = DbEmergencyAlertRecipient & {
  professionalName?: string | null;
};

function toEmergencyAlert(
  row: DbEmergencyAlert,
  recipients: RecipientRow[] = [],
): EmergencyAlert {
  return {
    id: row.id,
    facilityId: row.facilityId,
    profession: row.profession,
    location: row.location,
    urgency: row.urgency,
    shiftStart: row.shiftStart.toISOString(),
    shiftEnd: row.shiftEnd.toISOString(),
    notes: row.notes,
    payMin: Number(row.payMin),
    payMax: Number(row.payMax),
    payCurrency: row.payCurrency,
    payPeriod: row.payPeriod,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    status: row.status,
    matchedCount: row.matchedCount,
    recipients: recipients.map((recipient) => ({
      professionalId: recipient.professionalId,
      professionalName: recipient.professionalName ?? "Professional",
      status: recipient.status,
      respondedAt: recipient.respondedAt?.toISOString(),
    })),
  };
}

async function loadRecipients(alertIds: string[]): Promise<Map<string, RecipientRow[]>> {
  return withRepositoryLogging(
    "emergency-alerts",
    "loadRecipients",
    async () => {
      const byAlert = new Map<string, RecipientRow[]>();
      if (alertIds.length === 0) return byAlert;

      const rows = await getDb()
        .select({
          recipient: emergencyAlertRecipients,
          professionalName: users.name,
        })
        .from(emergencyAlertRecipients)
        .innerJoin(users, eq(users.id, emergencyAlertRecipients.professionalId))
        .where(inArray(emergencyAlertRecipients.alertId, alertIds));

      for (const row of rows) {
        const current = byAlert.get(row.recipient.alertId) ?? [];
        current.push({
          ...row.recipient,
          professionalName: row.professionalName,
        });
        byAlert.set(row.recipient.alertId, current);
      }

      return byAlert;
    },
    { count: alertIds.length },
  );
}

export async function rollForwardAlertStatuses(
  now: Date = new Date(),
): Promise<void> {
  if (!hasDbConfig()) return;
  return withRepositoryLogging("emergency-alerts", "rollForwardAlertStatuses", async () => {
    const db = getDb();
    const expired = await db
      .update(emergencyAlerts)
      .set({ status: "Expired" })
      .where(and(eq(emergencyAlerts.status, "Sent"), lt(emergencyAlerts.expiresAt, now)))
      .returning({ id: emergencyAlerts.id });

    const expiredIds = expired.map((row) => row.id);
    if (expiredIds.length === 0) return;
    await db
      .update(emergencyAlertRecipients)
      .set({ status: "Expired" })
      .where(
        and(
          inArray(emergencyAlertRecipients.alertId, expiredIds),
          eq(emergencyAlertRecipients.status, "Pending"),
        ),
      );
  });
}

export async function matchProfessionals({
  profession,
  location,
}: {
  profession: string;
  location: string;
}): Promise<User[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging("emergency-alerts", "matchProfessionals", async () => {
    const db = getDb();
    const rows = await db
      .select()
      .from(users)
      .where(and(eq(users.role, "professional"), eq(users.verified, true)));

    const expectedProfession = profession.trim().toLowerCase();
    const expectedLocation = location.trim().toLowerCase();
    return rows
      .filter(
        (user) =>
          (user.profession ?? "").toLowerCase() === expectedProfession &&
          (expectedLocation === "any" ||
            (user.location ?? "").toLowerCase() === expectedLocation),
      )
      .map(toUser);
  }, { profession, location });
}

export async function getEmergencyAlertsForFacility(
  facilityId: string,
): Promise<EmergencyAlert[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "emergency-alerts",
    "getEmergencyAlertsForFacility",
    async () => {
      await rollForwardAlertStatuses();
      const db = getDb();
      const rows = await db
        .select()
        .from(emergencyAlerts)
        .where(eq(emergencyAlerts.facilityId, facilityId))
        .orderBy(desc(emergencyAlerts.createdAt));
      const recipients = await loadRecipients(rows.map((row) => row.id));
      return rows.map((row) => toEmergencyAlert(row, recipients.get(row.id)));
    },
    { facilityId },
  );
}

export async function listEmergencyAlertsForAdmin(
  limit = 100,
): Promise<(EmergencyAlert & { facilityName: string })[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "emergency-alerts",
    "listEmergencyAlertsForAdmin",
    async () => {
      await rollForwardAlertStatuses();
      const db = getDb();
      const rows = await db
        .select({ alert: emergencyAlerts, facilityName: facilities.name })
        .from(emergencyAlerts)
        .innerJoin(facilities, eq(facilities.id, emergencyAlerts.facilityId))
        .orderBy(desc(emergencyAlerts.createdAt))
        .limit(limit);
      const recipients = await loadRecipients(rows.map((row) => row.alert.id));
      return rows.map((row) => ({
        ...toEmergencyAlert(row.alert, recipients.get(row.alert.id)),
        facilityName: row.facilityName,
      }));
    },
    { limit },
  );
}

export async function getEmergencyAlertsForProfessional(
  professionalId: string,
): Promise<EmergencyAlert[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "emergency-alerts",
    "getEmergencyAlertsForProfessional",
    async () => {
      await rollForwardAlertStatuses();
      const db = getDb();
      const rows = await db
        .select({ alert: emergencyAlerts })
        .from(emergencyAlerts)
        .innerJoin(
          emergencyAlertRecipients,
          eq(emergencyAlertRecipients.alertId, emergencyAlerts.id),
        )
        .where(eq(emergencyAlertRecipients.professionalId, professionalId))
        .orderBy(desc(emergencyAlerts.createdAt));

      const alerts = rows.map((row) => row.alert);
      const recipients = await loadRecipients(alerts.map((row) => row.id));
      return alerts.map((row) => toEmergencyAlert(row, recipients.get(row.id)));
    },
    { professionalId },
  );
}

export async function getEmergencyAlertsForProfessionalEmail(
  email: string,
): Promise<EmergencyAlert[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "emergency-alerts",
    "getEmergencyAlertsForProfessionalEmail",
    async () => {
      await rollForwardAlertStatuses();
      const db = getDb();
      const rows = await db
        .select({ alert: emergencyAlerts })
        .from(emergencyAlerts)
        .innerJoin(
          emergencyAlertRecipients,
          eq(emergencyAlertRecipients.alertId, emergencyAlerts.id),
        )
        .innerJoin(users, eq(users.id, emergencyAlertRecipients.professionalId))
        .where(eq(users.email, email))
        .orderBy(desc(emergencyAlerts.createdAt));

      const alerts = rows.map((row) => row.alert);
      const recipients = await loadRecipients(alerts.map((row) => row.id));
      return alerts.map((row) => toEmergencyAlert(row, recipients.get(row.id)));
    },
    { email },
  );
}

export async function getActiveAlertsForProfessional(
  professionalId: string,
): Promise<EmergencyAlert[]> {
  const alerts = await getEmergencyAlertsForProfessional(professionalId);
  return alerts.filter(
    (alert) =>
      alert.status === "Sent" &&
      alert.recipients.some(
        (recipient) =>
          recipient.professionalId === professionalId &&
          recipient.status === "Pending",
      ),
  );
}

export async function getActiveAlertsForProfessionalEmail(
  email: string,
): Promise<EmergencyAlert[]> {
  if (!hasDbConfig()) return [];
  return withRepositoryLogging(
    "emergency-alerts",
    "getActiveAlertsForProfessionalEmail",
    async () => {
      const alerts = await getEmergencyAlertsForProfessionalEmail(email);
      const user = await getDb()
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      const professionalId = user[0]?.id;
      if (!professionalId) return [];
      return alerts.filter(
        (alert) =>
          alert.status === "Sent" &&
          alert.recipients.some(
            (recipient) =>
              recipient.professionalId === professionalId &&
              recipient.status === "Pending",
          ),
      );
    },
    { email },
  );
}

export async function respondToEmergencyAlertForProfessionalEmail(
  alertId: string,
  email: string,
  response: Extract<AlertResponseStatus, "Accepted" | "Declined">,
): Promise<EmergencyAlert | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "emergency-alerts",
    "respondToEmergencyAlertForProfessionalEmail",
    async () => {
      const db = getDb();
      const rows = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      const professionalId = rows[0]?.id;
      if (!professionalId) return null;
      return respondToEmergencyAlert(alertId, professionalId, response);
    },
    { alertId, email, response },
  );
}

export async function createEmergencyAlert(
  payload: Omit<
    EmergencyAlert,
    "id" | "createdAt" | "status" | "recipients" | "matchedCount"
  >,
): Promise<EmergencyAlert | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "emergency-alerts",
    "createEmergencyAlert",
    async () => {
      const db = getDb();
      const matched = await matchProfessionals({
        profession: payload.profession,
        location: payload.location,
      });
      const insert: NewDbEmergencyAlert = {
        facilityId: payload.facilityId,
        profession: payload.profession,
        location: payload.location,
        urgency: payload.urgency,
        shiftStart: new Date(payload.shiftStart),
        shiftEnd: new Date(payload.shiftEnd),
        notes: payload.notes,
        payMin: payload.payMin.toFixed(2),
        payMax: payload.payMax.toFixed(2),
        payCurrency: payload.payCurrency,
        payPeriod: payload.payPeriod,
        expiresAt: new Date(payload.expiresAt),
        status: "Sent",
        matchedCount: matched.length,
      };

      const rows = await db.insert(emergencyAlerts).values(insert).returning();
      const alert = rows[0];
      if (!alert) return null;

      const recipientValues = matched.slice(0, 8).map((professional) => ({
        alertId: alert.id,
        professionalId: professional.id,
        status: "Pending" as const,
      }));

      if (recipientValues.length > 0) {
        await db.insert(emergencyAlertRecipients).values(recipientValues);
      }

      const recipients = await loadRecipients([alert.id]);
      const created = toEmergencyAlert(alert, recipients.get(alert.id));
      await sendEmergencyAlertNotifications(created, matched.slice(0, 8));
      return created;
    },
    {
      facilityId: payload.facilityId,
      profession: payload.profession,
      location: payload.location,
      urgency: payload.urgency,
    },
  );
}

export async function respondToEmergencyAlert(
  alertId: string,
  professionalId: string,
  response: Extract<AlertResponseStatus, "Accepted" | "Declined">,
): Promise<EmergencyAlert | null> {
  if (!hasDbConfig()) return null;
  return withRepositoryLogging(
    "emergency-alerts",
    "respondToEmergencyAlert",
    async () => {
      const db = getDb();
      const alertRows = await db
        .select({ status: emergencyAlerts.status })
        .from(emergencyAlerts)
        .where(eq(emergencyAlerts.id, alertId))
        .limit(1);
      if (!alertRows[0] || alertRows[0].status !== "Sent") {
        return null;
      }

      const updatedRecipients = await db
        .update(emergencyAlertRecipients)
        .set({ status: response, respondedAt: new Date() })
        .where(
          and(
            eq(emergencyAlertRecipients.alertId, alertId),
            eq(emergencyAlertRecipients.professionalId, professionalId),
            eq(emergencyAlertRecipients.status, "Pending"),
          ),
        )
        .returning({ professionalId: emergencyAlertRecipients.professionalId });

      const didRecordResponse = updatedRecipients.length > 0;

      if (didRecordResponse && response === "Accepted") {
        await db
          .update(emergencyAlerts)
          .set({ status: "Filled" })
          .where(eq(emergencyAlerts.id, alertId));
        await db
          .update(emergencyAlertRecipients)
          .set({ status: "Expired" })
          .where(
            and(
              eq(emergencyAlertRecipients.alertId, alertId),
              eq(emergencyAlertRecipients.status, "Pending"),
            ),
          );
      }

      const rows = await db
        .select()
        .from(emergencyAlerts)
        .where(eq(emergencyAlerts.id, alertId))
        .limit(1);
      if (!rows[0]) return null;
      const recipients = await loadRecipients([alertId]);
      const updated = toEmergencyAlert(rows[0], recipients.get(alertId));
      if (didRecordResponse) {
        await sendEmergencyAlertResponseNotification(
          updated,
          professionalId,
          response,
        );
      }
      return updated;
    },
    { alertId, professionalId, response },
  );
}

async function sendEmergencyAlertNotifications(
  alert: EmergencyAlert,
  professionals: User[],
): Promise<void> {
  if (professionals.length === 0) return;

  const facility = await loadFacilityContact(alert.facilityId);
  const facilityName = facility.name ?? "A facility";
  const payRange = `${alert.payCurrency} ${alert.payMin}-${alert.payMax}/${alert.payPeriod}`;

  await Promise.all(
    professionals.map((professional) =>
      sendEmergencyAlertEmail({
        to: professional.email,
        professionalName: professional.name,
        facilityName,
        profession: alert.profession,
        location: alert.location,
        urgency: alert.urgency,
        shiftStart: alert.shiftStart,
        shiftEnd: alert.shiftEnd,
        payRange,
        expiresAt: alert.expiresAt,
        notes: alert.notes,
      }),
    ),
  );
}

async function sendEmergencyAlertResponseNotification(
  alert: EmergencyAlert,
  professionalId: string,
  response: Extract<AlertResponseStatus, "Accepted" | "Declined">,
): Promise<void> {
  const db = getDb();
  const facility = await loadFacilityContact(alert.facilityId);
  if (facility.emails.length === 0) return;

  const professionals = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, professionalId))
    .limit(1);

  await sendEmergencyAlertResponseEmail({
    to: facility.emails,
    facilityName: facility.name ?? "Facility team",
    professionalName: professionals[0]?.name ?? "A professional",
    response,
    profession: alert.profession,
    location: alert.location,
    shiftStart: alert.shiftStart,
  });
}

async function loadFacilityContact(
  facilityId: string,
): Promise<{ name?: string; emails: string[] }> {
  const db = getDb();
  const facilityRows = await db
    .select({ name: facilities.name })
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  const userRows = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.facilityId, facilityId));

  return {
    name: facilityRows[0]?.name,
    emails: userRows.map((row) => row.email),
  };
}

export async function cancelEmergencyAlertForFacility(
  alertId: string,
  facilityId: string,
): Promise<boolean> {
  if (!hasDbConfig()) return false;
  return withRepositoryLogging(
    "emergency-alerts",
    "cancelEmergencyAlertForFacility",
    async () => {
      const db = getDb();
      const rows = await db
        .update(emergencyAlerts)
        .set({ status: "Cancelled" })
        .where(
          and(
            eq(emergencyAlerts.id, alertId),
            eq(emergencyAlerts.facilityId, facilityId),
          ),
        )
        .returning({ id: emergencyAlerts.id });
      if (!rows[0]) return false;
      await db
        .update(emergencyAlertRecipients)
        .set({ status: "Expired" })
        .where(
          and(
            eq(emergencyAlertRecipients.alertId, alertId),
            eq(emergencyAlertRecipients.status, "Pending"),
          ),
        );
      return true;
    },
    { alertId, facilityId },
  );
}

