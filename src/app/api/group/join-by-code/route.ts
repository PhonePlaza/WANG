// src/app/api/group/join-by-code/route.ts
// API ตัวนี้ทำ 3 อย่าง:
// 1) รับรหัสโค้ดกลุ่ม (8 ตัวอักษร/ตัวเลข)
// 2) เรียก RPC fn_join_group เพื่อให้ผู้ใช้ที่ล็อกอินอยู่ "เข้ากลุ่ม"
// 3) เมื่อเข้ากลุ่มสำเร็จ → ส่งอีเมลแจ้งสมาชิกเดิมในกลุ่ม (ยกเว้นคนที่เพิ่ง join)

export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyGroupJoined } from '@/lib/notifications'

// ตัวช่วยตรวจรูปแบบโค้ด (A-Z, a-z, 0-9 จำนวน 8 ตัวอักษร)
function isValidCode(code: string) {
    return /^[A-Za-z0-9]{8}$/.test(code.trim())
}

export async function POST(req: Request) {
    // 0) สร้าง Supabase server client และเอาข้อมูล user ที่ล็อกอินอยู่
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // ถ้าไม่ล็อกอิน → หยุด
    if (!user) {
        return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
    }

    // 1) ดึงค่า "code" จาก body แล้วตรวจรูปแบบ
    const body = await req.json().catch(() => ({}))
    const inputCode = String(body?.code ?? '').trim()

    if (!isValidCode(inputCode)) {
        return NextResponse.json({ error: 'invalid code' }, { status: 400 })
    }

    // 2) เรียก RPC fn_join_group ให้ user คนนี้เข้ากลุ่มจากรหัส (ฝั่ง DB ของคุณต้องมี RPC นี้แล้ว)
    //    หมายเหตุ: รูปร่าง data ที่ RPC คืนมาแต่ละโปรเจกต์อาจต่างกัน
    const { data, error } = await supabase.rpc('fn_join_group', { p_code: inputCode })
    if (error || !data) {
        // ถ้า RPC เจอปัญหา (เช่น โค้ดไม่ถูก/กลุ่มไม่พบ/เข้าซ้ำ) เราคืนข้อความจาก DB ออกไปให้ UI ดู
        return NextResponse.json({ error: error?.message || 'join failed' }, { status: 400 })
    }

    // 3) หาค่า groupId ที่เพิ่ง join มา
    // หาค่า groupId จากผล RPC หรือ fallback จากตาราง groups ด้วย join_code
    let gid: number | null =
        (data as any)?.group_id ??
        (data as any)?.id ??
        (data as any)?.gid ??
        null;

    if (gid == null) {
        const { data: g, error: gErr } = await supabase
            .from('group')
            .select('group_id')        // ← ต้องเป็น group_id
            .eq('join_code', inputCode) // ← ค้นด้วย join_code
            .single();

        if (gErr || !g) {
            console.error('fallback query failed:', gErr);
            return NextResponse.json({ error: 'Cannot resolve group id' }, { status: 500 });
        }
        gid = g.group_id;
    }


    // type narrowing: ให้ TS มั่นใจว่าเป็น number
    if (gid == null) {
        return NextResponse.json({ error: 'Group id is null' }, { status: 500 });
    }

    await notifyGroupJoined(
        gid,
        {
            id: user.id,
            email: user.email,
            name: (user.user_metadata?.name as string) || null,
        },
        { excludeSelf: true }
    );


    // 5) สำเร็จ → ส่งผลลัพธ์ให้ฝั่ง UI
    return NextResponse.json({ ok: true, groupId: gid })
}
