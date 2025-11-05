// src/app/api/trip/run-all/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { notifyTripJoinDeadline, notifyTripStart, notifyVoteClosed } from '@/lib/notifications'
import { createClient } from '@/lib/supabase/server'

function todayYMD_AsiaBangkok() {
  const d = new Date()
  const parts = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d)
  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const dd = parts.find(p => p.type === 'day')!.value
  return `${y}-${m}-${dd}`
}

// รวม logic ของ 3 งานไว้ที่เดียว
async function runAllForDate(targetDate: string) {
  const supabase = await createClient()

  // 1) JOIN DEADLINE (วันนี้ + ยังไม่ส่ง)
  const { data: tripsDeadline } = await supabase
    .from('trips')
    .select('trip_id')
    .eq('join_deadline', targetDate)
    .or('join_deadline_notified.is.null,join_deadline_notified.eq.false')

  let sentDeadline = 0
  const doneDeadline: number[] = []
  for (const t of tripsDeadline || []) {
    const r = await notifyTripJoinDeadline(Number(t.trip_id))
    sentDeadline += r?.sent || 0
    doneDeadline.push(Number(t.trip_id))
  }
  if (doneDeadline.length) {
    await supabase.from('trips')
      .update({ join_deadline_notified: true })
      .in('trip_id', doneDeadline)
  }

  // 2) TRIP START TODAY (และยังไม่ส่ง)
  const { data: tripsStart } = await supabase
    .from('trips')
    .select('trip_id')
    .eq('date_range_start', targetDate)
    .or('trip_start_notified.is.null,trip_start_notified.eq.false')

  let sentStart = 0
  const doneStart: number[] = []
  for (const t of tripsStart || []) {
    const r = await notifyTripStart(Number(t.trip_id))
    sentStart += r?.sent || 0
    doneStart.push(Number(t.trip_id))
  }
  if (doneStart.length) {
    await supabase.from('trips')
      .update({ trip_start_notified: true })
      .in('trip_id', doneStart)
  }

  // 3) VOTE CLOSE TODAY (และยังไม่ส่ง)
  const { data: tripsVote } = await supabase
    .from('trips')
    .select('trip_id')
    .eq('vote_close_date', targetDate)
    .or('vote_close_notified.is.null,vote_close_notified.eq.false')

  let sentVote = 0
  const doneVote: number[] = []
  for (const t of tripsVote || []) {
    const r = await notifyVoteClosed(Number(t.trip_id))
    sentVote += r?.sent || 0
    doneVote.push(Number(t.trip_id))
  }
  if (doneVote.length) {
    await supabase.from('trips')
      .update({ vote_close_notified: true })
      .in('trip_id', doneVote)
  }

  return {
    scanned: {
      deadline: (tripsDeadline || []).length,
      start: (tripsStart || []).length,
      vote: (tripsVote || []).length,
    },
    sent: { deadline: sentDeadline, start: sentStart, vote: sentVote },
    totalSent: sentDeadline + sentStart + sentVote,
  }
}

// Vercel cron จะยิง GET มา
export async function GET() {
  const date = todayYMD_AsiaBangkok()
  const res = await runAllForDate(date)
  return NextResponse.json({ ok: true, date, ...res })
}

// เผื่อทดสอบเอง: POST { "date": "YYYY-MM-DD" }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const date = String(body?.date || todayYMD_AsiaBangkok())
  const res = await runAllForDate(date)
  return NextResponse.json({ ok: true, date, ...res })
}
