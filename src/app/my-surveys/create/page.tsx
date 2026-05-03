'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSurvey } from '@/services/survey.service'

export default function CreateSurvey() {
    const router = useRouter()

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [reward, setReward] = useState(0)
    const [total, setTotal] = useState(0)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [isError, setIsError] = useState(false)

    const totalBudget = reward * total

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
                total_responses: total
            })

            setIsError(false)
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
                    <div className="space-y-5">
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

                        {/* Total Budget Info */}
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                            <p className="text-sm text-blue-700 font-medium">Total Budget yang Dibutuhkan</p>
                            <p className="text-2xl font-bold text-blue-800 mt-1">
                                {new Intl.NumberFormat('id-ID', {
                                    style: 'currency',
                                    currency: 'IDR',
                                    minimumFractionDigits: 0
                                }).format(totalBudget)}
                            </p>
                            <p className="text-xs text-blue-600 mt-1">
                                {reward > 0 && total > 0
                                    ? `Rp${reward.toLocaleString('id-ID')} × ${total} responden`
                                    : 'Isi reward dan jumlah responden untuk melihat total'}
                            </p>
                        </div>

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