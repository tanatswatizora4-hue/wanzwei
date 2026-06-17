import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

import { createLogger } from "@/lib/observability/logger";

type LimitConfig = {
  prefix: string;
  limit: number;
  window: `${number} ${"s" | "m" | "h" | "d"}`;
};

type LimitName =
  | "login"
  | "signup"
  | "passwordReset"
  | "verificationEmail"
  | "upload"
  | "emergencyAlert";

export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfterSeconds: number;
};

const LIMITS: Record<LimitName, LimitConfig> = {
  login: { prefix: "auth-login", limit: 5, window: "10 m" },
  signup: { prefix: "auth-signup", limit: 3, window: "1 h" },
  passwordReset: { prefix: "auth-password-reset", limit: 3, window: "1 h" },
  verificationEmail: {
    prefix: "auth-verification-email",
    limit: 3,
    window: "1 h",
  },
  upload: { prefix: "uploads", limit: 20, window: "1 h" },
  emergencyAlert: { prefix: "emergency-alert", limit: 5, window: "15 m" },
};

let redis: Redis | null | undefined;
const limiters = new Map<LimitName, Ratelimit>();
const logger = createLogger("rate-limit");

function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redis = null;
    return redis;
  }

  redis = new Redis({ url, token });
  return redis;
}

function getLimiter(name: LimitName): Ratelimit | null {
  const client = getRedis();
  if (!client) return null;

  const existing = limiters.get(name);
  if (existing) return existing;

  const config = LIMITS[name];
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(config.limit, config.window),
    analytics: true,
    prefix: `wanzwei:${config.prefix}`,
  });
  limiters.set(name, limiter);
  return limiter;
}

export function rateLimitKeyFromRequest(req: Request, subject?: string): string {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip =
    forwardedFor ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown-ip";
  const normalizedSubject = subject?.trim().toLowerCase();
  return normalizedSubject ? `${normalizedSubject}:${ip}` : ip;
}

export async function checkRateLimit(
  name: LimitName,
  identifier: string,
): Promise<RateLimitResult> {
  const config = LIMITS[name];
  const key = `${config.prefix}:${identifier}`;

  try {
    const limiter = getLimiter(name);
    if (limiter) {
      const result = await limiter.limit(key);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        retryAfterSeconds: retryAfterSeconds(result.reset),
      };
    }
  } catch (error) {
    logger.error("rate_limit.upstash_failed_open", error, { name });
    return allowOpen(config);
  }

  logger.warn("rate_limit.not_configured", { name });
  return allowOpen(config);
}

export function rateLimitJsonResponse(result: RateLimitResult) {
  const response = NextResponse.json(
    { error: "Too many requests. Please try again later." },
    { status: 429 },
  );
  addRateLimitHeaders(response, result);
  return response;
}

export function addRateLimitHeaders(
  response: Response,
  result: RateLimitResult,
): Response {
  response.headers.set("Retry-After", String(result.retryAfterSeconds));
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.reset));
  return response;
}

function allowOpen(config: LimitConfig): RateLimitResult {
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit,
    reset: Date.now(),
    retryAfterSeconds: 0,
  };
}

function retryAfterSeconds(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

