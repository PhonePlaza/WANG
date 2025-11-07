export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getGroupMemberEmails, sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const { groupId, subject, html } = await req.json(); 
    const gid = Number(groupId); 

    if (!gid) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 });
    }

    // ดึงข้อมูล user ที่ล็อกอินอยู่
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not logged in' }, { status: 401 });
    }

    // ดึงอีเมลสมาชิกในกลุ่ม
    const members = await getGroupMemberEmails(gid); // [{ email, full_name }]
    const emails = members.map(m => m.email).filter(Boolean);

    if (emails.length === 0) {
      return NextResponse.json({ ok: true, info: 'No recipients in this group' });
    }

    // เนื้อหาเริ่มต้น (ถ้าไม่ได้ส่งมาเอง)
    const memberList = members
      .map((m, i) => `${i + 1}. ${m.full_name || m.email}`)
      .join('<br/>');

    await sendEmail({
      to: emails,
      subject: subject || `ทดสอบแจ้งเตือน ถึงสมาชิก Group #${gid}`,
      html: html || `<p>สวัสดีสมาชิก Group #${gid}</p><p>สมาชิกในกลุ่มตอนนี้:</p><p>${memberList}</p>`,
    });

    return NextResponse.json({ ok: true, sent: emails.length, to: emails });
  } catch (err: any) {
    console.error('send-email error:', err);
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
