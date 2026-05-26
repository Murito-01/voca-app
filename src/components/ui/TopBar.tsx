'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function TopBar({ walletBalance }: { walletBalance: number | null }) {
  const pathname = usePathname()
  const router = useRouter()

  const isCreatorRoute = pathname?.startsWith('/creator')
  const isResponderRoute = pathname?.startsWith('/responder')

  // Local state for instant visual feedback of the slide animation
  const [activeMode, setActiveMode] = useState<'creator' | 'responder'>(
    isCreatorRoute ? 'creator' : 'responder'
  )

  // Synchronize state with route changes (e.g., initial load or backward/forward navigation)
  useEffect(() => {
    if (isCreatorRoute) {
      setActiveMode('creator')
    } else if (isResponderRoute) {
      setActiveMode('responder')
    }
  }, [isCreatorRoute, isResponderRoute])

  // Cache user's active workspace preference in localStorage
  useEffect(() => {
    if (isCreatorRoute) {
      localStorage.setItem('lastWorkspace', 'creator')
    } else if (isResponderRoute) {
      localStorage.setItem('lastWorkspace', 'responder')
    }
  }, [isCreatorRoute, isResponderRoute])

  const handleSwitchMode = (target: 'creator' | 'responder') => {
    if (target === activeMode) return
    
    // Instantly trigger local slide animation and text color transition!
    setActiveMode(target)

    // Defer the Next.js routing by 200ms to allow the wobbly animation to be seen in full
    setTimeout(() => {
      router.push(target === 'creator' ? '/creator' : '/responder')
    }, 200)
  }

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-4 md:px-6">
      <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
        <div className="h-9 w-9 shrink-0 rounded border border-gray-300 bg-blue-600 sm:h-10 sm:w-10 flex items-center justify-center text-white font-black" aria-label="Logo">
          V
        </div>
        <span className="min-w-0 text-lg font-bold text-gray-900 sm:text-xl hidden xs:inline">Voca</span>
      </Link>

      {/* Segmented Workspace Switcher */}
      <div className="relative flex items-center rounded-full bg-gray-100 p-0.5 border border-gray-200/80 ml-2 sm:ml-4">
        {/* Active capsule slider with a custom spring-wobble bezier curve */}
        <div
          className={`absolute top-0.5 bottom-0.5 rounded-full transition-all duration-[450ms] shadow-sm ${
            activeMode === 'creator'
              ? 'left-0.5 w-[calc(50%-1px)] bg-blue-600 shadow-blue-500/10'
              : 'left-[calc(50%-0.5px)] w-[calc(50%-1px)] bg-emerald-600 shadow-emerald-500/10'
          }`}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.34, 1.85, 0.64, 1)',
          }}
        />

        <button
          onClick={() => handleSwitchMode('creator')}
          className={`relative z-10 w-20 sm:w-24 text-center rounded-full py-1 text-xs sm:text-sm font-bold transition-colors duration-200 select-none cursor-pointer ${
            activeMode === 'creator' ? 'text-white' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Creator
        </button>

        <button
          onClick={() => handleSwitchMode('responder')}
          className={`relative z-10 w-20 sm:w-24 text-center rounded-full py-1 text-xs sm:text-sm font-bold transition-colors duration-200 select-none cursor-pointer ${
            activeMode === 'responder' ? 'text-white' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Respondent
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="max-w-[35vw] truncate whitespace-nowrap rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 sm:max-w-none sm:px-4 sm:text-sm">
          Balance: {walletBalance === null ? '-' : formatCurrency(walletBalance)}
        </div>

        <div className="h-9 w-9 shrink-0 rounded-full border border-gray-300 bg-gray-100 sm:h-10 sm:w-10 flex items-center justify-center text-xs font-bold text-gray-600" aria-label="Profile placeholder">
          U
        </div>
      </div>
    </header>
  )
}

