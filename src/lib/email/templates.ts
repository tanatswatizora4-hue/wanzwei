import "server-only";

import type { ApplicationStatus, Urgency, VerificationStatus } from "@/lib/types";

export type EmailContent = {
  subject: string;
  html: string;
  text: string;
};

type ApplicationStatusTemplateInput = {
  professionalName: string;
  status: ApplicationStatus;
  jobTitle: string;
  facilityName: string;
};

type InterviewInvitationTemplateInput = {
  professionalName: string;
  jobTitle: string;
  facilityName: string;
  interviewDate: string | Date;
  duration: number;
  mode: "Onsite" | "Video" | "Phone";
};

type EmergencyAlertTemplateInput = {
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
};

type EmergencyAlertResponseTemplateInput = {
  facilityName: string;
  professionalName: string;
  response: "Accepted" | "Declined";
  profession: string;
  location: string;
  shiftStart: string | Date;
};

export function applicationStatusTemplate({
  professionalName,
  status,
  jobTitle,
  facilityName,
}: ApplicationStatusTemplateInput): EmailContent {
  return renderEmail({
    subject: `Application update: ${status}`,
    preheader: `${facilityName} updated your application for ${jobTitle}.`,
    greeting: `Hi ${professionalName},`,
    paragraphs: [
      `${facilityName} updated your application for ${jobTitle}.`,
      `Your current application status is: ${status}.`,
      "Sign in to Wanzwei to review your application pipeline and next steps.",
    ],
  });
}

export function interviewInvitationTemplate({
  professionalName,
  jobTitle,
  facilityName,
  interviewDate,
  duration,
  mode,
}: InterviewInvitationTemplateInput): EmailContent {
  return renderEmail({
    subject: `Interview invitation from ${facilityName}`,
    preheader: `${facilityName} invited you to interview for ${jobTitle}.`,
    greeting: `Hi ${professionalName},`,
    paragraphs: [
      `${facilityName} invited you to interview for ${jobTitle}.`,
      `When: ${formatDateTime(interviewDate)}`,
      `Format: ${mode}, ${duration} minutes.`,
      "Please sign in to Wanzwei to prepare and coordinate with the facility.",
    ],
  });
}

export function emergencyAlertTemplate({
  professionalName,
  facilityName,
  profession,
  location,
  urgency,
  shiftStart,
  shiftEnd,
  payRange,
  expiresAt,
  notes,
}: EmergencyAlertTemplateInput): EmailContent {
  const paragraphs = [
    `${facilityName} needs a ${profession} for an emergency shift in ${location}.`,
    `Urgency: ${urgency}`,
    `Shift: ${formatDateTime(shiftStart)} to ${formatDateTime(shiftEnd)}`,
    `Pay: ${payRange}`,
    `Respond before: ${formatDateTime(expiresAt)}`,
  ];

  if (notes?.trim()) {
    paragraphs.push(`Notes: ${notes.trim()}`);
  }

  paragraphs.push("Sign in to Wanzwei to accept or decline this alert.");

  return renderEmail({
    subject: `${urgency} emergency shift: ${profession}`,
    preheader: `${facilityName} has an emergency shift matching your profile.`,
    greeting: `Hi ${professionalName},`,
    paragraphs,
  });
}

export function emergencyAlertResponseTemplate({
  facilityName,
  professionalName,
  response,
  profession,
  location,
  shiftStart,
}: EmergencyAlertResponseTemplateInput): EmailContent {
  return renderEmail({
    subject: `Emergency alert ${response.toLowerCase()}: ${professionalName}`,
    preheader: `${professionalName} ${response.toLowerCase()} your emergency alert.`,
    greeting: `Hi ${facilityName},`,
    paragraphs: [
      `${professionalName} ${response.toLowerCase()} your emergency alert for ${profession} in ${location}.`,
      `Shift starts: ${formatDateTime(shiftStart)}`,
      response === "Accepted"
        ? "The alert is now marked filled and other pending recipients were expired."
        : "The alert remains available for other matched professionals until it is filled or expires.",
    ],
  });
}

export function verificationDecisionTemplate({
  professionalName,
  status,
}: {
  professionalName: string;
  status: Extract<VerificationStatus, "Verified" | "Rejected" | "Under Review">;
}): EmailContent {
  if (status === "Verified") {
    return renderEmail({
      subject: "Your Wanzwei verification was approved",
      preheader: "You can now apply for jobs and respond to emergency locum alerts.",
      greeting: `Hi ${professionalName},`,
      paragraphs: [
        "Your professional verification has been approved.",
        "You can now apply for open roles and respond to emergency locum requests on Wanzwei.",
        "Sign in to review your profile and browse current opportunities.",
      ],
    });
  }
  if (status === "Rejected") {
    return renderEmail({
      subject: "Update on your Wanzwei verification",
      preheader: "Your verification was not approved. You can review your details and resubmit.",
      greeting: `Hi ${professionalName},`,
      paragraphs: [
        "Your professional verification was not approved at this time.",
        "Please sign in to review your submitted details and documents, then update anything that is incomplete or incorrect before submitting again.",
        "If you believe this decision was made in error, reply to this email with a brief description of the issue.",
      ],
    });
  }
  return renderEmail({
    subject: "Your Wanzwei verification is under review",
    preheader: "An administrator is reviewing your verification submission.",
    greeting: `Hi ${professionalName},`,
    paragraphs: [
      "Your professional verification is currently under review.",
      "We will email you when a decision is made. You do not need to take any action unless we contact you.",
    ],
  });
}

function renderEmail({
  subject,
  preheader,
  greeting,
  paragraphs,
}: {
  subject: string;
  preheader: string;
  greeting: string;
  paragraphs: string[];
}): EmailContent {
  const escapedParagraphs = paragraphs.map((paragraph) => escapeHtml(paragraph));
  const bodyHtml = [
    `<p style="margin:0 0 16px;">${escapeHtml(greeting)}</p>`,
    ...escapedParagraphs.map(
      (paragraph) => `<p style="margin:0 0 16px;">${paragraph}</p>`,
    ),
  ].join("");

  return {
    subject,
    html: `<!doctype html>
<html>
  <body style="margin:0;background:#f6f7f9;padding:24px;font-family:Arial,sans-serif;color:#1f2937;">
    <span style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;">${escapeHtml(preheader)}</span>
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:28px;">
      <h1 style="margin:0 0 20px;font-size:20px;line-height:1.3;color:#111827;">${escapeHtml(subject)}</h1>
      ${bodyHtml}
      <p style="margin:24px 0 0;font-size:12px;color:#6b7280;">Wanzwei connects healthcare professionals and facilities.</p>
    </div>
  </body>
</html>`,
    text: [greeting, "", ...paragraphs, "", "Wanzwei"].join("\n"),
  };
}

function formatDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Harare",
  }).format(new Date(value));
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
