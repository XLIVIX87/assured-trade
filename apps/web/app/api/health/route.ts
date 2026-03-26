import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/health — Health check (no auth required)
export async function GET() {
  const timestamp = new Date().toISOString()

  let dbStatus: 'connected' | 'disconnected' = 'disconnected'

  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'connected'
  } catch {
    dbStatus = 'disconnected'
  }

  const status = dbStatus === 'connected' ? 'ok' : 'degraded'
  const httpStatus = dbStatus === 'connected' ? 200 : 503

  return NextResponse.json(
    {
      status,
      db: dbStatus,
      timestamp,
    },
    { status: httpStatus }
  )
}
