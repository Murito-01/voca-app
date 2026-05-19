'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    href: '/responder',
    label: 'Riwayat Respons',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    href: '/responder/explore',
    label: 'Cari Survey',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
      </svg>
    ),
  },
  {
    href: '/responder/wallet',
    label: 'Wallet',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    href: '/responder/profile',
    label: 'Profile',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
]

export default function ResponderSidebar() {
  const pathname = usePathname()

  const itemClass = (href: string) => {
    const isActive =
      href === '/responder'
        ? pathname === '/responder'
        : pathname.startsWith(href)

    return `flex items-center gap-3 w-full rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors cursor-pointer ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-gray-700 hover:bg-gray-100'
    }`
  }

  return (
    <aside className="w-full border-b border-gray-200 bg-white px-4 py-4 md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:w-64 md:overflow-y-auto md:border-b-0 md:border-r md:px-5">
      <nav className="grid gap-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={itemClass(item.href)}>
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <Link
        href="/"
        className="mt-6 inline-flex text-sm font-medium text-blue-600 hover:underline"
      >
        Back to Home
      </Link>
    </aside>
  )
}
