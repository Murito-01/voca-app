'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import ResponderDashboard from '@/components/responder/ResponderDashboard'
import { getMyResponses } from '@/services/response.service'
import { getSurveys } from '@/services/survey.service'
import { getWalletBalance } from '@/services/survey.service'

type ResponderTab = 'responses' | 'explore'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

/* ─────────────────────────────────────────────
   Top Bar
   ───────────────────────────────────────────── */

function ResponderTopBar({ walletBalance }: { walletBalance: number | null }) {
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

/* ─────────────────────────────────────────────
   Sidebar
   ───────────────────────────────────────────── */

function ResponderSidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: ResponderTab
  setActiveTab: (tab: ResponderTab) => void
}) {
  const itemClass = (tab: ResponderTab) =>
    `w-full rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors cursor-pointer ${
      activeTab === tab
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-gray-700 hover:bg-gray-100'
    }`

  return (
    <aside className="w-full border-b border-gray-200 bg-white px-4 py-4 md:min-h-[calc(100vh-4rem)] md:w-64 md:border-b-0 md:border-r md:px-5">
      <nav className="grid gap-2">
        <button className={itemClass('responses')} onClick={() => setActiveTab('responses')}>
          Riwayat Respons
        </button>
        <button className={itemClass('explore')} onClick={() => setActiveTab('explore')}>
          Cari Survey
        </button>
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

/* ─────────────────────────────────────────────
   My Responses Panel
   ───────────────────────────────────────────── */

function MyResponsesPanel({ onExplore }: { onExplore: () => void }) {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      try {
        const res = await getMyResponses()
        if (!cancelled) setData(res.data || [])
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  const draftResponses = data.filter((r) => r.status === 'draft')
  const submittedResponses = data.filter((r) => r.status !== 'draft')

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Riwayat Respons</h1>
          <p className="text-sm text-gray-500">Daftar survey yang telah kamu kerjakan.</p>
        </div>
        <button
          onClick={onExplore}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Cari Survey Lain
        </button>
      </div>

      {loading && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      )}

      {!loading && !error && <ResponderDashboard />}

      {!loading && error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="text-4xl mb-3">📝</div>
          <p className="text-lg font-semibold text-gray-700">Belum ada respons</p>
          <p className="mt-1 text-sm text-gray-500">
            Kamu belum mengerjakan survey apapun. Yuk mulai cari survey!
          </p>
          <button
            onClick={onExplore}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Cari Survey
          </button>
        </div>
      )}

      {/* Drafts */}
      {!loading && !error && draftResponses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Survey Disimpan (Draft)</h2>
          <div className="space-y-4">
            {draftResponses.map((r) => (
              <ResponseCard key={r.id} response={r} isDraft />
            ))}
          </div>
        </div>
      )}

      {/* Submitted */}
      {!loading && !error && submittedResponses.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Survey Selesai</h2>
          <div className="space-y-4">
            {submittedResponses.map((r) => (
              <ResponseCard key={r.id} response={r} isDraft={false} />
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

/* ─────────────────────────────────────────────
   Response Card
   ───────────────────────────────────────────── */

function ResponseCard({ response: r, isDraft }: { response: any; isDraft: boolean }) {
  return (
    <Link
      href={isDraft ? `/surveys/${r.survey_id}` : `/my-responses/${r.id}`}
      className="block bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-gray-900 leading-tight">
              {r.title || 'Untitled Survey'}
            </h2>
            <span
              className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                r.status === 'valid'
                  ? 'bg-green-100 text-green-700'
                  : r.status === 'low_quality'
                    ? 'bg-orange-100 text-orange-700'
                    : r.status === 'rejected'
                      ? 'bg-red-100 text-red-700'
                      : r.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
              }`}
            >
              {r.status || 'Pending'}
            </span>
            {!isDraft && r.score !== null && r.score !== undefined && (
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Score: {r.score}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {isDraft ? 'Disimpan pada: ' : 'Dikerjakan pada: '}
            {new Date(r.created_at).toLocaleDateString('id-ID', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs text-gray-500 mb-0.5">
            {isDraft ? 'Potensi Reward' : 'Reward Didapat'}
          </p>
          <p
            className={`text-lg font-bold ${
              r.reward_final > 0 && !isDraft ? 'text-green-600' : 'text-gray-400'
            }`}
          >
            {formatCurrency(isDraft ? r.reward : r.reward_final || 0)}
          </p>
          {!isDraft && r.reward_final !== r.reward && r.reward > 0 && (
            <p className="text-[10px] text-gray-400 line-through">
              {formatCurrency(r.reward)}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

/* ─────────────────────────────────────────────
   Explore Surveys Panel
   ───────────────────────────────────────────── */

function ExploreSurveysPanel() {
  const [surveys, setSurveys] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      try {
        const result = await getSurveys()
        if (!cancelled) setSurveys(result.data || [])
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cari Survey</h1>
        <p className="text-sm text-gray-500">Daftar survey yang tersedia untukmu.</p>
      </div>

      {loading && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && surveys.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-700">Belum ada survey</p>
          <p className="mt-1 text-sm text-gray-500">
            Tidak ada survey aktif saat ini. Cek lagi nanti!
          </p>
        </div>
      )}

      {!loading && !error && surveys.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => (
            <Link
              href={`/surveys/${survey.id}`}
              key={survey.id}
              className="block bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
                <span className="text-sm text-gray-500 font-medium">
                  {survey.remaining_responses} left
                </span>
              </div>

              <h3
                className="text-lg font-semibold text-gray-900 mb-2 truncate"
                title={survey.title}
              >
                {survey.title || `Survey ${survey.id?.substring(0, 8)}...`}
              </h3>

              {survey.description && (
                <p
                  className="text-gray-600 text-sm mb-4 line-clamp-2"
                  title={survey.description}
                >
                  {survey.description}
                </p>
              )}

              <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                <span className="block mb-1">
                  Creator: {survey.creator_id?.substring(0, 8)}...
                </span>
                {survey.reward_per_response && (
                  <span className="block font-semibold text-blue-600">
                    Reward: {formatCurrency(survey.reward_per_response)}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

/* ─────────────────────────────────────────────
   Main Page
   ───────────────────────────────────────────── */

export default function ResponderPage() {
  const [activeTab, setActiveTab] = useState<ResponderTab>('responses')
  const [walletBalance, setWalletBalance] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchWallet = async () => {
      try {
        const wallet = await getWalletBalance()
        if (!cancelled) setWalletBalance(wallet.balance)
      } catch {
        if (!cancelled) setWalletBalance(null)
      }
    }

    fetchWallet()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-100">
      <ResponderTopBar walletBalance={walletBalance} />
      <div className="md:flex">
        <ResponderSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className="flex-1 p-6 md:p-8">
          {activeTab === 'responses' ? (
            <MyResponsesPanel onExplore={() => setActiveTab('explore')} />
          ) : (
            <ExploreSurveysPanel />
          )}
        </main>
      </div>
    </div>
  )
}
