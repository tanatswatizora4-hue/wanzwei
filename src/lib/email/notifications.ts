import "server-only";

import { sendEmail } from "@/lib/email/client";
import {
  applicationStatusTemplate,
  emergencyAlertResponseTemplate,
  emergencyAlertTemplate,
  interviewInvitationTemplate,
  verificationDecisionTemplate,
} from "@/lib/email/templates";
import type { ApplicationStatus, Urgency, VerificationStatus } from "@/lib/types";

type EmailRecipient = string | string[];

export async function sendApplicationStatusEmail(input: {
  to: EmailRecipient;
  professionalName: string;
  status: ApplicationStatus;
  jobTitle: string;
  facilityName: string;
}) {
  const content = applicationStatusTemplate(input);
  return sendEmail({ to: input.to, ...content });
}

export async function sendInterviewInvitationEmail(input: {
  to: EmailRecipient;
  professionalName: string;
  jobTitle: string;
  facilityName: string;
  interviewDate: string | Date;
  duration: number;
  mode: "Onsite" | "Video" | "Phone";
}) {
  const content = interviewInvitationTemplate(input);
  return sendEmail({ to: input.to, ...content });
}

export async function sendEmergencyAlertEmail(input: {
  to: EmailRecipient;
  professionalName: string;
  facilityName: string;
  profession: string;
  location: string;
  urgency: Urgency;
  shiftStart: string | Date;
  shiftEnd: string | Date;
  payRange: string;
  expiresAt: string | Date;
  notes?: string;
}) {
  const content = emergencyAlertTemplate(input);
  return sendEmail({ to: input.to, ...content });
}

export async function sendVerificationDecisionEmail(input: {
  to: EmailRecipient;
  professionalName: string;
  status: Extract<VerificationStatus, "Verified" | "Rejected" | "Under Review">;
}) {
  const content = verificationDecisionTemplate(input);
  return sendEmail({ to: input.to, ...content });
}

export async function sendEmergencyAlertResponseEmail(input: {
  to: EmailRecipient;
  facilityName: string;
  professionalName: string;
  response: "Accepted" | "Declined";
  profession: string;
  location: string;
  shiftStart: string | Date;
}) {
  const content = emergencyAlertResponseTemplate(input);
  return sendEmail({ to: input.to, ...content });
}
