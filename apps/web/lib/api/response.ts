import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";

/**
 * Standard success response envelope.
 */
export function apiSuccess<T>(data: T, requestId?: string, status = 200): NextResponse {
  return NextResponse.json(
    {
      data,
      meta: {
        requestId: requestId ?? uuid(),
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

/**
 * Standard paginated response envelope.
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  requestId?: string
): NextResponse {
  return NextResponse.json(
    {
      data,
      meta: {
        requestId: requestId ?? uuid(),
        timestamp: new Date().toISOString(),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    },
    { status: 200 }
  );
}

/**
 * Parse pagination params from URL search params.
 */
export function parsePagination(searchParams: URLSearchParams): {
  page: number;
  pageSize: number;
  skip: number;
} {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  return { page, pageSize, skip: (page - 1) * pageSize };
}
