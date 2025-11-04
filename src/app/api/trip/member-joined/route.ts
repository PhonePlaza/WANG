// src/app/api/trip/member-joined/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyTripJoined } from '@/lib/notifications'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const tripId = Number(body?.tripId)
  if (!tripId) return NextResponse.json({ error: 'tripId is required' }, { status: 400 })

  // ดึงชื่อจาก profiles ถ้ามี (เพื่อให้ email ดูดีขึ้น)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const joiner = {
    id: user.id,
    email: profile?.email ?? user.email ?? null,
    name: profile?.full_name ?? null,
  }

  const result = await notifyTripJoined(tripId, joiner, { excludeSelf: true })
  return NextResponse.json(result)
}
