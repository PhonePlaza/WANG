// src/app/api/trip/run-start-reminder/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyTripStart } from '@/lib/notifications'

// แปลงวันที่เป็น 'YYYY-MM-DD' (โซนเวลาไทยถ้าจำเป็น)
function toDateStr(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function POST(req: Request) {
  const supabase = await createClient()

  // (ทางเลือก) ป้องกันด้วย secret header
  // const key = req.headers.get('x-cron-key')
  // if (key !== process.env.CRON_KEY) {
  //   return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  // }

  const body = await req.json().catch(() => ({}))
  // อนุญาตให้ override วัน เพื่อทดสอบง่าย ๆ
  const today = body?.date || toDateStr(new Date())

  // หา trips ที่เริ่มวันนี้และยังไม่เคยแจ้งเตือน
  const { data: trips, error } = await supabase
    .from('trips')
    .select('trip_id')
    .eq('date_range_start', today)
    .eq('trip_start_notified', false)

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
