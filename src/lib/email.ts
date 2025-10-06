import 'server-only';
import { createClient as createServerClient } from '@/lib/supabase/server';
import nodemailer from 'nodemailer';

export async function getGroupMemberEmails(groupId: number) {
  const supabase = await createServerClient();
  const { data, error } = await supabase.rpc('emails_for_group', { gid: groupId });
  if (error) throw error;
  return (data || []) as { email: string; full_name: string }[];
}

// ---------- SMTP sender (Brevo) ----------
const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,    // ex: smtp-relay.brevo.com
  port: Number(process.env.BREVO_SMTP_PORT || 587), // 587 = STARTTLS, 465 = SSL
  secure: String(process.env.BREVO_SMTP_PORT) === '465', // true เมื่อใช้ 465
  auth: {
    user: process.env.BREVO_SMTP_USER, // SMTP login (มักเป็นอีเมลหรือคีย์)
    pass: process.env.BREVO_SMTP_PASS, // SMTP password
  },
});

export async function sendEmail(opts: { to: string[]; subject: string; html: string }) {
  const toList = (opts.to || []).filter(Boolean);
  if (!toList.length) return;

  await transporter.sendMail({
    from: process.env.BREVO_FROM || 'WANG <no-reply@example.com>', // คุณตั้งไว้แล้ว
    to: toList.join(','), // หรือจะ map เป็นหลายคนก็ได้
    subject: opts.subject,
    html: opts.html,
  });
}
