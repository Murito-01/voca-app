'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function MySurveys() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const session = await supabase.auth.getSession()
                const token = session.data.session?.access_token

                if (!token) {
                    setError('Kamu belum login. Silakan login terlebih dahulu.')
                    setLoading(false)
                    return
                }

                const res = await fetch('/api/survey/my', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                })

                const json = await res.json()

                if (!res.ok) {
                    setError(json.error || 'Gagal memuat data survey')
                } else {
                    setData(json.data || [])
                }
            } catch (err) {
                setError('Terjadi kesalahan saat memuat data.')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <Link
                            href="/"
                            className="text-blue-600 hover:underline text-sm font-medium"
                        >
                            ← Kembali ke Home
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 mt-2">Survey Saya</h1>
                        <p className="text-gray-500 text-sm">Daftar survey yang sudah kamu buat</p>
                    </div>
                    <Link
                        href="/create-survey"
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        + Buat Survey
                    </Link>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {/* Error State */}
                {!loading && error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-4 text-sm">
                        {error}
                    </div>
                )}

                {/* Empty State */}
                {!loading && !error && data.length === 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
                        <div className="text-4xl mb-3">📋</div>
                        <p className="text-gray-700 font-semibold text-lg">Belum ada survey</p>
                        <p className="text-gray-500 text-sm mt-1 mb-5">
                            Buat survey pertamamu dan mulai kumpulkan respons!
                        </p>
                        <Link
                            href="/create-survey"
                            className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Buat Survey Sekarang
                        </Link>
                    </div>
                )}

                {/* Survey List */}
                {!loading && !error && data.length > 0 && (
                    <div className="space-y-4">
                        {data.map((s) => {
                            const completed = s.total_responses - s.remaining_responses
                            const progress = s.total_responses > 0
                                ? Math.round((completed / s.total_responses) * 100)
                                : 0
                            const totalSpend = completed * s.reward_per_response

                            return (
                                <div
                                    key={s.id}
                                    className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
                                >
                                    {/* Title & Status */}
                                    <div className="flex items-start justify-between mb-4">
                                        <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                                            {s.title || 'Untitled Survey'}
                                        </h2>
                                        <span className={`ml-3 shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                            s.status === 'active'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-600'
                                        }`}>
                                            {s.status === 'active' ? 'Aktif' : s.status || 'Unknown'}
                                        </span>
                                    </div>

                                    {/* Progress */}
                                    <div className="mb-4">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-sm text-gray-600 font-medium">
                                                Progress Responden
                                            </span>
                                            <span className="text-sm font-semibold text-gray-800">
                                                {completed} / {s.total_responses}
                                                <span className="text-gray-400 font-normal ml-1">({progress}%)</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                                            <div
                                                className="bg-green-500 h-2.5 rounded-full transition-all duration-300"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100">
                                        <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Reward/Responden</p>
                                            <p className="text-sm font-semibold text-blue-600">
                                                {new Intl.NumberFormat('id-ID', {
                                                    style: 'currency',
                                                    currency: 'IDR',
                                                    minimumFractionDigits: 0
                                                }).format(s.reward_per_response)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Sisa Slot</p>
                                            <p className="text-sm font-semibold text-gray-800">
                                                {s.remaining_responses}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 mb-0.5">Total Dikeluarkan</p>
                                            <p className="text-sm font-semibold text-gray-800">
                                                {new Intl.NumberFormat('id-ID', {
                                                    style: 'currency',
                                                    currency: 'IDR',
                                                    minimumFractionDigits: 0
                                                }).format(totalSpend)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}