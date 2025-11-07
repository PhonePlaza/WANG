import Link from 'next/link'

export default function Mainpage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-8 text-center bg-white">
      <div className="text-8xl mb-8 animate-bounce">
        🚗
      </div>
      <h1 className="text-5xl font-extrabold text-gray-900 mb-10 tracking-tight">
        Welcome to Wang
      </h1>
      <Link 
        href="/auth/login" 
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-full shadow-xl transition duration-300 transform hover:scale-105 text-lg"
      >
        Go to Login
      </Link>
    </main>
  )
}