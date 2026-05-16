'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSurvey, getRewardThresholdConfig, getWalletBalance } from '@/services/survey.service'
import { getEstimationSummary, type EstimationSummary } from '@/lib/survey-estimation'

type ResponseMode = 'fixed' | 'extended'

export default function CreateSurvey() {
    const router = useRouter()

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [reward, setReward] = useState(0)
    const [total, setTotal] = useState(0)
    const [responseMode, setResponseMode] = useState<ResponseMode>('fixed')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [isError, setIsError] = useState(false)
    const [rewardWarning, setRewardWarning] = useState<string | null>(null)
    const [walletBalance, setWalletBalance] = useState<number | null>(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const wallet = await getWalletBalance()
                if (!cancelled) {
                    setWalletBalance(wallet.balance)
                }
            } catch {
                if (!cancelled) {
                    setWalletBalance(null)
                }
            }
        })()
        return () => { cancelled = true }
    }, [])

    const rewardHint = useMemo(() => {
        const baseTotal = total > 0 ? total : 1;
        return {
            min_required: baseTotal * 100,
            recommended: baseTotal * 200,
        };
    }, [total]);

    const totalBudget = reward * total

    // Live estimation — recalculates instantly when reward/total/recommended changes
    const estimation: EstimationSummary | null = useMemo(() => {
        if (reward <= 0 || total <= 0 || !rewardHint) return null;
        return getEstimationSummary(reward, rewardHint.recommended, total);
    }, [reward, total, rewardHint])

    // Smart budget suggestion
    const budgetSuggestion = useMemo(() => {
        if (reward <= 0 || total <= 0 || walletBalance === null) return null
        const requiredBudget = reward * total
        const gap = requiredBudget - walletBalance
        const affordable = reward > 0 ? Math.floor(walletBalance / reward) : 0
        return { requiredBudget, gap, affordable, sufficient: gap <= 0 }
    }, [reward, total, walletBalance])

    const handleSubmit = async () => {
        if (!title || reward <= 0 || total <= 0) {
            setIsError(true)
            setMessage('Isi semua field dengan benar')
            return
        }

        setLoading(true)
        setMessage('')
        setIsError(false)

        try {
            const data = await createSurvey({
                title,
                description: description || undefined,
                reward_per_response: reward,
                total_responses: total,
                allow_extended_responses: responseMode === 'extended',
            })

            setIsError(false)
            setRewardWarning(typeof data.reward_warning === 'string' ? data.reward_warning : null)
            setMessage('Survey berhasil dibuat! Mengalihkan ke halaman detail...')
            setTitle('')
            setReward(0)
            setTotal(0)

            setTimeout(() => {
                router.push(`/my-surveys/${data.survey_id}`)
            }, 1500)
        } catch (err: any) {
            setIsError(true)
            setMessage(err.message || 'Terjadi kesalahan. Coba lagi.')
        }

        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href="/"
                        className="text-blue-600 hover:underline text-sm font-medium"
                    >
                        ← Kembali ke Home
                    </Link>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Buat Survey Baru</h1>
                    <p className="text-gray-500 text-sm mb-8">
                        Isi detail survey dan tentukan reward untuk setiap responden.
                    </p>

                    {/* Form */}
                    <div className="space-y-5" suppressHydrationWarning>
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Judul Survey <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="Contoh: Survey Kepuasan Pelanggan 2025"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Deskripsi Survey <span className="text-gray-400 font-normal">(Opsional)</span>
                            </label>
                            <textarea
                                placeholder="Jelaskan secara singkat tujuan dari survey ini..."
                                rows={3}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition resize-none"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        {/* Reward */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Reward per Response (Rp) <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">Rp</span>
                                <input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    value={reward === 0 ? '' : reward}
                                    onChange={(e) => setReward(Number(e.target.value))}
                                />
                            </div>
                             {rewardHint && (
                                <div className="mt-2 space-y-1.5">
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        Minimum reward:{' '}
                                        <span className="font-semibold text-gray-800">
                                            Rp {rewardHint.min_required.toLocaleString('id-ID')}
                                        </span>
                                        {' '}· Estimasi awal:{' '}
                                        <span className="font-semibold text-amber-800">
                                            Rp {rewardHint.recommended.toLocaleString('id-ID')}
                                        </span>
                                    </p>
                                    <p className="text-[11px] text-gray-400">
                                        Setelah kamu menambah pertanyaan, minimum wajib naik.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setReward(rewardHint.recommended)}
                                        className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg hover:bg-amber-100 transition-colors"
                                    >
                                        ✨ Gunakan estimasi awal (Rp {rewardHint.recommended.toLocaleString('id-ID')})
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Total Responses */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Target Jumlah Responden <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                value={total === 0 ? '' : total}
                                onChange={(e) => setTotal(Number(e.target.value))}
                            />
                        </div>

                        {/* ============================= */}
                        {/* MODE PICKER                   */}
                        {/* ============================= */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Mode Pengumpulan Responden <span className="text-red-500">*</span>
                            </label>
                            <p className="text-xs text-gray-400 mb-3">
                                Tentukan bagaimana budget kamu digunakan jika ada responden kualitas rendah.
                            </p>

                            <div className="grid grid-cols-1 gap-3">
                                {/* Opsi 1: Fixed */}
                                <button
                                    type="button"
                                    onClick={() => setResponseMode('fixed')}
                                    className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                                        responseMode === 'fixed'
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                                >
                                    {responseMode === 'fixed' && (
                                        <span className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </span>
                                    )}
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl mt-0.5">🔒</span>
                                        <div>
                                            <p className={`font-semibold text-sm ${responseMode === 'fixed' ? 'text-blue-800' : 'text-gray-800'}`}>
                                                Jumlah Respon Tetap
                                            </p>
                                            <p className={`text-xs mt-1 leading-relaxed ${responseMode === 'fixed' ? 'text-blue-600' : 'text-gray-500'}`}>
                                                Kamu akan mendapat maksimal{' '}
                                                <span className="font-semibold">{total > 0 ? total : 'X'} responden</span>.
                                                Sisa budget akan dikembalikan jika ada respon kualitas rendah.
                                            </p>
                                        </div>
                                    </div>
                                </button>

                                {/* Opsi 2: Extended */}
                                <button
                                    type="button"
                                    onClick={() => setResponseMode('extended')}
                                    className={`relative text-left p-4 rounded-xl border-2 transition-all ${
                                        responseMode === 'extended'
                                            ? 'border-purple-500 bg-purple-50'
                                            : 'border-gray-200 hover:border-gray-300 bg-white'
                                    }`}
                                >
                                    {responseMode === 'extended' && (
                                        <span className="absolute top-3 right-3 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </span>
                                    )}
                                    <div className="flex items-start gap-3">
                                        <span className="text-xl mt-0.5">🚀</span>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className={`font-semibold text-sm ${responseMode === 'extended' ? 'text-purple-800' : 'text-gray-800'}`}>
                                                    Maksimalkan Jumlah Respon
                                                </p>
                                                <span className="text-xs font-medium px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded">
                                                    Direkomendasikan
                                                </span>
                                            </div>
                                            <p className={`text-xs mt-1 leading-relaxed ${responseMode === 'extended' ? 'text-purple-600' : 'text-gray-500'}`}>
                                                Budget digunakan untuk mendapat respon sebanyak mungkin.
                                                Respon kualitas rendah diganti dengan responden tambahan secara otomatis.
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Total Budget Info */}
                        <div className={`border rounded-lg p-4 ${responseMode === 'extended' ? 'bg-purple-50 border-purple-100' : 'bg-blue-50 border-blue-100'}`}>
                            <p className={`text-sm font-medium ${responseMode === 'extended' ? 'text-purple-700' : 'text-blue-700'}`}>
                                Total Budget yang Dibutuhkan
                            </p>
                            <p className={`text-2xl font-bold mt-1 ${responseMode === 'extended' ? 'text-purple-800' : 'text-blue-800'}`}>
                                {new Intl.NumberFormat('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    minimumFractionDigits: 0
                                }).format(totalBudget)}
                            </p>
                            <p className={`text-xs mt-1 ${responseMode === 'extended' ? 'text-purple-600' : 'text-blue-600'}`}>
                                {reward > 0 && total > 0
                                    ? `Rp${reward.toLocaleString('id-ID')} × ${total} responden${responseMode === 'extended' ? ' (bisa bertambah otomatis)' : ''}`
                                    : 'Isi reward dan jumlah responden untuk melihat total'}
                            </p>
                        </div>

                        {/* Smart Budget Suggestion */}
                        {budgetSuggestion && (
                            <div className={`rounded-xl border p-4 ${
                                budgetSuggestion.sufficient
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-red-50 border-red-200'
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                                            budgetSuggestion.sufficient ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                            {budgetSuggestion.sufficient ? '✅ Budget Mencukupi' : '⚠️ Budget Tidak Cukup'}
                                        </p>

                                        {budgetSuggestion.sufficient ? (
                                            <p className="text-sm text-green-800">
                                                Saldo kamu{' '}
                                                <span className="font-bold">
                                                    Rp {walletBalance!.toLocaleString('id-ID')}
                                                </span>{' '}
                                                cukup untuk survey ini.{' '}
                                                {walletBalance! - budgetSuggestion.requiredBudget > 0 && (
                                                    <span className="text-green-600">
                                                        Sisa saldo: Rp {(walletBalance! - budgetSuggestion.requiredBudget).toLocaleString('id-ID')}.
                                                    </span>
                                                )}
                                            </p>
                                        ) : (
                                            <div className="space-y-1.5">
                                                <p className="text-sm text-red-800">
                                                    Saldo kamu{' '}
                                                    <span className="font-bold">
                                                        Rp {walletBalance!.toLocaleString('id-ID')}
                                                    </span>
                                                    {' '}— kurang{' '}
                                                    <span className="font-bold">
                                                        Rp {budgetSuggestion.gap.toLocaleString('id-ID')}
                                                    </span>{' '}
                                                    dari yang dibutuhkan.
                                                </p>
                                                <p className="text-xs text-red-700">
                                                    💡 Dengan saldo saat ini, kamu hanya bisa menjangkau{' '}
                                                    <strong>{budgetSuggestion.affordable} responden</strong>{' '}
                                                    (bukan {total}).
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => setTotal(budgetSuggestion.affordable)}
                                                    disabled={budgetSuggestion.affordable <= 0}
                                                    className="mt-1 text-xs font-semibold text-red-700 bg-red-100 border border-red-300 px-3 py-1 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-40"
                                                >
                                                    Sesuaikan target ke {budgetSuggestion.affordable} responden
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[10px] text-gray-500 mb-0.5">Saldo kamu</p>
                                        <p className={`text-sm font-bold ${
                                            budgetSuggestion.sufficient ? 'text-green-700' : 'text-red-700'
                                        }`}>
                                            Rp {walletBalance!.toLocaleString('id-ID')}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}


                        {estimation && (
                            <div className="border border-gray-200 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-white shadow-sm">
                                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <span>📊</span> Estimasi Hasil Survey
                                </h3>

                                <div className="space-y-4">
                                    {/* Confidence Indicator */}
                                    <div className={`p-4 rounded-xl border ${
                                        estimation.confidence_color === 'green' ? 'bg-green-50 border-green-200' :
                                        estimation.confidence_color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                                        'bg-red-50 border-red-200'
                                    }`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-gray-800">Confidence Score</span>
                                            <span className={`text-xl font-extrabold ${
                                                estimation.confidence_color === 'green' ? 'text-green-700' :
                                                estimation.confidence_color === 'yellow' ? 'text-yellow-700' :
                                                'text-red-700'
                                            }`}>
                                                {estimation.confidence_score}%
                                            </span>
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <p className="font-medium text-gray-700 flex items-center gap-1.5">
                                                {estimation.confidence_color === 'green' ? '🟢' : estimation.confidence_color === 'yellow' ? '🟡' : '🔴'} Kemungkinan:
                                            </p>
                                            <ul className="list-disc pl-6 text-gray-600 text-xs">
                                                <li>Selesai {estimation.speed === 'cepat' ? 'sangat cepat' : estimation.speed === 'sedang' ? 'dalam waktu wajar' : 'sangat lambat'}</li>
                                                <li>Kualitas response {estimation.quality}</li>
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Completion Rate */}
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                                                ✅ Completion Rate
                                            </span>
                                            <span className={`text-sm font-bold ${
                                                estimation.completion_rate >= 0.8 ? 'text-green-600' :
                                                estimation.completion_rate >= 0.6 ? 'text-yellow-600' : 'text-red-600'
                                            }`}>
                                                {Math.round(estimation.completion_rate * 100)}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ease-out ${
                                                    estimation.completion_rate >= 0.8 ? 'bg-green-500' :
                                                    estimation.completion_rate >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                                                }`}
                                                style={{ width: `${Math.round(estimation.completion_rate * 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        {/* Quality */}
                                        <div className={`p-3 rounded-lg border ${
                                            estimation.quality_color === 'green' ? 'bg-green-50 border-green-200' :
                                            estimation.quality_color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                                            'bg-red-50 border-red-200'
                                        }`}>
                                            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                                                estimation.quality_color === 'green' ? 'text-green-600' :
                                                estimation.quality_color === 'yellow' ? 'text-yellow-600' :
                                                'text-red-600'
                                            }`}>⚡ Kualitas</p>
                                            <p className={`text-lg font-bold capitalize ${
                                                estimation.quality_color === 'green' ? 'text-green-800' :
                                                estimation.quality_color === 'yellow' ? 'text-yellow-800' :
                                                'text-red-800'
                                            }`}>{estimation.quality}</p>
                                        </div>

                                        {/* Speed */}
                                        <div className={`p-3 rounded-lg border ${
                                            estimation.speed_color === 'green' ? 'bg-green-50 border-green-200' :
                                            estimation.speed_color === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                                            'bg-red-50 border-red-200'
                                        }`}>
                                            <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                                                estimation.speed_color === 'green' ? 'text-green-600' :
                                                estimation.speed_color === 'yellow' ? 'text-yellow-600' :
                                                'text-red-600'
                                            }`}>⏳ Waktu</p>
                                            <p className={`text-lg font-bold capitalize ${
                                                estimation.speed_color === 'green' ? 'text-green-800' :
                                                estimation.speed_color === 'yellow' ? 'text-yellow-800' :
                                                'text-red-800'
                                            }`}>{estimation.speed}</p>
                                        </div>
                                    </div>

                                    {/* Recommendation hint */}
                                    {estimation.ratio < 1.0 && rewardHint && (
                                        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                            <span className="text-amber-500 shrink-0 mt-0.5">💡</span>
                                            <p className="text-xs text-amber-800 leading-relaxed">
                                                Tingkatkan reward ke <strong>Rp {rewardHint.recommended.toLocaleString('id-ID')}</strong> untuk estimasi kualitas <strong>bagus</strong> dan completion rate <strong>80%</strong>.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all duration-200 ${
                                loading
                                    ? 'bg-blue-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md hover:shadow-lg'
                            }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Membuat Survey...
                                </span>
                            ) : (
                                'Buat Survey'
                            )}
                        </button>

                        {/* Soft Warning Banner */}
                        {rewardWarning && (
                            <div className="rounded-lg px-4 py-3 text-sm font-medium bg-amber-50 text-amber-900 border border-amber-200 flex gap-2">
                                <span className="shrink-0">⚠️</span>
                                <div>
                                    <p className="font-semibold">Insight Reward</p>
                                    <p className="mt-0.5 font-normal">{rewardWarning}</p>
                                </div>
                            </div>
                        )}

                        {/* Feedback Message */}
                        {message && (
                            <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
                                isError
                                    ? 'bg-red-50 text-red-700 border border-red-100'
                                    : 'bg-green-50 text-green-700 border border-green-100'
                            }`}>
                                {message}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}