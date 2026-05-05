'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getMyResponses } from '@/services/response.service'

export default function MyResponses() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await getMyResponses()
                setData(res.data || [])
            } catch (err: any) {
                setError(err.message || 'Terjadi kesalahan saat memuat data.')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    const totalReward = data.reduce((acc, r) => {
        return acc + (r.reward_final || 0)
    }, 0)

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
                        <h1 className="text-2xl font-bold text-gray-900 mt-2">Riwayat Respons</h1>
                        <p className="text-gray-500 text-sm">Daftar survey yang telah kamu kerjakan</p>
                    </div>
                    <Link
                        href="/surveys"
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Cari Survey Lain
                    </Link>
                </div>

                {/* Summary Card */}
                {!loading && !error && data.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6 flex items-center justify-between border-l-4 border-l-blue-600">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Pendapatan</p>
                            <h2 className="text-3xl font-bold text-blue-600">
                                {new Intl.NumberFormat('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    minimumFractionDigits: 0
                                }).format(totalReward)}
                            </h2>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500 font-medium">Total Survey</p>
                            <p className="text-2xl font-bold text-gray-900">{data.length}</p>
                        </div>
                    </div>
                )}

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
                        <div className="text-4xl mb-3">📝</div>
                        <p className="text-gray-700 font-semibold text-lg">Belum ada respons</p>
                        <p className="text-gray-500 text-sm mt-1 mb-5">
                            Kamu belum mengerjakan survey apapun. Yuk mulai cari survey!
                        </p>
                        <Link
                            href="/surveys"
                            className="inline-block px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Lihat Daftar Survey
                        </Link>
                    </div>
                )}

                {/* Response List */}
                {!loading && !error && data.length > 0 && (
                    <div className="space-y-4">
                        {data.map((r) => {
                            return (
                                <Link
                                    href={`/my-responses/${r.id}`}
                                    key={r.id}
                                    className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center justify-between hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                                >
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h2 className="text-lg font-semibold text-gray-900 leading-tight">
                                                {r.title || 'Untitled Survey'}
                                            </h2>
                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                                                r.status === 'valid' ? 'bg-green-100 text-green-700' :
                                                r.status === 'low_quality' ? 'bg-orange-100 text-orange-700' :
                                                r.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {r.status || 'Pending'}
                                            </span>
                                            {r.score !== null && r.score !== undefined && (
                                                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                                    Score: {r.score}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Dikerjakan pada: {new Date(r.created_at).toLocaleDateString('id-ID', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                    
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 mb-0.5">Reward Didapat</p>
                                        <p className={`text-lg font-bold ${r.reward_final > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                            {new Intl.NumberFormat('id-ID', {
                                                style: 'currency',
                                                currency: 'IDR',
                                                minimumFractionDigits: 0
                                            }).format(r.reward_final || 0)}
                                        </p>
                                        {r.reward_final !== r.reward && r.reward > 0 && (
                                            <p className="text-[10px] text-gray-400 line-through">
                                                {new Intl.NumberFormat('id-ID', {
                                                    style: 'currency',
                                                    currency: 'IDR',
                                                    minimumFractionDigits: 0
                                                }).format(r.reward)}
                                            </p>
                                        )}
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
