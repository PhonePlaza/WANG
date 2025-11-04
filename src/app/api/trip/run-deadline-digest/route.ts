export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyTripJoinDeadline } from '@/lib/notifications'

// คืนค่า YYYY-MM-DD ในโซนระบบ (join_deadline เป็น DATE ไม่ติดเวลาอยู่แล้ว)
function todayYMD() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export async function POST(req: Request) {
  const supabase = await createClient()

  // (เลือกได้) รับ body { date: 'YYYY-MM-DD' } เพื่อทดสอบย้อนหลัง
  const body = await req.json().catch(() => ({}))
  const targetDate = String(body?.date || todayYMD())

  // 1) หา trips ที่ถึงเดดไลน์วันนี้ และยังไม่ส่ง
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

    // 2) มาร์คว่าแจ้งแล้ว กันส่งซ้ำ
    await supabase
      .from('trips')
      .update({ join_deadline_notified: true })
      .eq('trip_id', t.trip_id)
  }

  return NextResponse.json({ ok: true, scanned: trips.length, sent: sentTotal })
}
