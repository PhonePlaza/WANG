// src/lib/email.ts
import 'server-only';
import { createClient as createServerClient } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';

/** ดึงอีเมลสมาชิกในกลุ่มด้วย RPC (ใช้ฝั่ง Group-level notifications) */
export async function getGroupMemberEmails(groupId: number) {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc('emails_for_group', { gid: groupId });
  if (error) throw error;
  return (data || []) as { email: string; full_name: string }[];
}

/**
 * ✅ ดึงอีเมลสมาชิกในทริป ตาม trip_id
 * - onlyJoined: true จะดึงเฉพาะสมาชิกที่ status = 'JOINED'
 * - excludeUid: กันอีเมลของ user_id นี้ (เช่น คนที่เพิ่ง join) ออกจากผู้รับ
 */
export async function getTripMemberEmailsByTrip(
  tripId: number,
  opts?: { onlyJoined?: boolean; excludeUid?: string }
) {
  const supabase = await createServerClient();

  // 1) user_id ในทริป
  let q = supabase.from('trip_members').select('user_id').eq('trip_id', tripId);
  if (opts?.onlyJoined) q = q.eq('status', 'JOINED');
  if (opts?.excludeUid) q = q.neq('user_id', opts.excludeUid);

  const { data: members, error: mErr } = await q;
  if (mErr) throw mErr;

  const uids = (members || []).map(m => String(m.user_id)).filter(Boolean);
  if (!uids.length) return [] as { email: string; full_name: string }[];

  // 2) โปรไฟล์: ใช้ id (ไม่ใช่ uid)
  const { data: profs, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', uids);

  if (pErr) throw pErr;

  return (profs || []).map(p => ({
    email: String(p.email),
    full_name: (p.full_name as string) ?? '',
  }));
}

// ---------- SMTP sender (Brevo) ----------
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,                        // ex: smtp-relay.brevo.com
  port: Number(process.env.BREVO_SMTP_PORT || 587),         // 587 = STARTTLS, 465 = SSL
  secure: String(process.env.BREVO_SMTP_PORT) === '465',    // true ถ้าใช้ 465
  auth: {
    user: process.env.BREVO_SMTP_USER!,
    pass: process.env.BREVO_SMTP_PASS!,
  },
});

/** ส่งอีเมล (จะข้ามถ้าไม่มีผู้รับ) */
export async function sendEmail(opts: { to: string[]; subject: string; html: string }) {
  const toList = (opts.to || []).filter(Boolean);
  if (!toList.length) return;

  try {
    await transporter.sendMail({
      from: process.env.BREVO_FROM || 'WANG <no-reply@example.com>',
      to: toList.join(','),
      subject: opts.subject,
      html: opts.html,
    });
  } catch (err) {
    // log ไว้ช่วยดีบัก SMTP (จะไม่ throw เพื่อไม่ให้ flow หลุด ในบางกรณีที่อยากให้ตกแต่ง UI ต่อได้)
    console.error('sendEmail error:', err);
  }
}
