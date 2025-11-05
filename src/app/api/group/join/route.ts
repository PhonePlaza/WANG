// src/app/api/group/join/route.ts
export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyGroupJoined } from '@/lib/notifications'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not logged in' }, { status: 401 })

  const { groupId } = await req.json()
  const gid = Number(groupId)
  if (!gid) return NextResponse.json({ error: 'groupId is required' }, { status: 400 })

  // 1) เพิ่มสมาชิกเข้ากลุ่ม (ปรับชื่อตาราง/คอลัมน์ให้ตรงของคุณ)
  const { error: joinErr } = await supabase
    .from('group_members')
    .insert({ group_id: gid, user_id: user.id })
  if (joinErr) return NextResponse.json({ error: joinErr.message }, { status: 400 })

  // 2) แจ้งเตือนสมาชิกในกลุ่ม (ยกเว้นคนที่เพิ่ง join)
  const res = await notifyGroupJoined(gid, {
    id: user.id,
    email: user.email,
    name: (user.user_metadata?.name as string) || null,
  }, { excludeSelf: true })

  return NextResponse.json({ ok: true, notified: res.sent })
}
