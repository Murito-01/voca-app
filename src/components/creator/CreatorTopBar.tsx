'use client'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function CreatorTopBar({ walletBalance }: { walletBalance: number | null }) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-4 md:px-6">
      <div className="h-9 w-9 shrink-0 rounded border border-gray-300 bg-white sm:h-10 sm:w-10" aria-label="Logo placeholder" />
      <p className="min-w-0 text-lg font-bold text-gray-900 sm:text-xl">Voca</p>

      <div className="ml-auto max-w-[52vw] truncate whitespace-nowrap rounded border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-900 sm:max-w-none sm:px-4 sm:text-sm">
        Balance: {walletBalance === null ? '-' : formatCurrency(walletBalance)}
      </div>

      <div className="h-9 w-9 shrink-0 rounded-full border border-gray-300 bg-white sm:h-10 sm:w-10" aria-label="Profile placeholder" />
    </header>
  )
}
