import Link from 'next/link'

export default function Mainpage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-gradient-to-b from-teal-50 to-white px-4 text-center">
      <div className="max-w-3xl space-y-8 animate-in fade-in zoom-in duration-700">

        {/* Logo / Icon */}
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-teal-100 transform -rotate-3 hover:rotate-0 transition duration-300 mb-6">
            <span className="text-6xl" role="img" aria-label="Map">🗺️</span>
          </div>
          <span className="text-4xl font-extrabold text-teal-800 tracking-widest uppercase drop-shadow-sm">
            WANG
          </span>
        </div>

        {/* Hero Text */}
        <div className="space-y-4">
          <h1 className="text-5xl md:text-7xl font-black text-teal-900 tracking-tight leading-tight">
            Plan your next <br />
            <span className="text-teal-600">adventure together.</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed">
            The easiest way to organize trips with friends. <br className="hidden md:inline" />
            Collaborative itineraries, expense splitting, and memories made simple.
          </p>
        </div>

        {/* Call to Action */}
        <div className="pt-8">
          <Link
            href="/auth/login"
            className="group relative inline-flex items-center justify-center px-8 py-4 font-bold text-white transition-all duration-200 bg-teal-600 font-lg rounded-full hover:bg-teal-700 hover:shadow-xl hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-600"
          >
            <span>Start Planning Now</span>
            <svg
              className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
          </Link>
          <p className="mt-4 text-sm text-slate-400">
            Free to use • No credit card required
          </p>
        </div>

      </div>
    </main>
  )
}
