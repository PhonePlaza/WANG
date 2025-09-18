import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-dvh grid place-items-center p-8">
      <Link href="/auth/login" className="rounded-xl border px-4 py-3">
        ไปหน้า Login
      </Link>
    </main>
  )
}
