import "server-only";

import { createLogger } from "@/lib/observability/logger";
import { getRequestLogContext } from "@/lib/observability/request-context";

type AuthEventContext = Record<string, unknown>;

const logger = createLogger("auth");

export function logAuthEvent(event: string, context: AuthEventContext = {}) {
  const request = getRequestLogContext();
  logger.info(event, {
    ...context,
    request_id: request?.requestId,
    route: context.route ?? request?.route,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  });
}

export function logAuthWarn(event: string, context: AuthEventContext = {}) {
  const request = getRequestLogContext();
  logger.warn(event, {
    ...context,
    request_id: request?.requestId,
    route: context.route ?? request?.route,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    release:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  });
}
