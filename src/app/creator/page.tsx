'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import CreatorDashboard from '@/components/creator/CreatorDashboard'
import SurveyCard from '@/components/creator/SurveyCard'
import {
  createSurvey,
  getMySurveys,
  getWalletBalance,
} from '@/services/survey.service'
import { Survey } from '@/types/survey.types'

type CreatorTab = 'surveys' | 'create'
type ResponseMode = 'fixed' | 'extended'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

function CreatorSidebar({
  activeTab,
  setActiveTab,
}: {
  activeTab: CreatorTab
  setActiveTab: (tab: CreatorTab) => void
}) {
  const itemClass = (tab: CreatorTab) =>
    `w-full rounded-lg px-4 py-3 text-left text-sm font-semibold transition-colors ${
      activeTab === tab
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-gray-700 hover:bg-gray-100'
    }`

  return (
    <aside className="w-full border-b border-gray-200 bg-white px-4 py-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r md:px-5">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 text-sm font-bold text-blue-600">
          V
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">Voca Creator</p>
          <p className="text-xs text-gray-500">Survey workspace</p>
        </div>
      </div>

      <nav className="grid gap-2">
        <button className={itemClass('surveys')} onClick={() => setActiveTab('surveys')}>
          My Surveys
        </button>
        <button className={itemClass('create')} onClick={() => setActiveTab('create')}>
          Create Survey
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

function MySurveysPanel({ onCreate }: { onCreate: () => void }) {
  const [data, setData] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      try {
        const json = await getMySurveys()
        if (!cancelled) setData(json.data || [])
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
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Surveys</h1>
          <p className="text-sm text-gray-500">Kelola survey yang kamu buat sebagai creator.</p>
        </div>
        <button
          onClick={onCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Create New Survey
        </button>
      </div>

      {loading && (
        <div className="flex h-40 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      )}

      {!loading && !error && <CreatorDashboard />}

      {!loading && error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && data.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-700">Belum ada survey</p>
          <p className="mt-1 text-sm text-gray-500">
            Buat survey pertamamu dan mulai kumpulkan respons.
          </p>
          <button
            onClick={onCreate}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Create Survey
          </button>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="space-y-4">
          {data.map((survey) => (
            <SurveyCard key={survey.id} survey={survey} />
          ))}
        </div>
      )}
    </section>
  )
}

function CreateSurveyPanel() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [reward, setReward] = useState(0)
  const [total, setTotal] = useState(0)
  const [responseMode, setResponseMode] = useState<ResponseMode>('fixed')
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

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

  const totalBudget = reward * total
  const budgetInfo = useMemo(() => {
    if (walletBalance === null || reward <= 0 || total <= 0) return null
    const gap = totalBudget - walletBalance
    const affordable = reward > 0 ? Math.floor(walletBalance / reward) : 0
    return {
      affordable,
      gap,
      sufficient: gap <= 0,
    }
  }, [reward, total, totalBudget, walletBalance])

  const handleSubmit = async () => {
    if (!title.trim() || reward <= 0 || total <= 0) {
      setIsError(true)
      setMessage('Isi judul, reward, dan target responden dengan benar.')
      return
    }

    setLoading(true)
    setMessage('')
    setIsError(false)

    try {
      const data = await createSurvey({
        title: title.trim(),
        description: description.trim() || undefined,
        reward_per_response: reward,
        total_responses: total,
        allow_extended_responses: responseMode === 'extended',
      })

      setMessage('Survey berhasil dibuat. Mengalihkan ke detail survey...')
      setTimeout(() => {
        router.push(`/my-surveys/${data.survey_id}`)
      }, 900)
    } catch (err: unknown) {
      setIsError(true)
      setMessage(err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Survey</h1>
        <p className="text-sm text-gray-500">Buat survey baru dari ruang creator.</p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Survey Title
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Enter survey title"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Enter survey description"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Reward per Respondent
              </label>
              <input
                type="number"
                min="0"
                value={reward === 0 ? '' : reward}
                onChange={(event) => setReward(Number(event.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Number of Respondents
              </label>
              <input
                type="number"
                min="0"
                value={total === 0 ? '' : total}
                onChange={(event) => setTotal(Number(event.target.value))}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Response Mode
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setResponseMode('fixed')}
                className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  responseMode === 'fixed'
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="block font-semibold">Jumlah Tetap</span>
                <span className="mt-1 block text-xs">
                  Sisa budget dikembalikan jika ada response kualitas rendah.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setResponseMode('extended')}
                className={`rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                  responseMode === 'extended'
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="block font-semibold">Maksimalkan Respon</span>
                <span className="mt-1 block text-xs">
                  Budget dipakai untuk mendapatkan response tambahan.
                </span>
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-medium text-gray-700">Total Cost</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalBudget)}</p>
            </div>
            {walletBalance !== null && (
              <p className="mt-1 text-xs text-gray-500">
                Balance: {formatCurrency(walletBalance)}
              </p>
            )}
          </div>

          {budgetInfo && (
            <div
              className={`rounded-lg border p-4 text-sm ${
                budgetInfo.sufficient
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {budgetInfo.sufficient
                ? 'Saldo kamu cukup untuk survey ini.'
                : `Saldo kurang ${formatCurrency(budgetInfo.gap)}. Dengan saldo saat ini, target maksimal sekitar ${budgetInfo.affordable} responden.`}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
          >
            {loading ? 'Creating Survey...' : 'Create Survey'}
          </button>

          {message && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                isError
                  ? 'border-red-100 bg-red-50 text-red-700'
                  : 'border-green-100 bg-green-50 text-green-700'
              }`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default function CreatorPage() {
  const [activeTab, setActiveTab] = useState<CreatorTab>('surveys')

  return (
    <div className="min-h-screen bg-gray-100 md:flex">
      <CreatorSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 p-6 md:p-8">
        {activeTab === 'surveys' ? (
          <MySurveysPanel onCreate={() => setActiveTab('create')} />
        ) : (
          <CreateSurveyPanel />
        )}
      </main>
    </div>
  )
}
