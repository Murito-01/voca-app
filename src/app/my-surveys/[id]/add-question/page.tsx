'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createSurveyQuestion } from '@/services/survey.service'

export default function AddQuestionPage() {
    const params = useParams()
    const router = useRouter()
    const surveyId = params.id as string

    const [questionText, setQuestionText] = useState('')
    const [questionType, setQuestionType] = useState('text')
    const [options, setOptions] = useState<string[]>(['', ''])

    const [isAttentionCheck, setIsAttentionCheck] = useState(false)
    const [correctOptionIndex, setCorrectOptionIndex] = useState<number>(0)

    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isOptionType = questionType === 'radio' || questionType === 'checkbox'

    const handleAddOption = () => {
        setOptions([...options, ''])
    }

    const handleRemoveOption = (index: number) => {
        const newOptions = options.filter((_, i) => i !== index)
        setOptions(newOptions)
    }

    const handleOptionChange = (index: number, value: string) => {
        const newOptions = [...options]
        newOptions[index] = value
        setOptions(newOptions)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (!questionText.trim()) {
            setError('Teks pertanyaan tidak boleh kosong')
            return
        }

        if (isOptionType) {
            const validOptions = options.filter(o => o.trim() !== '')
            if (validOptions.length < 2) {
                setError('Pilihan ganda/checkbox minimal harus memiliki 2 opsi')
                return
            }
        }

        setLoading(true)

        try {
            const payload: any = {
                question_text: questionText,
                question_type: questionType,
                options: isOptionType ? options.filter(o => o.trim() !== '') : []
            }

            if (isAttentionCheck) {
                payload.is_attention_check = true;
                // Hitung ulang index karena opsi kosong difilter
                const validOptions = options.filter(o => o.trim() !== '');
                const originalCorrectValue = options[correctOptionIndex];
                const newCorrectIndex = validOptions.findIndex(o => o === originalCorrectValue);
                payload.correct_option_index = newCorrectIndex >= 0 ? newCorrectIndex : 0;
            }

            await createSurveyQuestion(surveyId, payload)

            // Success, redirect back
            router.push(`/my-surveys/${surveyId}`)
            router.refresh()
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat menyimpan data')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-2xl mx-auto">
                {/* Back Link */}
                <Link
                    href={`/my-surveys/${surveyId}`}
                    className="text-blue-600 text-sm hover:underline mb-4 inline-block"
                >
                    ← Kembali ke Detail Survey
                </Link>

                <div className="bg-white p-6 rounded-xl border shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">Tambah Pertanyaan</h1>
                        
                        <div className="flex gap-2">
                            {isAttentionCheck ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAttentionCheck(false)
                                        setQuestionText('')
                                        setOptions(['', ''])
                                        setQuestionType('text')
                                    }}
                                    className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium rounded-md border border-gray-200 transition-colors"
                                >
                                    🔄 Reset (Gunakan Pertanyaan Biasa)
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setQuestionType('radio')
                                            setQuestionText("Untuk memastikan kualitas, mohon pilih opsi 'Sangat Setuju' pada pertanyaan ini.")
                                            setOptions(["Sangat Setuju", "Setuju", "Tidak Setuju"])
                                            setIsAttentionCheck(true)
                                            setCorrectOptionIndex(0)
                                        }}
                                        className="text-xs px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 font-medium rounded-md border border-red-200 transition-colors flex items-center gap-1"
                                    >
                                        ⚠️ Template Radio Jebakan
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setQuestionType('checkbox')
                                            setQuestionText("Untuk membuktikan Anda bukan bot, pilih kotak 'Warna Merah' saja.")
                                            setOptions(["Warna Merah", "Warna Biru", "Warna Hijau"])
                                            setIsAttentionCheck(true)
                                            setCorrectOptionIndex(0)
                                        }}
                                        className="text-xs px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 font-medium rounded-md border border-red-200 transition-colors flex items-center gap-1"
                                    >
                                        ⚠️ Template Checkbox Jebakan
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-lg mb-6 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Question Text */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Pertanyaan
                            </label>
                            <textarea
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder-gray-400 ${isAttentionCheck ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                                rows={3}
                                placeholder="Tuliskan pertanyaanmu di sini..."
                                required
                                disabled={isAttentionCheck}
                            />
                        </div>

                        {/* Question Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipe Jawaban
                            </label>
                            <select
                                value={questionType}
                                onChange={(e) => setQuestionType(e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 ${isAttentionCheck ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                                disabled={isAttentionCheck}
                            >
                                <option value="text">Teks Pendek (Jawaban Singkat)</option>
                                <option value="radio">Pilihan Ganda (Satu Jawaban)</option>
                                <option value="checkbox">Kotak Centang (Banyak Jawaban)</option>
                            </select>
                        </div>

                        {/* Options Builder */}
                        {isOptionType && (
                            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                                <label className="block text-sm font-medium text-gray-700">
                                    Opsi Jawaban
                                </label>

                                {options.map((opt, index) => (
                                    <div key={index} className="flex gap-2 items-center">
                                        <div className="shrink-0 text-gray-400">
                                            {questionType === 'radio' ? '○' : '□'}
                                        </div>
                                        <input
                                            type="text"
                                            value={opt}
                                            onChange={(e) => handleOptionChange(index, e.target.value)}
                                            className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm ${isAttentionCheck ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                                            placeholder={`Opsi ${index + 1}`}
                                            required
                                            disabled={isAttentionCheck}
                                        />
                                        {!isAttentionCheck && options.length > 2 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOption(index)}
                                                className="text-red-400 hover:text-red-600 p-1"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {!isAttentionCheck && (
                                    <button
                                        type="button"
                                        onClick={handleAddOption}
                                        className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                                    >
                                        <span>+</span> Tambah Opsi
                                    </button>
                                )}

                                {isAttentionCheck && (
                                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-sm text-red-800 font-medium mb-2 flex items-center gap-1">
                                            ⚠️ Pilih Kunci Jawaban Validasi:
                                        </p>
                                        <div className="space-y-2">
                                            {options.map((opt, index) => (
                                                <label key={index} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="correctOption"
                                                        checked={correctOptionIndex === index}
                                                        onChange={() => setCorrectOptionIndex(index)}
                                                        className="w-4 h-4 text-red-600 focus:ring-red-500"
                                                    />
                                                    <span className={`text-sm ${correctOptionIndex === index ? 'font-semibold text-red-700' : 'text-gray-700'}`}>
                                                        {opt || `Opsi ${index + 1}`}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-4 border-t">
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full py-3 rounded-lg text-white font-medium transition-colors ${loading
                                        ? 'bg-blue-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                            >
                                {loading ? 'Menyimpan...' : 'Simpan Pertanyaan'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
