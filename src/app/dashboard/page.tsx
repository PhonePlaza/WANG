import { createClient } from '@/lib/supabase/server'


export default async function DashboardPage() {
  const supabase = await createClient()                   // ✅ เรียกแบบ await
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <p className="mt-2">สวัสดี {user?.email ?? 'ผู้ใช้'}</p>
    </main>
  )
}
