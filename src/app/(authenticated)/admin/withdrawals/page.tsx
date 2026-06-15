'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'

interface Withdrawal {
  id: string
  user_id: string
  external_id: string
  amount: number
  channel_code: string
  account_number: string
  account_holder_name: string | null
  status: string
  xendit_payout_id: string | null
  failure_reason: string | null
  created_at: string
  completed_at: string | null
  user_email: string
}

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val)

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'pending') return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-700">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />Pending
    </span>
  )
  if (status === 'success') return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-[11px] font-bold text-green-700">
      <span className="h-1.5 w-1.5 rounded-full bg-green-500" />Paid
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-2.5 py-1 text-[11px] font-bold text-red-700">
      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />Rejected
    </span>
  )
}

export default function AdminWithdrawalsPage() {
  const router = useRouter()
  const [pageLoading, setPageLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [fetching, setFetching] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'success' | 'failed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Modal state
  const [selected, setSelected] = useState<Withdrawal | null>(null)
  const [modalType, setModalType] = useState<'approve' | 'reject' | null>(null)
  const [referenceId, setReferenceId] = useState('')
  const [failureReason, setFailureReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email || null)
      if (isAdmin(user.email)) {
        setAuthorized(true)
        await loadWithdrawals()
      }
      setPageLoading(false)
    }
    init()
    return () => { cancelled = true }
  }, [router])

  const loadWithdrawals = async () => {
    setFetching(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/withdrawals', {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setWithdrawals(json.withdrawals || [])
    } catch (e: any) {
      setError(e.message)
    } finally {
      setFetching(false)
    }
  }

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          withdrawal_id: selected.id,
          action: modalType,
          ...(modalType === 'approve' ? { reference_id: referenceId.trim() || undefined } : { failure_reason: failureReason.trim() }),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Action failed')
      setSuccessMsg(json.message)
      setSelected(null)
      setModalType(null)
      setReferenceId('')
      setFailureReason('')
      await loadWithdrawals()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const openApprove = (w: Withdrawal) => { setSelected(w); setModalType('approve'); setReferenceId(`TRF-${Date.now()}`) }
  const openReject = (w: Withdrawal) => { setSelected(w); setModalType('reject'); setFailureReason('') }
  const closeModal = () => { setSelected(null); setModalType(null) }

  const filtered = withdrawals.filter(w => {
    if (activeTab === 'pending' && w.status !== 'pending') return false
    if (activeTab === 'success' && w.status !== 'success') return false
    if (activeTab === 'failed' && w.status !== 'failed') return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        w.user_email.toLowerCase().includes(q) ||
        w.account_number.includes(q) ||
        w.channel_code.toLowerCase().includes(q) ||
        (w.account_holder_name?.toLowerCase().includes(q) ?? false)
      )
    }
    return true
  })

  const pending = withdrawals.filter(w => w.status === 'pending')
  const success = withdrawals.filter(w => w.status === 'success')
  const failed = withdrawals.filter(w => w.status === 'failed')

  // Loading screen
  if (pageLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-600" />
          <p className="text-sm text-gray-400">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  // Access denied
  if (!authorized) {
    return (
      <div className="mx-auto w-full max-w-md mt-16 text-center">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-10">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600 mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-extrabold text-gray-900">Access Denied</h2>
          <p className="mt-2 text-sm text-gray-500">
            {userEmail} is not authorized. Add this email to <code className="bg-red-100 px-1 rounded text-xs">ADMIN_EMAILS</code> in your <code className="bg-red-100 px-1 rounded text-xs">.env.local</code>.
          </p>
          <button onClick={() => router.push('/')} className="mt-6 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer">
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">

      {/* Page Header */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-6 text-white shadow-md sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-200">Admin Panel</p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Withdrawal Requests</h1>
            <p className="mt-1 text-sm text-blue-100/80">
              Review pending requests, transfer funds manually, then mark as paid or reject.
            </p>
          </div>
          <button
            onClick={loadWithdrawals}
            disabled={fetching}
            className="inline-flex items-center gap-2 self-start rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-blue-700 shadow transition-all hover:bg-blue-50 hover:shadow-md disabled:opacity-60 cursor-pointer sm:self-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15H18" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-green-500 hover:text-green-700 text-lg leading-none cursor-pointer">×</button>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          <span className="text-lg shrink-0">⚠️</span>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 text-lg leading-none cursor-pointer">×</button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Pending Transfer', count: pending.length, amount: pending.reduce((s, w) => s + w.amount, 0), color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'Total Paid Out', count: success.length, amount: success.reduce((s, w) => s + w.amount, 0), color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
          { label: 'Rejected / Failed', count: failed.length, amount: failed.reduce((s, w) => s + w.amount, 0), color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-2xl border ${stat.border} ${stat.bg} p-5`}>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{stat.label}</p>
            <p className={`mt-2 text-2xl font-extrabold ${stat.color}`}>{formatCurrency(stat.amount)}</p>
            <p className="mt-0.5 text-xs text-gray-500">{stat.count} request{stat.count !== 1 ? 's' : ''}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 w-fit">
            {(['all', 'pending', 'success', 'failed'] as const).map((tab) => {
              const counts: Record<string, number> = { all: withdrawals.length, pending: pending.length, success: success.length, failed: failed.length }
              const labels: Record<string, string> = { all: 'All', pending: 'Pending', success: 'Paid', failed: 'Rejected' }
              const activeColors: Record<string, string> = { all: 'bg-blue-600', pending: 'bg-amber-500', success: 'bg-green-600', failed: 'bg-red-600' }
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    activeTab === tab ? `${activeColors[tab]} text-white shadow-sm` : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  {labels[tab]} ({counts[tab]})
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search email, account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 rounded-xl border border-gray-200 py-2 pl-9 pr-4 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Loading */}
        {fetching && withdrawals.length === 0 && (
          <div className="flex h-48 items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-blue-600" />
              <p className="text-sm text-gray-400">Loading transactions...</p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!fetching && filtered.length === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-2xl border border-gray-100">💸</div>
            <p className="font-semibold text-gray-700">No withdrawals found</p>
            <p className="mt-1 text-sm text-gray-400">Try adjusting your filters or search.</p>
          </div>
        )}

        {/* Table */}
        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">User / Date</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Destination</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Amount</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900 text-xs truncate max-w-[180px]" title={w.user_email}>{w.user_email}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{formatDate(w.created_at)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 uppercase">{w.channel_code}</span>
                        <span className="font-mono text-xs font-semibold text-gray-800 select-all">{w.account_number}</span>
                      </div>
                      {w.account_holder_name && (
                        <p className="text-[11px] text-gray-400 mt-0.5">a/n {w.account_holder_name}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">{formatCurrency(w.amount)}</td>
                    <td className="px-6 py-4"><StatusBadge status={w.status} /></td>
                    <td className="px-6 py-4 text-right">
                      {w.status === 'pending' ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openApprove(w)}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-green-700 transition-all cursor-pointer"
                          >
                            Mark Paid
                          </button>
                          <button
                            onClick={() => openReject(w)}
                            className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600 hover:bg-red-100 transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-gray-400">
                          {w.status === 'success' ? 'Settled' : 'Refunded'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalType && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="text-base font-extrabold text-gray-900">
                {modalType === 'approve' ? 'Confirm Payout' : 'Reject Withdrawal'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-2xl leading-none cursor-pointer">×</button>
            </div>

            <form onSubmit={handleAction} className="p-6 space-y-5">
              {/* Summary */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">User</span>
                  <span className="text-gray-800 font-bold truncate max-w-[200px]">{selected.user_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">Amount</span>
                  <span className="text-blue-600 font-extrabold">{formatCurrency(selected.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">Destination</span>
                  <span className="text-gray-800 font-bold uppercase">{selected.channel_code} · {selected.account_number}</span>
                </div>
                {selected.account_holder_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-semibold">Name</span>
                    <span className="text-gray-800 font-bold">a/n {selected.account_holder_name}</span>
                  </div>
                )}
              </div>

              {/* Input */}
              {modalType === 'approve' ? (
                <div className="space-y-1.5">
                  <label htmlFor="ref-id" className="block text-xs font-bold text-gray-600">Transfer Reference ID</label>
                  <input
                    id="ref-id"
                    type="text"
                    required
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    placeholder="e.g. TRF-1234567890"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-800 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <p className="text-[11px] text-gray-400">Enter the reference from your bank app. Stored for audit trails.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label htmlFor="reason" className="block text-xs font-bold text-gray-600">Rejection Reason</label>
                  <textarea
                    id="reason"
                    required
                    rows={3}
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    placeholder="e.g. Nomor rekening tidak valid"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-xs font-semibold text-gray-800 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 resize-none"
                  />
                  <p className="text-[11px] text-gray-400">The user's balance will be immediately refunded to their wallet.</p>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <button type="button" onClick={closeModal} className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-all cursor-pointer">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-60 cursor-pointer ${
                    modalType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {submitting && (
                    <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {modalType === 'approve' ? 'Confirm Payout' : 'Reject & Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
