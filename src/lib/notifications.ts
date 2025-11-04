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
