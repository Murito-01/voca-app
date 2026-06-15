'use client'

import TopBar from '@/components/ui/TopBar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100">
      <TopBar walletBalance={null} />
      <main className="p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}
