import "server-only";

import { Resend } from "resend";

import { createLogger } from "@/lib/observability/logger";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

type SendEmailResult =
  | { sent: true; skipped: false; id?: string }
  | { sent: false; skipped: true }
  | { sent: false; skipped: false; error: unknown };

const logger = createLogger("email");

let cachedResend: Resend | null | undefined;

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = getResendClient();
  const recipientCount = Array.isArray(input.to) ? input.to.length : 1;

  if (!resend) {
    logger.info("email.skipped_missing_resend_key", {
      subject: input.subject,
      recipientCount,
    });
    return { sent: false, skipped: true };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo ?? process.env.RESEND_REPLY_TO_EMAIL,
    });

    if (error) {
      logger.error("email.send_failed", error, {
        subject: input.subject,
        recipientCount,
      });
      return { sent: false, skipped: false, error };
    }

    logger.info("email.sent", {
      subject: input.subject,
      recipientCount,
      resendId: data?.id,
    });
    return { sent: true, skipped: false, id: data?.id };
  } catch (error) {
    logger.error("email.send_exception", error, {
      subject: input.subject,
      recipientCount,
    });
    return { sent: false, skipped: false, error };
  }
}

function getResendClient(): Resend | null {
  if (cachedResend !== undefined) return cachedResend;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  cachedResend = apiKey ? new Resend(apiKey) : null;
  return cachedResend;
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || "Wanzwei <onboarding@resend.dev>";
}
