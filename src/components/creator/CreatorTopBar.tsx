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
    <header className="sticky top-0 z-20 flex min-h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 shadow-sm md:px-6">
      <div className="h-10 w-10 rounded border border-gray-300 bg-white" aria-label="Logo placeholder" />
      <p className="text-xl font-bold text-gray-900">Voca</p>

      <div className="ml-auto rounded border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900">
        Balance: {walletBalance === null ? '-' : formatCurrency(walletBalance)}
      </div>

      <div className="h-10 w-10 rounded-full border border-gray-300 bg-white" aria-label="Profile placeholder" />
    </header>
  )
}
