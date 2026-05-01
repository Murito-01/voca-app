'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getMySurveys, getSurveyQuestions } from '@/services/survey.service'
import QuestionItem from '@/components/creator/QuestionItem'
import { Question } from '@/types/survey.types'

export default function SurveyDetailPage() {
    const params = useParams()
    const surveyId = params.id as string

    const [survey, setSurvey] = useState<any>(null)
    const [questions, setQuestions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchSurvey = async () => {
            try {
                const json = await getMySurveys()
                const found = json.data.find((s: any) => s.id === surveyId)

                if (!found) {
                    setError('Survey tidak ditemukan')
                } else {
                    setSurvey(found)
                    
                    // Fetch questions
                    try {
                        const qJson = await getSurveyQuestions(surveyId)
                        setQuestions(qJson.data || [])
                    } catch (qErr) {
                        console.error('Failed to fetch questions:', qErr)
                    }
                }
            } catch (err: any) {
                setError(err.message || 'Terjadi kesalahan')
            } finally {
                setLoading(false)
            }
        }

        fetchSurvey()
    }, [surveyId])

    return (
        <div className="min-h-screen bg-gray-100 p-6">
            <div className="max-w-2xl mx-auto">

                {/* Back */}
                <Link
                    href="/my-surveys"
                    className="text-blue-600 text-sm hover:underline"
                >
                    ← Kembali ke My Surveys
                </Link>

                {/* Loading */}
                {loading && (
                    <div className="flex justify-center items-center h-40">
                        <div className="animate-spin h-10 w-10 border-b-2 border-blue-600 rounded-full"></div>
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-lg mt-4">
                        {error}
                    </div>
                )}

                {/* Content */}
                {!loading && survey && (
                    <div className="bg-white mt-6 p-6 rounded-xl border shadow-sm">

                        {/* Title */}
                        <h1 className="text-2xl font-bold text-gray-900">
                            {survey.title}
                        </h1>

                        {/* Status */}
                        <span className={`inline-block mt-2 px-3 py-1 text-xs rounded-full ${survey.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                            }`}>
                            {survey.status}
                        </span>

                        {/* Stats */}
                        <div className="mt-6 space-y-2 text-sm text-gray-700">
                            <p>
                                Reward / Response:{' '}
                                <span className="font-semibold text-blue-600">
                                    {new Intl.NumberFormat('id-ID', {
                                        style: 'currency',
                                        currency: 'IDR',
                                        minimumFractionDigits: 0
                                    }).format(survey.reward_per_response)}
                                </span>
                            </p>

                            <p>
                                Total Responses:{' '}
                                <span className="font-semibold">
                                    {survey.total_responses}
                                </span>
                            </p>

                            <p>
                                Remaining:{' '}
                                <span className="font-semibold">
                                    {survey.remaining_responses}
                                </span>
                            </p>
                        </div>

                        {/* Progress */}
                        <div className="mt-6">
                            <div className="flex justify-between text-sm mb-1">
                                <span>Progress</span>
                                <span>
                                    {survey.total_responses - survey.remaining_responses} / {survey.total_responses}
                                </span>
                            </div>

                            <div className="w-full bg-gray-200 h-2 rounded-full">
                                <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{
                                        width: `${survey.total_responses > 0
                                            ? ((survey.total_responses - survey.remaining_responses) /
                                                survey.total_responses) *
                                            100
                                            : 0
                                            }%`
                                    }}
                                />
                            </div>
                        </div>

                        {/* Questions Section */}
                        <div className="mt-8 border-t pt-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">
                                    Pertanyaan Survey
                                </h2>
                                <Link
                                    href={`/my-surveys/${surveyId}/add-question`}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                                >
                                    + Tambah Pertanyaan
                                </Link>
                            </div>

                            {questions.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                    Belum ada pertanyaan.
                                </p>
                            ) : (
                                <div className="space-y-4">
                                    {questions.map((q: Question, i: number) => (
                                        <QuestionItem key={q.id} question={q} index={i} />
                                    ))}
                                </div>
                            )}
                        </div>

                    </div>
                )}
            </div>
        </div>
    )
}