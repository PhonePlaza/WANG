'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type GroupDetail = { group_id: number; group_name: string; join_code: string; num_member: number };
type MemberRow   = { user_id: string; email: string | null };

export default function GroupDetail({
  groupId,
  onBack,
  onLeft, 
}: {
  groupId: number;
  onBack: () => void;
  onLeft?: () => Promise<void> | void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  async function loadDetail() {
    setLoading(true);
    setErrMsg(null);

    const [d1, d2] = await Promise.all([
      supabase.rpc('fn_group_detail', { p_group_id: groupId }),
      supabase.rpc('fn_group_members', { p_group_id: groupId }),
    ]);

    if (d1.error) {
      setErrMsg(d1.error.message ?? 'ไม่สามารถโหลดข้อมูลกลุ่มได้');
      setLoading(false);
      return;
    }
    const row = Array.isArray(d1.data) ? d1.data[0] : d1.data;
    if (!row) {
      setErrMsg('ไม่พบกลุ่ม หรือคุณไม่ได้เป็นสมาชิกของกลุ่มนี้');
      setLoading(false);
      return;
    }
    setDetail({
      group_id: row.group_id,
      group_name: row.group_name,
      join_code: row.join_code,
      num_member: Number(row.num_member ?? 0),
    });

    if (d2.error) {
      setErrMsg(d2.error.message ?? 'โหลดรายชื่อสมาชิกไม่สำเร็จ');
    } else {
      setMembers((Array.isArray(d2.data) ? d2.data : []).map((m: any) => ({
        user_id: m.user_id,
        email: m.email ?? null,
      })));
    }
    setLoading(false);
  }

  async function handleLeave() {
    if (!confirm('ต้องการออกจากกลุ่มนี้ใช่หรือไม่?')) return;
    setLeaving(true);
    const { data, error } = await supabase.rpc('fn_leave_group', { p_group_id: groupId });
    setLeaving(false);
    if (error) {
      alert(error.message ?? 'ออกจากกลุ่มไม่สำเร็จ');
      return;
    }
    
    if (onLeft) await onLeft();
    onBack();
  }

  useEffect(() => { if (!Number.isNaN(groupId)) loadDetail(); }, [groupId]); // eslint-disable-line

  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5 sm:p-7">
      <button onClick={onBack} className="text-sm text-neutral-600 hover:underline mb-4">
        ← กลับหน้ากลุ่ม
      </button>

      {errMsg && (
        <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">{errMsg}</div>
      )}

      {loading ? (
        <div className="text-neutral-400">กำลังโหลดข้อมูลกลุ่ม…</div>
      ) : detail ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{detail.group_name}</h1>
              <div className="text-sm text-neutral-600 mt-1">
                รหัสเข้าร่วม: <span className="font-mono tracking-wider">{detail.join_code}</span>
              </div>
              <div className="text-sm text-neutral-600">
                สมาชิกทั้งหมด: <span className="font-semibold">{detail.num_member}</span>
              </div>
            </div>
            <button
              onClick={handleLeave}
              disabled={leaving}
              className={`rounded-xl px-4 py-2 text-sm font-semibold text-white shadow transition ${
                leaving ? 'bg-neutral-400' : 'bg-red-600 hover:bg-red-700'
              }`}
              title="ออกจากกลุ่มนี้"
            >
              {leaving ? 'กำลังออก…' : 'ออกจากกลุ่ม'}
            </button>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-2">สมาชิก</h2>
            {members.length === 0 ? (
              <div className="text-neutral-500 text-sm">ยังไม่มีรายชื่อสมาชิกให้แสดง</div>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.user_id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <span className="truncate">{m.email ?? m.user_id}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}