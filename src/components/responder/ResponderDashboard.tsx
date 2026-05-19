'use client'

import { useEffect, useState } from 'react'
import { getMyResponses } from '@/services/response.service'

interface DashboardData {
  totalEarnings: number
  totalCompleted: number
  totalDraft: number
  validCount: number
  lowQualityCount: number
  rejectedCount: number
  averageScore: number | null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}

export default function ResponderDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getMyResponses()
        const responses: any[] = res.data || []

        const submitted = responses.filter((r) => r.status !== 'draft')
        const drafts = responses.filter((r) => r.status === 'draft')

        const validCount = submitted.filter((r) => r.status === 'valid').length
        const lowQualityCount = submitted.filter((r) => r.status === 'low_quality').length
        const rejectedCount = submitted.filter((r) => r.status === 'rejected').length

        const totalEarnings = submitted.reduce((acc, r) => acc + (r.reward_final || 0), 0)

        const scored = submitted.filter((r) => r.score !== null && r.score !== undefined)
        const averageScore =
          scored.length > 0
            ? scored.reduce((acc: number, r: any) => acc + r.score, 0) / scored.length
            : null

        setData({
          totalEarnings,
          totalCompleted: submitted.length,
          totalDraft: drafts.length,
          validCount,
          lowQualityCount,
          rejectedCount,
          averageScore,
        })
      } catch (err: any) {
        setError(err.message || 'Gagal memuat metrik')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-24 bg-gray-100 rounded-xl"></div>
          <div className="h-24 bg-gray-100 rounded-xl"></div>
          <div className="h-24 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 text-sm border border-red-100">
        ⚠️ {error}
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>📊</span> Dashboard Overview
      </h2>

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200 shadow-sm">
          <p className="text-green-700 text-xs font-semibold uppercase tracking-wider mb-1">
            Total Pendapatan
          </p>
          <p className="text-2xl font-bold text-green-900">
            {formatCurrency(data.totalEarnings)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200 shadow-sm">
          <p className="text-blue-700 text-xs font-semibold uppercase tracking-wider mb-1">
            Survey Selesai
          </p>
          <p className="text-2xl font-bold text-blue-900">{data.totalCompleted}</p>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200 shadow-sm">
          <p className="text-yellow-700 text-xs font-semibold uppercase tracking-wider mb-1">
            Draft Tersimpan
          </p>
          <p className="text-2xl font-bold text-yellow-900">{data.totalDraft}</p>
        </div>
      </div>

      {/* Response Quality */}
      <div className="border-t border-gray-100 pt-5">
        <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>⭐</span> Kualitas Respons
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
            <p className="text-gray-500 text-xs font-medium mb-1">Total Respons</p>
            <p className="text-xl font-bold text-gray-900">{data.totalCompleted}</p>
          </div>

          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <p className="text-green-700 text-xs font-medium mb-1">Valid</p>
            <p className="text-xl font-bold text-green-800">{data.validCount}</p>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-yellow-700 text-xs font-medium mb-1">Low Quality</p>
            <p className="text-xl font-bold text-yellow-800">{data.lowQualityCount}</p>
          </div>

          <div className="bg-red-50 p-3 rounded-lg border border-red-200">
            <p className="text-red-700 text-xs font-medium mb-1">Rejected</p>
            <p className="text-xl font-bold text-red-800">{data.rejectedCount}</p>
          </div>
        </div>

        {/* Average Score */}
        <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div>
            <p className="text-gray-800 font-semibold text-sm">Rata-rata Skor</p>
            <p className="text-xs text-gray-500">Skor rata-rata dari semua respons yang dinilai</p>
          </div>
          <div className="flex items-center gap-2">
            {data.averageScore !== null ? (
              <span
                className={`text-xl font-bold ${
                  data.averageScore >= 80
                    ? 'text-green-600'
                    : data.averageScore >= 50
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {data.averageScore.toFixed(1)}
              </span>
            ) : (
              <span className="text-sm font-semibold text-gray-400">Belum ada data</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
