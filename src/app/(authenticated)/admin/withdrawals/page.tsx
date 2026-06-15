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

export default function AdminWithdrawalsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  
  // UI states
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'success' | 'failed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Modals
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null)
  const [modalType, setModalType] = useState<'approve' | 'reject' | null>(null)
  const [referenceId, setReferenceId] = useState('')
  const [failureReason, setFailureReason] = useState('')

  // Fetch Session & Authorize
  useEffect(() => {
    let cancelled = false

    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (cancelled) return

        if (!user) {
          router.push('/login')
          return
        }

        setUserEmail(user.email || null)
        
        if (isAdmin(user.email)) {
          setAuthorized(true)
          await fetchWithdrawals()
        } else {
          setAuthorized(false)
          setLoading(false)
        }
      } catch (err) {
        console.error('Admin verification error:', err)
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    checkAdmin()
    return () => {
      cancelled = true
    }
  }, [router])

  // Fetch withdrawals from API
  const fetchWithdrawals = async () => {
    setLoading(true)
    setApiError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/admin/withdrawals', {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load withdrawals')
      }

      setWithdrawals(data.withdrawals || [])
    } catch (err: any) {
      setApiError(err.message || 'An error occurred while fetching withdrawals')
    } finally {
      setLoading(false)
    }
  }

  // Handle Approve / Reject Submission
  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWithdrawal) return

    setSubmittingAction(true)
    setApiError(null)
    setSuccessMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const payload = {
        withdrawal_id: selectedWithdrawal.id,
        action: modalType,
        ...(modalType === 'approve' ? { reference_id: referenceId.trim() || undefined } : { failure_reason: failureReason.trim() })
      }

      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update transaction status')
      }

      setSuccessMessage(data.message || 'Transaction processed successfully')
      setSelectedWithdrawal(null)
      setModalType(null)
      setReferenceId('')
      setFailureReason('')
      
      // Refresh list
      await fetchWithdrawals()
    } catch (err: any) {
      setApiError(err.message || 'An error occurred')
    } finally {
      setSubmittingAction(false)
    }
  }

  const openApproveModal = (w: Withdrawal) => {
    setSelectedWithdrawal(w)
    setModalType('approve')
    setReferenceId(`TRF-${Date.now()}`)
  }

  const openRejectModal = (w: Withdrawal) => {
    setSelectedWithdrawal(w)
    setModalType('reject')
    setFailureReason('')
  }

  // Formatting utils
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Filter withdrawals
  const filteredWithdrawals = withdrawals.filter((w) => {
    // 1. Status Filter
    if (activeTab === 'pending' && w.status !== 'pending') return false
    if (activeTab === 'success' && w.status !== 'success') return false
    if (activeTab === 'failed' && w.status !== 'failed') return false

    // 2. Search Query (Email, Destination Account, Bank, External ID)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        w.user_email.toLowerCase().includes(q) ||
        w.account_number.includes(q) ||
        w.channel_code.toLowerCase().includes(q) ||
        w.external_id.toLowerCase().includes(q) ||
        (w.account_holder_name && w.account_holder_name.toLowerCase().includes(q))
      )
    }

    return true
  })

  // Stats
  const totalPending = withdrawals.filter(w => w.status === 'pending')
  const totalSuccess = withdrawals.filter(w => w.status === 'success')
  const totalFailed = withdrawals.filter(w => w.status === 'failed')

  const totalPendingAmount = totalPending.reduce((sum, w) => sum + w.amount, 0)
  const totalSuccessAmount = totalSuccess.reduce((sum, w) => sum + w.amount, 0)
  const totalFailedAmount = totalFailed.reduce((sum, w) => sum + w.amount, 0)

  // Render Access Denied
  if (!loading && !authorized) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white p-8 rounded-3xl border border-gray-200 shadow-xl text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Access Denied</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Your account ({userEmail}) is not authorized to access this administration page. If you are an administrator, please add your email to the <code>ADMIN_EMAILS</code> environment variable.
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all active:scale-[0.98] cursor-pointer"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 pb-12">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <span className="h-8 w-8 rounded-lg bg-indigo-600 text-white text-base font-black flex items-center justify-center">A</span>
            Withdrawals Administration
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manually transfer funds requested by respondents and update their payout statuses.
          </p>
        </div>
        
        <button
          onClick={fetchWithdrawals}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-bold rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15H18" />
          </svg>
          Refresh Data
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-3 animate-in fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="flex-1">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">×</button>
        </div>
      )}

      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3.5 rounded-xl text-sm font-semibold flex items-center gap-3 animate-in fade-in">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="flex-1">{apiError}</span>
          <button onClick={() => setApiError(null)} className="text-red-500 hover:text-red-700 cursor-pointer">×</button>
        </div>
      )}

      {/* Stats Summary Rows */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pending Card */}
        <div className="bg-white border-l-4 border-amber-500 p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Transfer</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-gray-900">{formatCurrency(totalPendingAmount)}</h3>
            <p className="text-xs text-gray-500 font-semibold mt-1">{totalPending.length} requests waiting payout</p>
          </div>
        </div>

        {/* Success Card */}
        <div className="bg-white border-l-4 border-emerald-500 p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Paid Out</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-gray-900">{formatCurrency(totalSuccessAmount)}</h3>
            <p className="text-xs text-gray-500 font-semibold mt-1">{totalSuccess.length} successful manual payouts</p>
          </div>
        </div>

        {/* Failed Card */}
        <div className="bg-white border-l-4 border-rose-500 p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rejected / Failed</span>
            <div className="h-8 w-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-black text-gray-900">{formatCurrency(totalFailedAmount)}</h3>
            <p className="text-xs text-gray-500 font-semibold mt-1">{totalFailed.length} rejected/refunded transactions</p>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        {/* Table Filters header */}
        <div className="p-5 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center border border-gray-200 bg-white p-1 rounded-xl shadow-xs">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              All ({withdrawals.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'pending' ? 'bg-amber-500 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Pending ({totalPending.length})
            </button>
            <button
              onClick={() => setActiveTab('success')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'success' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Paid ({totalSuccess.length})
            </button>
            <button
              onClick={() => setActiveTab('failed')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                activeTab === 'failed' ? 'bg-rose-600 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Rejected ({totalFailed.length})
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-80">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search email, account number, bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-semibold rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Content Table */}
        {loading && withdrawals.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center space-y-4">
            <div className="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-xs font-bold text-gray-400 tracking-wider uppercase">Loading transactions...</p>
          </div>
        ) : filteredWithdrawals.length === 0 ? (
          <div className="p-20 text-center space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-500">No withdrawal requests found</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              There are no payout requests matching your active filter or search query.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 tracking-wider uppercase border-b border-gray-200">
                  <th className="px-6 py-4">User Email / Date</th>
                  <th className="px-6 py-4">External Transaction ID</th>
                  <th className="px-6 py-4">Destination Account</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
                {filteredWithdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50/70 transition-colors">
                    {/* User & Date */}
                    <td className="px-6 py-4 space-y-1">
                      <div className="text-gray-900 font-bold truncate max-w-[200px]" title={w.user_email}>
                        {w.user_email}
                      </div>
                      <div className="text-[10px] text-gray-400 font-medium">{formatDate(w.created_at)}</div>
                    </td>

                    {/* External ID */}
                    <td className="px-6 py-4 font-mono text-gray-500 text-[10px] select-all">
                      {w.external_id}
                    </td>

                    {/* Account Destination */}
                    <td className="px-6 py-4 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block bg-indigo-50 text-indigo-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                          {w.channel_code}
                        </span>
                        <span className="font-bold font-mono text-gray-900 select-all">{w.account_number}</span>
                      </div>
                      {w.account_holder_name && (
                        <div className="text-[10px] text-gray-400 font-medium">An. {w.account_holder_name}</div>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 font-bold text-gray-900 text-sm">
                      {formatCurrency(w.amount)}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      {w.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                          <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
                          Pending
                        </span>
                      )}
                      {w.status === 'success' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200" title={`Ref: ${w.xendit_payout_id || '-'}`}>
                          <span className="h-1 w-1 rounded-full bg-emerald-500" />
                          Paid
                        </span>
                      )}
                      {w.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200" title={w.failure_reason || ''}>
                          <span className="h-1 w-1 rounded-full bg-rose-500" />
                          Rejected
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {w.status === 'pending' ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openApproveModal(w)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xs hover:shadow transition-all cursor-pointer"
                          >
                            Mark Paid
                          </button>
                          <button
                            onClick={() => openRejectModal(w)}
                            className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-100 text-[10px] font-bold px-2.5 py-1.5 rounded-lg shadow-xs hover:shadow transition-all cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-medium">
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

      {/* Interactive Modals */}
      {modalType && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-black text-gray-900 tracking-tight">
                {modalType === 'approve' ? 'Complete Payout' : 'Reject Withdrawal Request'}
              </h3>
              <button
                onClick={() => {
                  setModalType(null)
                  setSelectedWithdrawal(null)
                }}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleActionSubmit} className="p-6 space-y-4">
              {/* Summary Details */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">User Email:</span>
                  <span className="text-gray-900 font-bold">{selectedWithdrawal.user_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">Amount:</span>
                  <span className="text-indigo-600 font-black">{formatCurrency(selectedWithdrawal.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 font-semibold">Destination:</span>
                  <span className="text-gray-900 font-bold uppercase">{selectedWithdrawal.channel_code} - {selectedWithdrawal.account_number}</span>
                </div>
                {selectedWithdrawal.account_holder_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-semibold">Holder Name:</span>
                    <span className="text-gray-900 font-bold">{selectedWithdrawal.account_holder_name}</span>
                  </div>
                )}
              </div>

              {/* Form Input fields */}
              {modalType === 'approve' ? (
                <div className="space-y-1.5">
                  <label htmlFor="ref-id" className="text-xs font-bold text-gray-500">
                    Transfer Reference / Transaction ID
                  </label>
                  <input
                    id="ref-id"
                    type="text"
                    required
                    value={referenceId}
                    onChange={(e) => setReferenceId(e.target.value)}
                    placeholder="e.g. TRF-1234567890"
                    className="w-full px-3 py-2 border border-gray-250 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs font-semibold rounded-lg"
                  />
                  <p className="text-[10px] text-gray-400 leading-normal">
                    Enter the reference ID from your bank/e-wallet transfer. This will be stored for audit trails.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label htmlFor="reason" className="text-xs font-bold text-gray-500">
                    Rejection / Failure Reason
                  </label>
                  <textarea
                    id="reason"
                    required
                    rows={3}
                    value={failureReason}
                    onChange={(e) => setFailureReason(e.target.value)}
                    placeholder="e.g., Nomor rekening tidak terdaftar / Nama pemilik rekening berbeda"
                    className="w-full px-3 py-2 border border-gray-250 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-xs font-semibold rounded-lg resize-none"
                  />
                  <p className="text-[10px] text-gray-400 leading-normal">
                    The user's locked balance will be immediately **refunded** to their active wallet. The reason will be visible in their ledger logs.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setModalType(null)
                    setSelectedWithdrawal(null)
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className={`px-4 py-2 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 ${
                    modalType === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submittingAction && (
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
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
    </div>
  )
}
