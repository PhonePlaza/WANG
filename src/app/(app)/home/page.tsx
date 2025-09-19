import { createClient } from '@/lib/supabase/server'


export default async function HomePage() {
  const supabase = await createClient()                   
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Home</h1>
      <p className="mt-2">สวัสดี {user?.email ?? 'ผู้ใช้'} คุณอยู่ในหน้า HOME</p>
    </main>
  )
}
