// src/app/api/trip/run-deadline-digest/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyTripJoinDeadline } from '@/lib/notifications'

/** คืนค่า YYYY-MM-DD ตามโซนเวลาไทย (Asia/Bangkok) */
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

  // อนุญาต override วันที่: { "date": "YYYY-MM-DD" } สำหรับเทส
  const body = await req.json().catch(() => ({}))
  const targetDate = String(body?.date || todayYMD_AsiaBangkok())

  // หา trips ที่ถึงเดดไลน์วันนี้ และยังไม่เคยส่ง
  const { data: trips, error } = await supabase
    .from('trips')
    .select('trip_id')
    .eq('join_deadline', targetDate)
    .or('join_deadline_notified.is.null,join_deadline_notified.eq.false')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!trips?.length) return NextResponse.json({ ok: true, scanned: 0, sent: 0 })

  let sentTotal = 0
  for (const t of trips) {
    const res = await notifyTripJoinDeadline(Number(t.trip_id))
    sentTotal += res.sent || 0

    // มาร์คว่าแจ้งแล้ว กันส่งซ้ำ
    await supabase
      .from('trips')
      .update({ join_deadline_notified: true })
      .eq('trip_id', t.trip_id)
  }

  return NextResponse.json({ ok: true, scanned: trips.length, sent: sentTotal })
}

/** ให้ Vercel Cron เรียกได้ (มันยิงเป็น GET) */
export async function GET(req: Request) {
  // proxy ไปที่ POST เพื่อใช้ logic เดียวกัน
  return POST(req)
}
