'use client'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import Link from 'next/link'

export default function LoginPage() {
  const supabase = createClient()
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-6 bg-gradient-to-b from-teal-50 to-white">
      <Card className="w-full max-w-sm shadow-xl border-teal-100 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto bg-teal-50 w-12 h-12 rounded-full flex items-center justify-center mb-2">
            <span className="text-2xl">👋</span>
          </div>
          <CardTitle className="text-2xl font-bold text-teal-900">Welcome Back</CardTitle>
          <CardDescription className="text-slate-500">
            Sign in to continue planning your trip
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm relative py-6 transition-all hover:shadow-md hover:border-slate-300"
            variant="outline"
            onClick={signInWithGoogle}
          >
            <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
              <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
            </svg>
            Sign in with Google
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/" className="text-sm text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Home
          </Link>
        </CardFooter>
      </Card>

    </main>
  )
}
