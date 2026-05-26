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

    // Defer the Next.js routing by 500ms to allow the wobbly animation to be seen in full
    setTimeout(() => {
      router.push(target === 'creator' ? '/creator' : '/responder')
    }, 500)
  }

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-4 md:px-6">
      <Link href="/" className="flex items-center gap-2 hover:opacity-85 transition-opacity">
        <div className="h-9 w-9 shrink-0 rounded border border-gray-300 bg-blue-600 sm:h-10 sm:w-10 flex items-center justify-center text-white font-black" aria-label="Logo">
          V
        </div>
        <span className="min-w-0 text-lg font-bold text-gray-900 sm:text-xl hidden xs:inline">Voca</span>
      </Link>

      {/* Segmented Workspace Switcher (Icon-based) */}
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
          title="Creator Workspace"
          aria-label="Switch to Creator Mode"
          className={`relative z-10 w-10 sm:w-11 h-8 flex items-center justify-center rounded-full transition-colors duration-200 cursor-pointer select-none active:scale-90 ${
            activeMode === 'creator' ? 'text-white' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {/* Pen / Creation Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <button
          onClick={() => handleSwitchMode('responder')}
          title="Respondent Workspace"
          aria-label="Switch to Respondent Mode"
          className={`relative z-10 w-10 sm:w-11 h-8 flex items-center justify-center rounded-full transition-colors duration-200 cursor-pointer select-none active:scale-90 ${
            activeMode === 'responder' ? 'text-white' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          {/* Checklist / Survey Answer Icon */}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
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

