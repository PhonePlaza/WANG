// src/lib/notifications.ts
import {
  getGroupMemberEmails,
  getTripMemberEmailsByTrip,
  sendEmail,
} from '@/lib/email';
import { createClient } from '@/lib/supabase/server';

type Joiner = { id: string; email?: string | null; name?: string | null };

/* ───────────────── helpers ───────────────── */

async function getGroupName(groupId: number): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('group')
    .select('group_name')
    .eq('group_id', groupId)
    .single();

  if (error) {
    console.warn('getGroupName error:', error);
    return null;
  }
  return (data?.group_name as string) ?? null;
}

async function getTripInfo(
  tripId: number,
): Promise<{ tripName: string; groupId: number } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trips')
    .select('trip_name, group_id')
    .eq('trip_id', tripId)
    .single();

  if (error || !data) {
    console.warn('getTripInfo error:', error);
    return null;
  }
  return { tripName: String(data.trip_name), groupId: Number(data.group_id) };
}

/* ───────────────── group notifications ───────────────── */

export async function notifyGroupJoined(
  groupId: number,
  joiner: Joiner,
  { excludeSelf = true }: { excludeSelf?: boolean } = {},
) {
  const members = await getGroupMemberEmails(groupId); // [{email, full_name}]
  let recipients = members.map(m => m.email).filter(Boolean) as string[];

  // กันเมลเด้งหาตัวเอง
  if (excludeSelf && joiner.email) {
    const me = joiner.email.toLowerCase();
    recipients = recipients.filter(e => e.toLowerCase() !== me);
  }
  recipients = Array.from(new Set(recipients));
  if (!recipients.length) return { ok: true, sent: 0 };

  const groupLabel = (await getGroupName(groupId)) ?? 'กลุ่มของคุณ';
  const display = joiner.name || joiner.email || 'สมาชิกใหม่';

  const subject = `👋 ${display} เข้าร่วมกลุ่ม ${groupLabel} แล้ว`;
  const html = `
    <p>สวัสดีสมาชิกกลุ่ม <b>${groupLabel}</b></p>
    <p><b>${display}</b> เข้าร่วมกลุ่มแล้วจ้า 🎉</p>
    <hr/>
    <p>พร้อมสนุกไปกับทุกคนแล้ว🥰</p>
  `.trim();

  await sendEmail({ to: recipients, subject, html });
  return { ok: true, sent: recipients.length };
}

/* ───────────────── trip created ───────────────── */

export async function notifyTripCreated(params: {
  groupId: number;
  tripName: string;
  dateStart?: string | null; // 'YYYY-MM-DD'
  dateEnd?: string | null;   // 'YYYY-MM-DD'
}) {
  const { groupId, tripName, dateStart, dateEnd } = params;

  const members = await getGroupMemberEmails(groupId);
  let recipients = members.map(m => m.email).filter(Boolean) as string[];
  recipients = Array.from(new Set(recipients));
  if (!recipients.length) return { ok: true, sent: 0 };

  const groupLabel = (await getGroupName(groupId)) ?? 'กลุ่มของคุณ';
  const dateLine =
    dateStart && dateEnd
      ? `<p>📅 วันที่ทริป: <b>${dateStart}</b> – <b>${dateEnd}</b></p>`
      : '';

  const subject = `🆕 สร้างทริปใหม่ใน ${groupLabel}: ${tripName}`;
  const html = `
    <p>มีการสร้างทริปใหม่ใน <b>${groupLabel}</b></p>
    <p>ชื่อทริป: <b>${tripName}</b></p>
    ${dateLine}
    <hr/>
    <p>เปิดแอปเพื่อดูรายละเอียด/เข้าร่วมทริปได้เลย</p>
  `.trim();

  await sendEmail({ to: recipients, subject, html });
  return { ok: true, sent: recipients.length };
}

/* ───────────────── trip joined ───────────────── */

export async function notifyTripJoined(
  tripId: number,
  joiner: Joiner,
  { excludeSelf = true }: { excludeSelf?: boolean } = {},
) {
  // ใช้สำหรับหัวเรื่อง/รายละเอียด
  const info = await getTripInfo(tripId);
  if (!info) return { ok: true, sent: 0 };

  // ดึงเฉพาะสมาชิกของ "ทริปนี้" ที่ JOINED แล้ว และกันคนที่เพิ่ง join ออก
  const members = await getTripMemberEmailsByTrip(tripId, {
    onlyJoined: true,
    excludeUid: excludeSelf ? joiner.id : undefined,
  });

  let recipients = members.map(m => m.email).filter(Boolean) as string[];
  // กันกรณีโปรไฟล์ไม่มี uid match แต่มีอีเมลตรงกับ joiner
  if (excludeSelf && joiner.email) {
    const me = joiner.email.toLowerCase();
    recipients = recipients.filter(e => e.toLowerCase() !== me);
  }
  recipients = Array.from(new Set(recipients));
  if (!recipients.length) return { ok: true, sent: 0 };

  const groupLabel = (await getGroupName(info.groupId)) ?? 'กลุ่มของคุณ';
  const tripLabel = info.tripName || `Trip #${tripId}`;
  const display = joiner.name || joiner.email || 'สมาชิกใหม่';

  const subject = `✅ ${display} เข้าร่วมทริป: ${tripLabel}`;
  const html = `
    <p>มีสมาชิกเข้าร่วมทริป <b>${tripLabel}</b> ในกลุ่ม <b>${groupLabel}</b></p>
    <p>ผู้เข้าร่วม: <b>${display}</b></p>
    <hr/>
    <p>เปิดแอปเพื่อดูรายชื่อ/จัดการทริปได้เลย</p>
  `.trim();

  await sendEmail({ to: recipients, subject, html });
  return { ok: true, sent: recipients.length };
}

///* ───────────────── trip join deadline passed ───────────────── */
type TripMember = { user_id: string; status: string | null; name: string | null }

export async function notifyTripJoinDeadline(tripId: number) {
  const supabase = await createClient()

  // 1) ดึงข้อมูลทริป
  const { data: trip, error: tErr } = await supabase
    .from('trips')
    .select('trip_name, group_id, join_deadline')
    .eq('trip_id', tripId)
    .single()
  if (tErr || !trip) return { ok: true, sent: 0 }

  // 2) สมาชิกทุกคนในทริป (ทุกสถานะ) -> รายชื่อผู้รับ
  const { data: tm, error: tmErr } = await supabase
    .from('trip_members')
    .select('user_id, status, name')
    .eq('trip_id', tripId)
  if (tmErr || !tm?.length) return { ok: true, sent: 0 }

  const uids = Array.from(new Set(tm.map(r => String(r.user_id))))
  const { data: profs, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', uids)
  if (pErr || !profs) return { ok: true, sent: 0 }

  // recipients = อีเมลทุกคนในทริป (กันว่าง/ซ้ำ)
  const recipients = Array.from(
    new Set(profs.map(p => String(p.email)).filter(Boolean))
  )
  if (!recipients.length) return { ok: true, sent: 0 }

  // 3) สร้างสรุปรายชื่อผู้ที่ JOINED
  const joinedUIDs = tm.filter(r => r.status === 'JOINED').map(r => r.user_id)
  const joinedSet = new Set(joinedUIDs)
  const joinedList = profs
    .filter(p => joinedSet.has(p.id))
    .map(p => p.full_name || p.email || 'ผู้ใช้ไม่ระบุชื่อ')

  const groupLabel = (await getGroupName(trip.group_id)) ?? 'กลุ่มของคุณ'
  const tripLabel  = (trip.trip_name as string) ?? `Trip #${tripId}`
  const deadline   = String(trip.join_deadline)

  const subject = `📢 ปิดรับสมัครแล้ว: สรุปผู้เข้าร่วมทริป ${tripLabel}`
  const html = `
    <p>ทริป <b>${tripLabel}</b> ในกลุ่ม <b>${groupLabel}</b> ปิดรับสมัครแล้ว (วันที่: <b>${deadline}</b>)</p>
    <p><b>รายชื่อผู้เข้าร่วม (JOINED):</b></p>
    ${
      joinedList.length
        ? `<ul>${joinedList.map(n => `<li>${n}</li>`).join('')}</ul>`
        : `<p><i>ยังไม่มีผู้เข้าร่วม</i></p>`
    }
    <hr/>
    <p>เปิดแอปเพื่อดูสรุป/จัดการทริปได้เลย</p>
  `.trim()

  await sendEmail({ to: recipients, subject, html })
  return { ok: true, sent: recipients.length }
}

/** ✅ แจ้งเตือนเมื่อถึงวันเริ่มทริป (date_range_start) */
export async function notifyTripStart(tripId: number) {
  const supabase = await createClient()

  // อ่านชื่อทริป/กลุ่ม/วันที่
  const { data: trip, error } = await supabase
    .from('trips')
    .select('trip_name, group_id, date_range_start')
    .eq('trip_id', tripId)
    .single()

  if (error || !trip) {
    console.warn('notifyTripStart: trip not found', error)
    return { ok: true, sent: 0 }
  }

  // เอาอีเมลเฉพาะคนที่ JOINED ในทริปนี้
  const { data: members, error: tmErr } = await supabase
    .from('trip_members')
    .select('user_id')
    .eq('trip_id', tripId)
    .eq('status', 'JOINED')

  if (tmErr || !members?.length) return { ok: true, sent: 0 }

  const uids = [...new Set(members.map(m => String(m.user_id)))]

  const { data: profs, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', uids)

  if (pErr || !profs?.length) return { ok: true, sent: 0 }

  const recipients = profs.map(p => String(p.email)).filter(Boolean)
  if (!recipients.length) return { ok: true, sent: 0 }

  const groupLabel = (await getGroupName(Number(trip.group_id))) ?? 'กลุ่มของคุณ'
  const tripLabel  = (trip.trip_name as string) || `Trip #${tripId}`
  const startDate  = String(trip.date_range_start) // 'YYYY-MM-DD'

  const subject = `🚐 ออกเดินทางวันนี้: ${tripLabel}`
  const html = `
    <p>วันนี้ <b>${startDate}</b> คือวันเริ่มทริป <b>${tripLabel}</b> ของกลุ่ม <b>${groupLabel}</b> 🎉</p>
    <p>เตรียมตัวให้พร้อม แล้วเจอกันนะ!</p>
    <hr/>
    <p>เปิดแอปเพื่อดูรายละเอียดและรายชื่อผู้ร่วมทริป</p>
  `.trim()

  await sendEmail({ to: recipients, subject, html })
  return { ok: true, sent: recipients.length }
}
