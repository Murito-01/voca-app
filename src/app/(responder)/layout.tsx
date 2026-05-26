'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/ui/TopBar'
import ResponderSidebar from '@/components/responder/ResponderSidebar'
import { getWalletBalance } from '@/services/survey.service'

export default function ResponderLayout({ children }: { children: React.ReactNode }) {
  const [walletBalance, setWalletBalance] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchWallet = async () => {
      try {
        const wallet = await getWalletBalance()
        if (!cancelled) setWalletBalance(wallet.balance)
      } catch {
        if (!cancelled) setWalletBalance(null)
      }
    }

    fetchWallet()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      <TopBar walletBalance={walletBalance} />
      <div className="md:flex">
        <ResponderSidebar />
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
