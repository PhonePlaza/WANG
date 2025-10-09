'use client';

import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import GroupDetail from './GroupDetail';

type GroupRowUI = { id: number; name: string; code: string; members: number };

const isValidCode = (code: string) => /^[A-Za-z0-9]{8}$/.test(code.trim());

function Modal({
  open, onClose, children,
}: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function GroupPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const search = useSearchParams();
  const gid = search.get('gid');
  const groupId = gid ? Number(gid) : null;

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, [supabase]);

  const [groups, setGroups] = useState<GroupRowUI[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [newGroupName, setNewGroupName] = useState('');
  const [code, setCode] = useState('');
  const codeOk = isValidCode(code);

  // ---------- Load my groups ----------
  async function loadMyGroups() {
    setLoadingList(true);
    setErrMsg(null);
    const { data, error } = await supabase.rpc('fn_list_my_groups', {});
    if (error) {
      setErrMsg(error.message ?? 'เกิดข้อผิดพลาดในการโหลดกลุ่ม');
      setLoadingList(false);
      return;
    }
    const rows: GroupRowUI[] = (Array.isArray(data) ? data : []).map((r: any) => ({
      id: r.group_id,
      name: r.group_name,
      code: r.join_code,
      members: Number(r.num_member ?? 0),
    }));
    setGroups(rows);
    setLoadingList(false);
  }

  useEffect(() => {
    if (userId) loadMyGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ---------- RPC actions ----------
  async function createGroup() {
    const { data, error } = await supabase.rpc('fn_create_group', {
      p_name: newGroupName.trim(),
      p_code: null,
    });
    if (error || !data) {
      alert(`สร้างกลุ่มไม่สำเร็จ: ${error?.message ?? 'unknown error'}`);
      return;
    }
    await loadMyGroups();
  }

  async function joinGroup() {
    const inputCode = code.trim();
    const { data, error } = await supabase.rpc('fn_join_group', { p_code: inputCode });
    if (error || !data) {
      alert(error?.message ?? 'ไม่พบกลุ่มนี้ กรุณาตรวจสอบรหัส');
      return;
    }
    await loadMyGroups();
  }

  // ---------- Handlers ----------
  const openAddMenu = () => { setShowModal(true); setMode('menu'); };
  const handleCreate = async () => {
    if (!newGroupName.trim()) return;
    await createGroup();
    setNewGroupName('');
    setMode('menu');
    setShowModal(false);
  };
  const handleJoin = async () => {
    if (!codeOk) return;
    await joinGroup();
    setCode('');
    setMode('menu');
    setShowModal(false);
  };

  // ---------- Detail mode (query ?gid=xxx) ----------
  if (groupId) {
    return (
      <main className="min-h-screen w-full bg-neutral-50 overflow-x-hidden">
        <section className="px-4 sm:px-6 py-6">
          <div className="mx-auto max-w-5xl">
            <GroupDetail
              groupId={groupId}
              onBack={() => router.push('/group')}
              onLeft={() => loadMyGroups()}
            />
          </div>
        </section>
      </main>
    );
  }

  // ---------- List mode ----------
  return (
    <main className="min-h-screen w-full bg-neutral-50 overflow-x-hidden">
      <section className="px-4 sm:px-6 pb-10 min-h-0">
        <div className="mx-auto mt-4 sm:mt-6 max-w-5xl">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden min-h-[90vh]">
            <div className="p-4 sm:p-6 h-full max-h-[calc(100vh-220px)] overflow-auto">
              {errMsg && (
                <div className="mb-3 rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">
                  {errMsg}
                </div>
              )}

              {loadingList ? (
                <div className="min-h-[40vh] flex items-center justify-center">
                  <div className="text-neutral-400">กำลังโหลดกลุ่ม…</div>
                </div>
              ) : groups.length === 0 ? (
                <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
                  <div className="text-neutral-400 text-base sm:text-lg">ยังไม่มีกลุ่มที่เข้าร่วม</div>
                  {/* ปุ่ม + เมื่อยังไม่มีรายการ */}
                  <button
                    aria-label="open add menu"
                    onClick={openAddMenu}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-neutral-900 text-white text-3xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition"
                  >
                    +
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-4 md:gap-6">
                  {groups.map((g) => (
                    <Link
                      key={g.id}
                      href={`/group?gid=${g.id}`}
                      className="rounded-xl border p-4 hover:shadow-sm transition block"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-lg">{g.name}</div>
                          <div className="text-sm text-neutral-500">Code: {g.code}</div>
                        </div>
                        <div className="text-sm text-neutral-600">
                          สมาชิก: <span className="font-semibold">{g.members}</span>
                        </div>
                      </div>
                    </Link>
                  ))}

                  {/* ปุ่ม + ใต้รายการกลุ่มตัวสุดท้าย */}
                  <div className="flex justify-center py-4">
                    <button
                      aria-label="open add menu"
                      onClick={openAddMenu}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-neutral-900 text-white text-3xl flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}>
        {mode === 'menu' && (
          <div className="space-y-4 sm:space-y-5">
            <h2 className="text-xl sm:text-2xl font-bold">Join / Create Group</h2>
            <div className="space-y-3">
              <button
                onClick={() => setMode('create')}
                className="w-full rounded-full bg-neutral-900 text-white text-base sm:text-lg font-semibold py-3 sm:py-4 px-6 shadow-md hover:shadow-lg transition"
              >
                Create Group
              </button>

              <button
                onClick={() => setMode('join')}
                className="w-full rounded-full bg-neutral-200 text-neutral-800 text-base sm:text-lg font-semibold py-3 sm:py-4 px-6 shadow-sm hover:bg-neutral-300 transition"
              >
                Join Group
              </button>
            </div>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4 sm:space-y-5">
            <h3 className="text-lg sm:text-xl font-semibold">Create Group</h3>
            <label className="block">
              <span className="text-sm text-neutral-600">ชื่อกลุ่ม</span>
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="ระบุชื่อกลุ่ม"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-neutral-800"
              />
            </label>
            <div className="flex justify-end gap-2 sm:gap-3">
              <button
                onClick={() => setMode('menu')}
                className="px-3 sm:px-4 py-2 text-sm sm:text-base rounded-lg hover:bg-neutral-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleCreate}
                disabled={!newGroupName.trim()}
                className={`px-4 sm:px-5 py-2 text-sm sm:text-base rounded-lg text-white font-semibold shadow transition ${
                  newGroupName.trim() ? 'bg-neutral-900 hover:opacity-90' : 'bg-neutral-400 cursor-not-allowed'
                }`}
              >
                สร้างกลุ่ม
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4 sm:space-y-5">
            <h3 className="text-lg sm:text-xl font-semibold">Join Group</h3>
            <label className="block">
              <span className="text-sm text-neutral-600">กรอกรหัสกลุ่ม (8 ตัวอักษร/ตัวเลข)</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="เช่น Ab12Cd34"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-lg sm:text-xl text-center tracking-widest outline-none focus:ring-2 focus:ring-neutral-800"
                maxLength={8}
              />
            </label>
            <div className="flex items-center justify-between text-xs sm:text-sm flex-wrap gap-2">
              <span className={`transition ${code.length ? (codeOk ? 'text-green-600' : 'text-red-600') : 'text-neutral-400'}`}>
                {code.length === 0
                  ? 'ใส่โค้ดเพื่อเปิดปุ่ม Join'
                  : codeOk
                    ? 'โค้ดดูถูกต้อง'
                    : 'โค้ดต้องเป็น A-Z / a-z / 0-9 จำนวน 8 ตัว'}
              </span>
              <button
                onClick={() => setMode('menu')}
                className="px-3 py-1 text-sm rounded-md hover:bg-neutral-100 transition"
              >
                ย้อนกลับ
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleJoin}
                disabled={!codeOk}
                className={`px-5 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-xl text-white font-semibold shadow transition ${
                  codeOk ? 'bg-neutral-900 hover:opacity-90' : 'bg-neutral-400 cursor-not-allowed'
                }`}
              >
                Join Group
              </button>
            </div>
          </div>
        )}
      </Modal>
    </main>
  );
}