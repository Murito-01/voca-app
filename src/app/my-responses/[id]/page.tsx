'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getResponseById } from '@/services/response.service'

export default function ResponseDetail() {
    const params = useParams()
    const id = params.id as string

    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!id) return

        const fetchData = async () => {
            try {
                const res = await getResponseById(id)
                setData(res.data)
            } catch (err: any) {
                setError(err.message || 'Terjadi kesalahan saat memuat detail respons.')
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 p-6 flex justify-center items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-gray-100 p-6">
                <div className="max-w-2xl mx-auto">
                    <Link href="/my-responses" className="text-blue-600 hover:underline text-sm font-medium mb-6 inline-block">
                        ← Kembali ke Riwayat Respons
                    </Link>
                    <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-4 text-sm">
                        {error || 'Data tidak ditemukan'}
                    </div>
                </div>
            </div>
        )
    }

    const groupedAnswers = Object.values(
        (data?.answers || []).reduce((acc: any, current: any) => {
            if (!acc[current.question_id]) {
                acc[current.question_id] = {
                    ...current,
                    options: current.option_text ? [current.option_text] : []
                }
            } else if (current.option_text) {
                acc[current.question_id].options.push(current.option_text)
            }
            return acc
        }, {})
    ) as any[];

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-3xl mx-auto">
                <Link
                    href="/my-responses"
                    className="text-blue-600 hover:underline text-sm font-medium mb-6 inline-block"
                >
                    ← Kembali ke Riwayat Respons
                </Link>

                {/* Header Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm mb-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                {data.survey?.title || 'Untitled Survey'}
                            </h1>
                            {data.survey?.description && (
                                <p className="text-sm text-gray-700 mb-3">
                                    {data.survey.description}
                                </p>
                            )}
                            <p className="text-xs text-gray-500">
                                Dikerjakan pada: {new Date(data.created_at).toLocaleDateString('id-ID', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${
                            data.status === 'valid' ? 'bg-green-100 text-green-700' :
                            data.status === 'low_quality' ? 'bg-orange-100 text-orange-700' :
                            data.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                        }`}>
                            {data.status || 'Pending'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                        <div>
                            <p className="text-xs text-gray-500 mb-1">Score</p>
                            <p className="text-lg font-bold text-gray-900">{data.score !== null ? data.score : '-'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Reward Final</p>
                            <p className={`text-lg font-bold ${data.reward_final > 0 ? 'text-green-600' : 'text-gray-900'}`}>
                                {new Intl.NumberFormat('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    minimumFractionDigits: 0
                                }).format(data.reward_final || 0)}
                            </p>
                        </div>
                    </div>

                    {/* Score Breakdown Section */}
                    {data.score_breakdown && typeof data.score_breakdown === 'object' && Object.keys(data.score_breakdown).length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* Breakdown */}
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <span>🧮</span> Breakdown
                                </h3>
                                <div className="space-y-1.5 text-sm text-gray-600 font-mono">
                                    <div className="flex justify-between">
                                        <span>+ Base Score</span>
                                        <span>{data.score_breakdown.base || 0}</span>
                                    </div>
                                    {data.score_breakdown.time_penalty > 0 && (
                                        <div className="flex justify-between text-red-600">
                                            <span>- Time Penalty</span>
                                            <span>{data.score_breakdown.time_penalty}</span>
                                        </div>
                                    )}
                                    {data.score_breakdown.essay_penalty > 0 && (
                                        <div className="flex justify-between text-red-600">
                                            <span>- Essay Penalty</span>
                                            <span>{data.score_breakdown.essay_penalty}</span>
                                        </div>
                                    )}
                                    {data.score_breakdown.reputation_bonus > 0 && (
                                        <div className="flex justify-between text-green-600">
                                            <span>+ Reputation Bonus</span>
                                            <span>{data.score_breakdown.reputation_bonus}</span>
                                        </div>
                                    )}
                                    {data.score_breakdown.reputation_penalty > 0 && (
                                        <div className="flex justify-between text-red-600">
                                            <span>- Reputation Penalty</span>
                                            <span>{data.score_breakdown.reputation_penalty}</span>
                                        </div>
                                    )}
                                    <div className="pt-2 mt-2 border-t border-gray-300 flex justify-between font-bold text-gray-900">
                                        <span>Final Score</span>
                                        <span>{data.score_breakdown.final_score || data.score}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div className="space-y-4">
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                        <span>⏱️</span> Duration
                                    </h3>
                                    <p className="text-sm text-gray-700 flex items-center gap-2">
                                        <span>{data.score_breakdown.duration}s (Min: {data.score_breakdown.min_duration}s)</span>
                                        {data.score_breakdown.duration >= data.score_breakdown.min_duration ? (
                                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Normal ✅</span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Too fast ❌</span>
                                        )}
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                        <span>🧠</span> Attention Check
                                    </h3>
                                    <p className="text-sm text-gray-700">
                                        {data.score_breakdown.attention_check === 'passed' ? 'Passed ✅' : 
                                         data.score_breakdown.attention_check === 'failed' ? 'Failed ❌' : 
                                         <span className="capitalize">{data.score_breakdown.attention_check || 'N/A'}</span>}
                                    </p>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                        <span>⭐</span> Reputation
                                    </h3>
                                    <p className="text-sm text-gray-700">
                                        {data.score_breakdown.reputation_bonus > 0 ? <span className="text-green-600 font-medium">+{data.score_breakdown.reputation_bonus} Bonus</span> : 
                                         data.score_breakdown.reputation_penalty > 0 ? <span className="text-red-600 font-medium">-{data.score_breakdown.reputation_penalty} Penalty</span> : 
                                         'No impact'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Answers Section */}
                <h2 className="text-lg font-bold text-gray-900 mb-4">Jawaban Anda</h2>
                <div className="space-y-4">
                    {groupedAnswers.length > 0 ? (
                        groupedAnswers.map((answer: any, index: number) => (
                            <div key={answer.question_id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                <p className="text-sm font-medium text-gray-900 mb-2">
                                    {index + 1}. {answer.question_text}
                                </p>
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm text-gray-700">
                                    {answer.question_type === 'radio' || answer.question_type === 'checkbox' 
                                        ? (answer.options?.length > 0 ? answer.options.join(', ') : answer.answer_text)
                                        : answer.answer_text}
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 italic">Tidak ada detail jawaban tersedia.</p>
                    )}
                </div>
            </div>
        </div>
    )
}
