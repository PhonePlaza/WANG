import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr' // ✅ ใช้ ssr

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          // เขียนกลับไปที่ response
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // (ตัวอย่าง) ปกป้องเส้นทางที่ต้องล็อกอิน
  const { data: { user } } = await supabase.auth.getUser()
  const protectedPaths = ['/dashboard', '/groups', '/trip']
  if (protectedPaths.some(p => req.nextUrl.pathname.startsWith(p)) && !user) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/groups/:path*', '/trip/:path*'],
}
