// src/app/api/trip/notify-created/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyTripCreated } from '@/lib/notifications'

const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))

  const groupId  = Number(body?.groupId)
  const tripName = String(body?.tripName ?? '').trim()

  const dateStart =
    body?.dateStart && YMD.test(body.dateStart) ? String(body.dateStart) : null
  const dateEnd =
    body?.dateEnd && YMD.test(body.dateEnd) ? String(body.dateEnd) : null

  if (!groupId || !tripName) {
    return NextResponse.json({ error: 'groupId and tripName are required' }, { status: 400 })
  }

  // ➜ ส่งต่อเป็น string YYYY-MM-DD ตรง ๆ ห้าม new Date(...).toISOString()
  const result = await notifyTripCreated({ groupId, tripName, dateStart, dateEnd })
  return NextResponse.json(result)
}
