'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSurveys } from '@/services/survey.service'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function ExploreSurveysPage() {
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

  if (loading) {
    return (
      <section className="mx-auto w-full max-w-6xl animate-pulse">
        {/* Header */}
        <div className="mb-6 space-y-2">
          <div className="h-7 w-28 rounded-lg bg-gray-200" />
          <div className="h-4 w-56 rounded bg-gray-100" />
        </div>

        {/* Survey card skeletons */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex justify-between items-start">
                <div className="h-5 w-14 rounded-full bg-green-100" />
                <div className="h-4 w-10 rounded bg-gray-100" />
              </div>
              <div className="h-5 w-3/4 rounded bg-gray-200 mb-2" />
              <div className="h-3 w-full rounded bg-gray-100 mb-1" />
              <div className="h-3 w-5/6 rounded bg-gray-100" />
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
                <div className="h-3 w-32 rounded bg-gray-100" />
                <div className="h-3 w-24 rounded bg-blue-100" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cari Survey</h1>
        <p className="text-sm text-gray-500">Daftar survey yang tersedia untukmu.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!error && surveys.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-700">Belum ada survey</p>
          <p className="mt-1 text-sm text-gray-500">
            Tidak ada survey aktif saat ini. Cek lagi nanti!
          </p>
        </div>
      )}

      {!error && surveys.length > 0 && (
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
