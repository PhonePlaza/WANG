// src/app/api/trip/run-start-reminder/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyTripStart } from '@/lib/notifications'

/** คืน YYYY-MM-DD ตามโซนเวลาไทย */
function todayYMD_AsiaBangkok() {
  const d = new Date()
  const parts = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const dd = parts.find(p => p.type === 'day')!.value
  return `${y}-${m}-${dd}`
}

export async function POST(req: Request) {
  const supabase = await createClient()

  // อนุญาต override วันที่ตอนเทสต์: { "date": "YYYY-MM-DD" }
  const body = await req.json().catch(() => ({}))
  const targetDate = String(body?.date || todayYMD_AsiaBangkok())

  // หา trips ที่เริ่มวันนี้ และยังไม่แจ้ง (รองรับค่า null)
  const { data: trips, error } = await supabase
    .from('trips')
    .select('trip_id')
    .eq('date_range_start', targetDate)
    .or('trip_start_notified.is.null,trip_start_notified.eq.false')

  if (error) {
    console.error('run-start-reminder query error:', error)
    return NextResponse.json({ error: 'query_failed' }, { status: 500 })
  }

  let sentTotal = 0
  const processedIds: number[] = []

  for (const t of trips || []) {
    try {
      const res = await notifyTripStart(Number(t.trip_id))
      sentTotal += res.sent || 0
      processedIds.push(Number(t.trip_id))
    } catch (e) {
      console.error('notifyTripStart failed for', t.trip_id, e)
    }
  }

  if (processedIds.length) {
    const { error: updErr } = await supabase
      .from('trips')
      .update({ trip_start_notified: true })
      .in('trip_id', processedIds)
    if (updErr) console.error('update trip_start_notified failed:', updErr)
  }

  return NextResponse.json({ ok: true, scanned: (trips || []).length, sent: sentTotal })
}

/** ให้ cron/health-call ยิงเป็น GET ได้ด้วย (proxy ไป POST) */
export async function GET(req: Request) {
  return POST(req)
}
