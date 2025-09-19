import '../globals.css'
import Sidebar from '../../components/Sidebar'
import Topbar from '../../components/Topbar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Sidebar />

      <main className="min-h-dvh pl-60 p-6">
        {/* Top bar ชิดขวา  */}
        <div className="mb-4 flex justify-end">
          <Topbar />
        </div>

        {/* เนื้อหาหลักของแต่ละหน้า */}
        <div className="mx-auto max-w-6xl rounded-2xl bg-white shadow-sm p-6 min-h-[70vh]">
          {children}
        </div>
      </main>
    </>
  )
}
