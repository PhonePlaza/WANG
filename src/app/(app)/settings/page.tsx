import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import LogoutButton from '@/components/ui/LogoutButton' 

function initials(nameOrEmail?: string) {
  if (!nameOrEmail) return 'U'
  const base = nameOrEmail.includes(' ')
    ? nameOrEmail.split(' ').slice(0, 2).join(' ')
    : nameOrEmail.split('@')[0]
  const [a = '', b = ''] = base.split(' ')
  return (a[0] + (b[0] ?? '')).toUpperCase()
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const name = (user?.user_metadata?.name as string) || user?.email || 'ผู้ใช้'
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Setting</h1>
      <p className="mt-2">สวัสดี {name} คุณอยู่ในหน้า Setting</p>

      {/* ข้อมูลบัญชี */}
      <div className="mt-6 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border">
            <AvatarImage src={avatarUrl} alt={name} />
            <AvatarFallback>{initials(name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{name}</div>
            <div className="text-sm text-zinc-500">{user?.email}</div>
          </div>
        </div>
      </div>

      
      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">จะไปแล้วหรอ 😢</div>
            <p className="text-sm text-zinc-600">
              ไม่ไปเที่ยวด้วยกันจริงๆหรอจ๊ะ แงงงง T_T
            </p>
          </div>
          <div>
            <LogoutButton /> 
          </div>
        </div>
      </div>
    </main>
  )
}
