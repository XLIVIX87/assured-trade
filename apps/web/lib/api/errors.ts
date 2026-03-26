import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";

export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PAYLOAD_TOO_LARGE"
  | "INTERNAL_ERROR"
  | "DEPENDENCY_ERROR";

const STATUS_MAP: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL_ERROR: 500,
  DEPENDENCY_ERROR: 503,
};

export class ApiError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = STATUS_MAP[code];
    this.details = details;
  }
}

export function createApiError(code: ErrorCode, message: string, details?: unknown): ApiError {
  return new ApiError(code, message, details);
}

/** Named error factories for common error types */
export const Errors = {
  unauthenticated: (msg?: string) =>
    new ApiError('UNAUTHENTICATED', msg ?? 'Authentication required'),
  forbidden: (msg?: string) =>
    new ApiError('FORBIDDEN', msg ?? 'Access denied'),
  notFound: (entity: string) =>
    new ApiError('NOT_FOUND', `${entity} not found`),
  validation: (msg: string, details?: unknown) =>
    new ApiError('VALIDATION_ERROR', msg, details),
  conflict: (msg: string, details?: unknown) =>
    new ApiError('CONFLICT', msg, details),
  rateLimited: () =>
    new ApiError('RATE_LIMITED', 'Too many requests'),
  payloadTooLarge: (msg?: string) =>
    new ApiError('PAYLOAD_TOO_LARGE', msg ?? 'Payload too large'),
  internal: (msg?: string) =>
    new ApiError('INTERNAL_ERROR', msg ?? 'Internal server error'),
} as const;

export function errorResponse(error: unknown, requestId?: string): NextResponse {
  const rid = requestId ?? uuid();

  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details ?? null,
        },
        meta: { requestId: rid, timestamp: new Date().toISOString() },
      },
      { status: error.status }
    );
  }

  // Unknown error — don't leak internals
  console.error("[INTERNAL_ERROR]", { requestId: rid, error });
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred",
        details: null,
      },
      meta: { requestId: rid, timestamp: new Date().toISOString() },
    },
    { status: 500 }
  );
}
