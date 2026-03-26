import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { ApiError, errorResponse } from './errors'

/**
 * Wraps a Next.js route handler with standardised error handling.
 * Catches ApiError, ZodError, and unexpected errors, returning a
 * consistent JSON envelope for each.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apiHandler(fn: (...args: any[]) => Promise<NextResponse>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return async (...args: any[]): Promise<NextResponse> => {
    try {
      return await fn(...args)
    } catch (error) {
      if (error instanceof ApiError) {
        return errorResponse(error)
      }

      if (error instanceof ZodError) {
        return errorResponse(
          new ApiError('VALIDATION_ERROR', 'Invalid request', error.flatten()),
        )
      }

      // Log unexpected errors without leaking details to the client
      console.error('[API Error]', error)
      return errorResponse(error)
    }
  }
}
