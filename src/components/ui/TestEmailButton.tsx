// components/TestEmailButton.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button' // ถ้าคุณใช้ปุ่มจาก UI library

type TestEmailButtonProps = {
  email?: string
}

export default function TestEmailButton({ email }: TestEmailButtonProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  async function handleTestSend() {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId: 1,  // ต้องส่ง groupId ไปด้วย (เปลี่ยนเป็นค่าจริงที่ต้องการทดสอบ)
          subject: 'ทดสอบส่งเมล',
          html: '<p>ทดสอบส่งเมลถึงสมาชิกทั้งหมดในกลุ่มนี้</p>',
        }),
      })

      const data = await res.json()
      setResult(data.ok ? '✅ ส่งอีเมลสำเร็จ!' : `❌ ล้มเหลว: ${data.error || 'unknown'}`)
    } catch (err) {
      setResult('❌ เกิดข้อผิดพลาดขณะส่งเมล')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-lg font-semibold">📧 ทดสอบส่งเมล</div>
          <p className="text-sm text-zinc-600">
            กดปุ่มด้านขวาเพื่อทดสอบการส่งอีเมลไปยัง {email || '—'}
          </p>
        </div>
        <Button onClick={handleTestSend} disabled={loading}>
          {loading ? 'กำลังส่ง...' : 'ทดสอบส่งเมล'}
        </Button>
      </div>
      {result && <p className="mt-3 text-sm text-zinc-700">{result}</p>}
    </div>
  )
}
