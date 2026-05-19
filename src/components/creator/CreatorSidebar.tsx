'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  {
    href: '/creator',
    label: 'My Surveys',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: '/creator/create',
    label: 'Create Survey',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
]

export default function CreatorSidebar() {
  const pathname = usePathname()

  const itemClass = (href: string) => {
    const isActive =
      href === '/creator'
        ? pathname === '/creator'
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
