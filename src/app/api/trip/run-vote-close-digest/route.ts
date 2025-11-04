// src/app/api/trip/run-vote-close-digest/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyVoteClosed } from '@/lib/notifications'

// คืนค่า YYYY-MM-DD (ใช้เทสต์ย้อนหลังได้ผ่าน body.date)
function todayYMD() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export async function POST(req: Request) {
  const supabase = await createClient()

  // รับ { date: 'YYYY-MM-DD' } เพื่อใช้ทดสอบย้อนหลัง/ล่วงหน้า
  const body = await req.json().catch(() => ({}))
  const targetDate = String(body?.date || todayYMD())

  // หาเฉพาะทริปที่เป็น "โหวต" (มี vote_close_date) และยังไม่ส่งสรุป
  const { data: trips, error } = await supabase
    .from('trips')
    .select('trip_id')
    .eq('vote_close_date', targetDate)
    .or('vote_close_notified.is.null,vote_close_notified.eq.false')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!trips?.length) {
    return NextResponse.json({ ok: true, scanned: 0, sent: 0 })
  }

  let sentTotal = 0
  for (const t of trips) {
    // ส่งสรุปผลโหวตให้ "สมาชิกของทริปนี้" (ไม่ใช่ทั้งกลุ่ม)
    const res = await notifyVoteClosed(Number(t.trip_id))
    sentTotal += res?.sent || 0

    // มาร์กว่าแจ้งแล้ว กันส่งซ้ำ
    await supabase
      .from('trips')
      .update({ vote_close_notified: true })
      .eq('trip_id', t.trip_id)
  }

  return NextResponse.json({ ok: true, scanned: trips.length, sent: sentTotal })
}
