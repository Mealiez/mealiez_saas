import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/session
 * Lightweight endpoint to get current user session on the client.
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    return NextResponse.json({ user })
  } catch (err) {
    return NextResponse.json({ user: null }, { status: 200 })
  }
}
