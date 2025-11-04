// src/lib/notifications.ts
import { getGroupMemberEmails, sendEmail } from '@/lib/email'
import { createClient } from '@/lib/supabase/server'

type Joiner = { id: string; email?: string | null; name?: string | null }

// ตัวช่วย: ดึงชื่อกลุ่มจาก group_id (ถ้าอ่านไม่ได้จะคืน null)
async function getGroupName(groupId: number): Promise<string | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('group') // ชื่อตาราง
    .select('group_name') // ชื่อคอลัมน์
    .eq('group_id', groupId) // เงื่อนไข
    .single() // คาดหวังแถวเดียว

  if (error) {
    console.warn('getGroupName error:', error)
    return null
  }
  return (data?.group_name as string) ?? null
}

export async function notifyGroupJoined(
  groupId: number,
  joiner: Joiner,
  { excludeSelf = true }: { excludeSelf?: boolean } = {}
) {
  // 1) ดึงอีเมลสมาชิกในกลุ่ม
  const members = await getGroupMemberEmails(groupId) // [{ email, full_name }]
  let recipients = members.map(m => m.email).filter(Boolean) as string[]

  // 2) ไม่ส่งหาคนที่เพิ่ง join (กันเมลเด้งหาตัวเอง)
  if (excludeSelf && joiner.email) {
    const me = joiner.email.toLowerCase()
    recipients = recipients.filter(e => e.toLowerCase() !== me)
  }
  if (!recipients.length) return { ok: true, sent: 0 }

  // 3) ดึงชื่อกลุ่ม (ถ้าอ่านไม่ได้จะ fallback เป็น #ID)
  const groupName = await getGroupName(groupId)
  const groupLabel = groupName ?? 'กลุ่มของคุณ'

  // 4) เนื้อหาเมล
  const display = joiner.name || joiner.email || 'สมาชิกใหม่'
  const subject = `👋 ${display} เข้าร่วมกลุ่ม ${groupLabel} แล้ว`
  const html = `
    <p>สวัสดีสมาชิกกลุ่ม <b>${groupLabel}</b></p>
    <p> <b>${display}</b> เข้าร่วมกลุ่มแล้วจ้า 🎉</p>
    <hr/>
    <p>พร้อมสนุกไปกับทุกคนแล้ว🥰</p>
  `.trim()

  // 5) ส่งเมล
  await sendEmail({ to: recipients, subject, html })
  return { ok: true, sent: recipients.length }
}

/** ✅ แจ้งเตือนเมื่อมีการสร้างทริปใหม่ในกลุ่ม */
export async function notifyTripCreated(params: {
  groupId: number
  tripName: string
  dateStart?: string | null // 'YYYY-MM-DD' (optional)
  dateEnd?: string | null   // 'YYYY-MM-DD' (optional)
}) {
  const { groupId, tripName, dateStart, dateEnd } = params

  // ดึงผู้รับ (สมาชิกในกลุ่มทั้งหมด)
  const members = await getGroupMemberEmails(groupId) // [{email, full_name}]
  const recipients = Array.from(new Set(members.map(m => m.email).filter(Boolean))) as string[]
  if (!recipients.length) return { ok: true, sent: 0 }

  // ดึงชื่อกลุ่ม (ถ้าอ่านไม่ได้จะ fallback เป็นคำกลาง ๆ)
  const groupName = (await getGroupName(groupId)) ?? 'กลุ่มของคุณ'

  // สร้างเนื้อหาเมล
  const dateLine =
    dateStart && dateEnd
      ? `<p>📅 วันที่ทริป: <b>${dateStart}</b> – <b>${dateEnd}</b></p>`
      : ''

  const subject = `🆕 สร้างทริปใหม่ใน ${groupName}: ${tripName}`
  const html = `
    <p>มีการสร้างทริปใหม่ใน <b>${groupName}</b></p>
    <p>ชื่อทริป: <b>${tripName}</b></p>
    ${dateLine}
    <hr/>
    <p>เปิดแอปเพื่อดูรายละเอียด/เข้าร่วมทริปได้เลย</p>
  `.trim()

  await sendEmail({ to: recipients, subject, html })
  return { ok: true, sent: recipients.length }
}