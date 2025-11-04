// src/app/api/trip/notify-created/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyTripCreated } from '@/lib/notifications'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const groupId   = Number(body?.groupId)
  const tripName  = String(body?.tripName ?? '').trim()
  const dateStart = body?.dateStart ? String(body.dateStart) : null // 'YYYY-MM-DD'
  const dateEnd   = body?.dateEnd   ? String(body.dateEnd)   : null

  if (!groupId || !tripName) {
    return NextResponse.json({ error: 'groupId and tripName are required' }, { status: 400 })
  }

  const result = await notifyTripCreated({ groupId, tripName, dateStart, dateEnd })
  // result มี { ok: true, sent: N } อยู่แล้ว — ไม่ต้องเติม ok อีก
  return NextResponse.json(result)
}
