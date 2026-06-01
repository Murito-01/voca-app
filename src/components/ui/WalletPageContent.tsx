'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Script from 'next/script'

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

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
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
  const [topupAmount, setTopupAmount] = useState<string>('')
  const [topupLoading, setTopupLoading] = useState(false)
  const [topupError, setTopupError] = useState<string | null>(null)

  const router = useRouter()

  const loadWallet = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetchWithAuth('/api/wallet')
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Gagal memuat data wallet')
      }
      const json = await res.json()
      setData(json.data)
      setError(null)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    loadWallet(true)
  }, [])

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault()
    setTopupError(null)
    const amount = parseInt(topupAmount, 10)
    if (isNaN(amount) || amount < 10000) {
      setTopupError('Nominal top up harus berupa angka bulat minimal Rp 10.000')
      return
    }

    setTopupLoading(true)
    try {
      const response = await fetchWithAuth('/api/payments/topup', {
        method: 'POST',
        body: JSON.stringify({ amount })
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Gagal membuat transaksi top up')
      }

      const snapToken = result.snap_token
      if (!snapToken) {
        throw new Error('Token transaksi tidak valid dari payment gateway')
      }

      // Open Snap Popup
      if ((window as any).snap) {
        (window as any).snap.pay(snapToken, {
          onSuccess: () => {
            router.refresh()
            loadWallet(false)
            setTopupAmount('')
          },
          onPending: () => {
            router.refresh()
            loadWallet(false)
            setTopupAmount('')
          },
          onError: () => {
            alert("Pembayaran gagal")
          },
          onClose: () => {
            console.log("Popup ditutup")
          }
        })
      } else {
        throw new Error('Midtrans Snap SDK tidak berhasil dimuat')
      }
    } catch (err: any) {
      setTopupError(err.message || 'Terjadi kesalahan saat memproses pembayaran')
    } finally {
      setTopupLoading(false)
    }
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="mx-auto w-full max-w-6xl animate-pulse">
        {/* Header */}
        <div className="mb-6 space-y-2">
          <div className="h-7 w-24 rounded-lg bg-gray-200" />
          <div className="h-4 w-56 rounded bg-gray-100" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-4">
              {[
                'border-blue-100 bg-blue-50',
                'border-emerald-100 bg-emerald-50',
                'border-rose-100 bg-rose-50',
                'border-amber-100 bg-amber-50',
              ].map((accent, i) => (
                <div key={i} className={`rounded-xl border p-5 flex flex-col gap-2 ${accent}`}>
                  <div className="h-3 w-20 rounded bg-current opacity-20" />
                  <div className="h-7 w-32 rounded-md bg-current opacity-25" />
                  <div className="h-3 w-24 rounded bg-current opacity-15" />
                </div>
              ))}
            </div>

            {/* Transaction table */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              {/* Table header */}
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="h-4 w-36 rounded bg-gray-200" />
                <div className="h-3 w-24 rounded bg-gray-100" />
              </div>

              {/* Table rows */}
              <div className="divide-y divide-gray-50">
                {[...Array(7)].map((_, i) => (
                  <div key={i} className="px-5 py-3.5 flex items-center gap-4">
                    {/* Date */}
                    <div className="h-3 w-20 rounded bg-gray-100 shrink-0" />
                    {/* Description */}
                    <div className="h-3 flex-1 max-w-[180px] rounded bg-gray-100" />
                    {/* Type pill */}
                    <div className="h-5 w-14 rounded-full bg-gray-100 shrink-0" />
                    {/* Amount */}
                    <div className="h-4 w-24 rounded bg-gray-100 shrink-0 ml-auto" />
                    {/* Status */}
                    <div className="h-3 w-14 rounded bg-gray-100 shrink-0 hidden sm:block" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="lg:col-span-1 space-y-6">
            {/* Virtual card skeleton */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-200 via-slate-100 to-stone-200 p-6 min-h-[180px] flex flex-col justify-between shadow-xl">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-slate-300/40 blur-2xl" />
              <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-slate-300/40 blur-2xl" />
              <div className="flex items-center justify-between">
                <div className="h-3 w-28 rounded bg-slate-300/60" />
                <div className="h-6 w-8 rounded bg-slate-300/50" />
              </div>
              <div className="my-5 space-y-2">
                <div className="h-3 w-20 rounded bg-slate-300/50" />
                <div className="h-8 w-40 rounded-md bg-slate-300/60" />
              </div>
              <div className="flex items-end justify-between">
                <div className="space-y-1">
                  <div className="h-2.5 w-16 rounded bg-slate-300/40" />
                  <div className="h-3 w-32 rounded bg-slate-300/50" />
                </div>
                <div className="h-5 w-10 rounded bg-slate-300/40" />
              </div>
            </div>

            {/* Withdraw action box */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
              <div className="h-4 w-20 rounded bg-gray-200" />
              <div className="space-y-1.5">
                <div className="h-3 w-full rounded bg-gray-100" />
                <div className="h-3 w-4/5 rounded bg-gray-100" />
              </div>
              <div className="h-11 w-full rounded-lg border-2 border-dashed border-gray-200 bg-gray-50" />
            </div>

            {/* Info card */}
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-5 space-y-3">
              <div className="h-4 w-32 rounded bg-blue-100" />
              <div className="space-y-2 pl-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-3 rounded bg-blue-100" style={{ width: `${85 - i * 10}%` }} />
                ))}
              </div>
            </div>
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
      <Script
        src="https://app.sandbox.midtrans.com/snap/snap.js"
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="lazyOnload"
      />
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
              label="Total Earned (Net)"
              value={formatIDR(stats.total_earned)}
              sub="Setelah biaya platform 5%"
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

          {/* Action Box: Top Up Panel */}
          <div className="rounded-xl border border-emerald-100 bg-white overflow-hidden shadow-sm">
            {/* Accent header strip */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-white leading-none">Isi Saldo</h3>
                <p className="text-[10px] text-emerald-100/80 mt-0.5">Midtrans Sandbox</p>
              </div>
            </div>

            <form onSubmit={handleTopup} className="p-5 space-y-3.5">
              <div>
                <label htmlFor="topup-amount" className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Nominal Top Up
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-semibold text-gray-400">Rp</span>
                  <input
                    type="number"
                    name="amount"
                    id="topup-amount"
                    min="10000"
                    placeholder="10.000"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-3 text-sm font-semibold text-gray-800 placeholder:text-gray-300 focus:border-emerald-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-100 transition-all"
                    required
                  />
                </div>
                <p className="mt-1 text-[10px] text-gray-400">Minimum Rp 10.000</p>
              </div>

              {/* Preset amount pills */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Pilih Nominal Cepat</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Rp 50k', value: 50000 },
                    { label: 'Rp 100k', value: 100000 },
                    { label: 'Rp 250k', value: 250000 },
                    { label: 'Rp 500k', value: 500000 },
                  ].map(({ label, value }) => {
                    const isSelected = topupAmount === value.toString()
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setTopupAmount(value.toString())}
                        className={`py-2 rounded-lg text-xs font-semibold transition-all border ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-400 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50/60 hover:text-emerald-700'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {topupError && (
                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 flex items-start gap-2">
                  <svg className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-red-600 font-medium">{topupError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={topupLoading}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-xs font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-emerald-200 active:scale-[0.99]"
              >
                {topupLoading ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  <>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Top Up Sekarang
                  </>
                )}
              </button>
            </form>
          </div>

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
