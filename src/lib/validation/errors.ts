import { NextResponse } from "next/server";
import type { ZodError, ZodIssue } from "zod";

export type ValidationIssue = {
  path: string;
  code: ZodIssue["code"];
  message: string;
};

export type ValidationErrorPayload = {
  error: "Validation failed";
  validationErrors: ValidationIssue[];
};

export function formatValidationErrors(error: ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join("."),
    code: issue.code,
    message: issue.message,
  }));
}

export function validationErrorPayload(
  error: ZodError,
): ValidationErrorPayload {
  return {
    error: "Validation failed",
    validationErrors: formatValidationErrors(error),
  };
}

export function validationErrorResponse(error: ZodError, status = 400) {
  return NextResponse.json(validationErrorPayload(error), { status });
}

export function fieldValidationErrorResponse(
  path: string,
  message: string,
  status = 400,
) {
  return NextResponse.json(
    {
      error: "Validation failed",
      validationErrors: [{ path, code: "custom", message }],
    } satisfies ValidationErrorPayload,
    { status },
  );
}

export class ServerActionValidationError extends Error {
  readonly validationErrors: ValidationIssue[];

  constructor(error: ZodError) {
    super("Validation failed");
    this.name = "ServerActionValidationError";
    this.validationErrors = formatValidationErrors(error);
  }
}

export class ServerActionRateLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many requests. Please try again later.");
    this.name = "ServerActionRateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
