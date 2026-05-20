'use client'

import { useEffect, useState } from 'react'
import CreatorTopBar from '@/components/creator/CreatorTopBar'
import CreatorSidebar from '@/components/creator/CreatorSidebar'
import { getWalletBalance } from '@/services/survey.service'

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
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
      <CreatorTopBar walletBalance={walletBalance} />
      <div className="md:flex">
        <CreatorSidebar />
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
