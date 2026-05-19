'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/responder', label: 'Riwayat Respons' },
  { href: '/responder/explore', label: 'Cari Survey' },
  { href: '/responder/wallet', label: 'Wallet' },
  { href: '/responder/profile', label: 'Profile' },
]

export default function ResponderSidebar() {
  const pathname = usePathname()

  const itemClass = (href: string) => {
    const isActive =
      href === '/responder'
        ? pathname === '/responder'
        : pathname.startsWith(href)

    return `block w-full rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors cursor-pointer ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-gray-700 hover:bg-gray-100'
    }`
  }

  return (
    <aside className="w-full border-b border-gray-200 bg-white px-4 py-4 md:min-h-[calc(100vh-4rem)] md:w-64 md:border-b-0 md:border-r md:px-5">
      <nav className="grid gap-2">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className={itemClass(item.href)}>
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
