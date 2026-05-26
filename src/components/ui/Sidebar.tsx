'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

export interface NavItem {
  href: string
  label: string
  icon: ReactNode
}

interface SidebarProps {
  navItems: NavItem[]
  /** The exact path that should only match on strict equality (e.g. '/creator' or '/responder') */
  basePath: string
}

export default function Sidebar({ navItems, basePath }: SidebarProps) {
  const pathname = usePathname()

  const itemClass = (href: string) => {
    const isActive =
      href === basePath
        ? pathname === basePath
        : pathname.startsWith(href)

    return `flex items-center gap-3 w-full rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors cursor-pointer ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-gray-700 hover:bg-gray-100'
    }`
  }

  return (
    <aside className="w-full border-b border-gray-200 bg-white px-4 py-4 md:sticky md:top-16 md:h-[calc(100vh-4rem)] md:w-64 md:shrink-0 md:overflow-y-auto md:border-b-0 md:border-r md:px-5">
      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={itemClass(item.href)}>
            {item.icon}
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>

    </aside>
  )
}
