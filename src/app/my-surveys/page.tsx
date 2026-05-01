'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getMySurveys } from '@/services/survey.service'
import SurveyCard from '@/components/creator/SurveyCard'
import { Survey } from '@/types/survey.types'

export default function MySurveys() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const json = await getMySurveys()
                setData(json.data || [])
            } catch (err: any) {
                setError(err.message || 'Terjadi kesalahan saat memuat data.')
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
                        href="/my-surveys/create"
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
                            href="/my-surveys/create"
                            className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Buat Survey Sekarang
                        </Link>
                    </div>
                )}

                {/* Survey List */}
                {!loading && !error && data.length > 0 && (
                    <div className="space-y-4">
                        {data.map((s: Survey) => (
                            <SurveyCard key={s.id} survey={s} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}