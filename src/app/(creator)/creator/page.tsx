'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import CreatorDashboard from '@/components/creator/CreatorDashboard'
import SurveyCard from '@/components/creator/SurveyCard'
import { getMySurveys } from '@/services/survey.service'
import { Survey } from '@/types/survey.types'

export default function CreatorPage() {
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
    <section className="mx-auto w-full max-w-[1600px]">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Surveys</h1>
          <p className="text-sm text-gray-500">Kelola survey yang kamu buat sebagai creator.</p>
        </div>
        <Link
          href="/creator/create"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Create New Survey
        </Link>
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
          <div className="text-4xl mb-3">📋</div>
          <p className="text-lg font-semibold text-gray-700">Belum ada survey</p>
          <p className="mt-1 text-sm text-gray-500">
            Buat survey pertamamu dan mulai kumpulkan respons.
          </p>
          <Link
            href="/creator/create"
            className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Create Survey
          </Link>
        </div>
      )}

      {!loading && !error && data.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {data.map((survey) => (
            <SurveyCard key={survey.id} survey={survey} />
          ))}
        </div>
      )}
    </section>
  )
}
