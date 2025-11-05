import TestEmailButton from '@/components/ui/TestEmailButton'

export default function TestEmailPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Test Email Page</h1>
      <p className="mt-2">ทดสอบส่งอีเมลจากหน้านี้</p>
      <TestEmailButton email="phonekungkub@gmail.com" />
    </div>
  )
}