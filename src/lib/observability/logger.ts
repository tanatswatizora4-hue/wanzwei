import "server-only";

import { createHash } from "node:crypto";
import * as Sentry from "@sentry/nextjs";

import { getRequestLogContext } from "@/lib/observability/request-context";
import {
  applyRequestIdHeader,
  requestIdFromRequest,
  runWithRequestLog,
} from "@/lib/observability/request-context";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogContext = Record<string, unknown>;

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const SECRET_KEY_PATTERN =
  /(password|secret|token|token_hash|cookie|authorization|apikey|api_key|service[_-]?role|dsn|otp|verifier|pkce|refresh_token|access_token|recovery)/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function createLogger(component: string) {
  return {
    debug: (event: string, context?: LogContext) =>
      writeLog("debug", component, event, context),
    info: (event: string, context?: LogContext) =>
      writeLog("info", component, event, context),
    warn: (event: string, context?: LogContext) =>
      writeLog("warn", component, event, context),
    error: (event: string, error: unknown, context?: LogContext) => {
      writeLog("error", component, event, {
        ...context,
        error: serializeError(error),
      });
      captureException(error, { component, event, extra: context });
    },
  };
}

export function captureException(
  error: unknown,
  context: {
    component: string;
    event: string;
    extra?: LogContext;
    tags?: Record<string, string>;
  },
) {
  const sanitizedExtra = sanitizeContext(context.extra ?? {}) as Record<string, unknown>;
  Sentry.captureException(error, {
    tags: {
      component: context.component,
      event: context.event,
      ...context.tags,
    },
    extra: sanitizedExtra,
  });
}

export function logException(
  component: string,
  event: string,
  error: unknown,
  context?: LogContext,
) {
  createLogger(component).error(event, error, context);
}

export async function withRouteLogging<T>(
  route: string,
  req: Request,
  handler: () => Promise<T>,
): Promise<T> {
  const requestId = requestIdFromRequest(req);
  return runWithRequestLog({ requestId, route }, async () => {
    try {
      const result = await handler();
      if (result instanceof Response) {
        applyRequestIdHeader(result, requestId);
      }
      return result;
    } catch (error) {
      logException("route-handler", "route.exception", error, {
        route,
        method: req.method,
        path: safePath(req.url),
        request_id: requestId,
      });
      throw error;
    }
  });
}

export async function withRepositoryLogging<T>(
  repository: string,
  operation: string,
  handler: () => Promise<T>,
  context?: LogContext,
): Promise<T> {
  try {
    return await handler();
  } catch (error) {
    logException("repository", "repository.error", error, {
      repository,
      operation,
      ...context,
    });
    throw error;
  }
}

function writeLog(
  level: LogLevel,
  component: string,
  event: string,
  context: LogContext = {},
) {
  if (!shouldLog(level)) return;

  const request = getRequestLogContext();
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    component,
    event,
    ...(request?.requestId ? { request_id: request.requestId } : {}),
    ...(request?.route ? { route: request.route } : {}),
    ...(sanitizeContext(context) as Record<string, unknown>),
  };

  const line =
    process.env.LOG_FORMAT === "pretty"
      ? `[${payload.timestamp}] ${level.toUpperCase()} ${component}.${event} ${JSON.stringify(payload)}`
      : JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

function shouldLog(level: LogLevel) {
  const configured = (process.env.LOG_LEVEL ?? "info").toLowerCase() as LogLevel;
  return LEVELS[level] >= (LEVELS[configured] ?? LEVELS.info);
}

function sanitizeContext(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value === "string") {
    if (EMAIL_PATTERN.test(value)) return redactEmail(value);
    return redactSensitiveText(value);
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(sanitizeContext);
  if (typeof value !== "object") return String(value);

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => {
      if (SECRET_KEY_PATTERN.test(key)) return [key, "[redacted]"];
      const normalizedKey = key.toLowerCase();
      if (normalizedKey === "email" || normalizedKey.endsWith("email")) {
        return [key, typeof nestedValue === "string" ? redactEmail(nestedValue) : "[redacted]"];
      }
      if (
        (normalizedKey === "code" || normalizedKey.endsWith("_code")) &&
        typeof nestedValue === "string" &&
        nestedValue.length > 24
      ) {
        return [key, "[redacted]"];
      }
      return [key, sanitizeContext(nestedValue)];
    }),
  );
}

/**
 * Strip secrets that often appear in driver/Auth error messages.
 * Never log passwords, JWTs, tokens, service-role keys, or DB URLs.
 */
export function redactSensitiveText(value: string): string {
  return value
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"'`]+/gi, "[redacted-url]")
    .replace(
      /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
      "[redacted-token]",
    )
    .replace(/\b(sb_secret_[A-Za-z0-9]+|service_role)\b/gi, "[redacted]")
    .slice(0, 400);
}

export function safeErrorDetail(error: unknown): string {
  if (error instanceof Error) {
    return redactSensitiveText(error.message);
  }
  if (error != null && typeof error === "object") {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return redactSensitiveText(message);
  }
  return "Unknown error";
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactSensitiveText(error.message),
      stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }
  if (error != null && typeof error === "object") {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === "string") {
      return {
        name: typeof obj.name === "string" ? obj.name : "Error",
        message: redactSensitiveText(obj.message),
        ...(typeof obj.code === "string" ? { code: obj.code } : {}),
        ...(typeof obj.details === "string"
          ? { details: redactSensitiveText(obj.details) }
          : {}),
        ...(typeof obj.hint === "string"
          ? { hint: redactSensitiveText(obj.hint) }
          : {}),
      };
    }
  }
  return { message: redactSensitiveText(String(error)) };
}

function redactEmail(email: string) {
  const [, domain = "unknown"] = email.split("@");
  const hash = createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 12);
  return `sha256:${hash}@${domain.toLowerCase()}`;
}

function safePath(url: string) {
  try {
    return new URL(url).pathname;
  } catch {
    return "[invalid-url]";
  }
}
