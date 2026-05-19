'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ResponderDashboard from '@/components/responder/ResponderDashboard'
import ResponseCard from '@/components/responder/ResponseCard'
import { getMyResponses } from '@/services/response.service'

export default function ResponderPage() {
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
        <Link
          href="/responder/explore"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          Cari Survey Lain
        </Link>
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
          <Link
            href="/responder/explore"
            className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Cari Survey
          </Link>
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
