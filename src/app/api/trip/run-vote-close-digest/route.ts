// src/app/api/trip/run-vote-close-digest/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyVoteClosed } from '@/lib/notifications'

/** คืน YYYY-MM-DD ตามเวลา Asia/Bangkok (เหมาะกับคอลัมน์ DATE) */
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

  // อนุญาตให้ override วันที่ตอนเทสต์: { "date": "YYYY-MM-DD" }
  const body = await req.json().catch(() => ({}))
  const targetDate = String(body?.date || todayYMD_AsiaBangkok())

  // หาทริปที่มีวันปิดโหวต = targetDate และยังไม่เคยส่ง (รองรับ null/false)
  const { data: trips, error } = await supabase
    .from('trips')
    .select('trip_id')
    .eq('vote_close_date', targetDate)
    .or('vote_close_notified.is.null,vote_close_notified.eq.false')

  if (error) {
    console.error('run-vote-close-digest query error:', error)
    return NextResponse.json({ error: 'query_failed' }, { status: 500 })
  }

  if (!trips?.length) {
    return NextResponse.json({ ok: true, scanned: 0, sent: 0 })
  }

  let sentTotal = 0
  const processedIds: number[] = []

  for (const t of trips) {
    try {
      // ส่งให้ "สมาชิกทริป" เท่านั้น (ฟังก์ชันนี้จะดึงอีเมลจาก trip_members)
      const res = await notifyVoteClosed(Number(t.trip_id))
      sentTotal += res?.sent || 0
      processedIds.push(Number(t.trip_id))
    } catch (e) {
      console.error('notifyVoteClosed failed for', t.trip_id, e)
    }
  }

  if (processedIds.length) {
    const { error: updErr } = await supabase
      .from('trips')
      .update({ vote_close_notified: true })
      .in('trip_id', processedIds)

    if (updErr) console.error('update vote_close_notified failed:', updErr)
  }

  return NextResponse.json({ ok: true, scanned: trips.length, sent: sentTotal })
}

/** ให้ยิงแบบ GET ได้ด้วย (สะดวกสำหรับ cron/health check); ภายในเรียก POST */
export async function GET(req: Request) {
  return POST(req)
}
