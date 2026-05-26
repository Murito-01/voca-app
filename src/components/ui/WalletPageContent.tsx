'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WalletStats {
  total_earned: number
  total_withdrawn: number
  pending: number
}

interface Transaction {
  id: string
  type: 'reward' | 'fee' | 'refund' | 'withdraw' | 'spend'
  amount: number
  status: 'pending' | 'success' | 'failed'
  reference_id: string | null
  reference_type: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

interface WalletData {
  balance: number
  locked_balance: number
  email: string
  reputation_score: number
  stats: WalletStats
  transactions: Transaction[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchWithAuth(url: string) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

const formatIDR = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

// Label & style for transaction type
function txTypeLabel(type: Transaction['type']): { label: string; pill: string } {
  switch (type) {
    case 'reward':   return { label: 'Reward',    pill: 'bg-emerald-100 text-emerald-700' }
    case 'refund':   return { label: 'Refund',    pill: 'bg-blue-100 text-blue-700' }
    case 'withdraw': return { label: 'Withdraw',  pill: 'bg-rose-100 text-rose-700' }
    case 'spend':    return { label: 'Spend',     pill: 'bg-orange-100 text-orange-700' }
    case 'fee':      return { label: 'Fee',       pill: 'bg-gray-100 text-gray-600' }
    default:         return { label: type,        pill: 'bg-gray-100 text-gray-600' }
  }
}

// Human-readable description from transaction type + metadata
function txDescription(tx: Transaction): string {
  const meta = tx.metadata as Record<string, string> | null
  switch (tx.type) {
    case 'reward':
      return `Reward survey — ${tx.reference_type ?? 'response'}`
    case 'refund':
      return meta?.reason === 'remaining_budget'
        ? 'Refund sisa budget survey'
        : 'Refund'
    case 'withdraw':
      return 'Penarikan saldo'
    case 'spend':
      return 'Pembayaran reward responden'
    case 'fee':
      return 'Biaya platform (5%)'
    default:
      return 'Transaksi'
  }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent: string
}) {
  return (
    <div className={`rounded-xl border p-5 flex flex-col gap-1 ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="text-2xl font-extrabold leading-tight">{value}</p>
      {sub && <p className="text-xs opacity-60">{sub}</p>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WalletPageContent() {
  const [data, setData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showWithdrawBanner, setShowWithdrawBanner] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetchWithAuth('/api/wallet')
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Gagal memuat data wallet')
        }
        const json = await res.json()
        if (!cancelled) setData(json.data)
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [])

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
          <p className="text-sm text-gray-500">Kelola saldo dan riwayat transaksimu.</p>
        </div>
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 space-y-6 lg:space-y-0">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
            <div className="h-80 rounded-xl bg-gray-100 animate-pulse" />
          </div>
          <div className="lg:col-span-1 space-y-6">
            <div className="h-48 rounded-2xl bg-gray-100 animate-pulse" />
            <div className="h-56 rounded-xl bg-gray-100 animate-pulse" />
          </div>
        </div>
      </section>
    )
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <section className="mx-auto w-full max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
          <p className="text-sm text-gray-500">Kelola saldo dan riwayat transaksimu.</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-center shadow-sm">
          <p className="text-red-700 font-medium">{error || 'Data wallet tidak tersedia.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-sm font-semibold text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </section>
    )
  }

  const { balance, locked_balance, email, reputation_score, stats, transactions } = data

  // ── Main ──────────────────────────────────────────────────────────────────
  return (
    <section className="mx-auto w-full max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
        <p className="text-sm text-gray-500">Kelola saldo dan riwayat transaksimu.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats & Transactions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Saldo Aktif"
              value={formatIDR(balance)}
              sub="Bisa ditarik"
              accent="border-blue-200 bg-blue-50 text-blue-900"
            />
            <StatCard
              label="Total Earned"
              value={formatIDR(stats.total_earned)}
              sub="Dari semua survey"
              accent="border-emerald-200 bg-emerald-50 text-emerald-900"
            />
            <StatCard
              label="Total Withdrawn"
              value={formatIDR(stats.total_withdrawn)}
              sub="Berhasil dicairkan"
              accent="border-rose-200 bg-rose-50 text-rose-900"
            />
            <StatCard
              label="Terkunci"
              value={formatIDR(locked_balance)}
              sub="Budget survey aktif"
              accent="border-amber-200 bg-amber-50 text-amber-900"
            />
          </div>

          {/* Transaction History */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Card Header */}
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">Riwayat Transaksi</h2>
              <span className="text-xs text-gray-400 font-medium">50 transaksi terakhir</span>
            </div>

            {transactions.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-center px-4">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl mb-3">
                  📭
                </div>
                <p className="text-sm font-semibold text-gray-600">Belum ada transaksi</p>
                <p className="text-xs text-gray-400 mt-1">Riwayat transaksi akan muncul di sini setelah kamu mengisi survey atau menarik saldo.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tanggal</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Deskripsi</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Tipe</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap">Jumlah</th>
                      <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right whitespace-nowrap hidden sm:table-cell">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {transactions.map((tx) => {
                      const { label, pill } = txTypeLabel(tx.type)
                      const isCredit = tx.type === 'reward' || tx.type === 'refund'
                      const isDebit = tx.type === 'withdraw' || tx.type === 'spend' || tx.type === 'fee'

                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-gray-50/70 transition-colors"
                        >
                          {/* Date */}
                          <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap text-xs">
                            {formatDate(tx.created_at)}
                          </td>

                          {/* Description */}
                          <td className="px-5 py-3.5 text-gray-700 max-w-[180px]">
                            <span className="line-clamp-1">{txDescription(tx)}</span>
                          </td>

                          {/* Type pill */}
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${pill}`}>
                              {label}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className={`px-5 py-3.5 text-right font-semibold whitespace-nowrap ${
                            isCredit ? 'text-emerald-600' : isDebit ? 'text-rose-600' : 'text-gray-700'
                          }`}>
                            {isCredit ? '+' : isDebit ? '−' : ''}{formatIDR(tx.amount)}
                          </td>

                          {/* Status */}
                          <td className="px-5 py-3.5 text-right hidden sm:table-cell">
                            {tx.status === 'success' && (
                              <span className="text-xs font-medium text-emerald-600">✓ Sukses</span>
                            )}
                            {tx.status === 'pending' && (
                              <span className="text-xs font-medium text-amber-600">⏳ Pending</span>
                            )}
                            {tx.status === 'failed' && (
                              <span className="text-xs font-medium text-red-500">✕ Gagal</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Virtual Card & Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Glowing Dynamic Virtual Voca Card */}
          {(() => {
            const score = reputation_score ?? 100
            let tierName = 'VOCA PLATINUM'
            let bgClass = 'from-slate-900 via-slate-800 to-indigo-950'
            let textClass = 'text-white'
            let labelClass = 'text-indigo-200/60'
            let subLabelClass = 'text-indigo-200/50'
            let glowClass = 'bg-blue-500/10'

            if (score < 50) {
              tierName = 'VOCA SILVER'
              bgClass = 'from-slate-200 via-slate-100 to-stone-300 border border-slate-300'
              textClass = 'text-slate-800'
              labelClass = 'text-slate-500'
              subLabelClass = 'text-slate-400'
              glowClass = 'bg-slate-400/20'
            } else if (score < 80) {
              tierName = 'VOCA GOLD'
              bgClass = 'from-amber-400 via-yellow-400 to-amber-500 border border-amber-300'
              textClass = 'text-stone-900'
              labelClass = 'text-amber-900/70'
              subLabelClass = 'text-amber-900/60'
              glowClass = 'bg-yellow-400/30'
            } else if (score >= 100) {
              tierName = 'VOCA OBSIDIAN'
              bgClass = 'from-neutral-950 via-stone-900 to-emerald-950 border border-emerald-900/40'
              textClass = 'text-white'
              labelClass = 'text-emerald-300/60'
              subLabelClass = 'text-emerald-300/40'
              glowClass = 'bg-emerald-500/20'
            }

            return (
              <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${bgClass} p-6 ${textClass} shadow-xl min-h-[180px] flex flex-col justify-between select-none transition-all duration-300`}>
                {/* Glossy overlay effect */}
                <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full ${glowClass} blur-2xl`} />
                <div className={`absolute -left-10 -bottom-10 h-32 w-32 rounded-full ${glowClass} blur-2xl`} />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold tracking-widest uppercase opacity-90">{tierName}</span>
                  <div className={`h-6 w-8 rounded ${score < 80 ? 'bg-black/5' : 'bg-white/10'} backdrop-blur-sm flex items-center justify-center font-bold text-[9px] opacity-40`}>
                    CHIP
                  </div>
                </div>

                <div className="my-5">
                  <p className={`text-[10px] uppercase tracking-wider ${labelClass}`}>Total Balance</p>
                  <p className="text-3xl font-extrabold tracking-tight mt-0.5">{formatIDR(balance)}</p>
                </div>

                <div className="flex items-end justify-between">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className={`text-[9px] uppercase tracking-wider ${subLabelClass}`}>Card Holder</p>
                    <p className="text-xs font-semibold tracking-wide truncate mt-0.5">{email || 'User Account'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xl font-black italic tracking-tighter opacity-80">Voca</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Action Box: Withdraw Panel */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Tarik Dana</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Tarik saldo aktif secara langsung ke rekening bank atau e-wallet pilihanmu.
            </p>

            {showWithdrawBanner && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 space-y-1">
                <div className="flex items-center justify-between font-bold">
                  <span>🚧 Segera Hadir</span>
                  <button onClick={() => setShowWithdrawBanner(false)} className="text-base leading-none text-amber-500 hover:text-amber-700">×</button>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Integrasi payment gateway sedang disiapkan. Proses penarikan dana akan aktif setelah uji coba selesai.
                </p>
              </div>
            )}

            <button
              onClick={() => setShowWithdrawBanner(true)}
              className="w-full py-3 rounded-lg border-2 border-dashed border-gray-300 text-xs font-semibold text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Withdraw Funds
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider">Soon</span>
            </button>
          </div>

          {/* Info Card */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-5 text-xs text-blue-800 space-y-2">
            <p className="font-semibold text-blue-900 flex items-center gap-1.5">
              <span>💡</span> Informasi Tambahan
            </p>
            <ul className="list-disc pl-4 space-y-1 text-blue-700">
              <li>Dana dari survey yang kamu isi akan langsung masuk ke Saldo Aktif.</li>
              <li>Untuk pembuat survey, saldo terkunci mewakili alokasi budget survey yang sedang berjalan.</li>
              <li>Tidak ada biaya admin tambahan untuk penarikan dana di kemudian hari.</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
