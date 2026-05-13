'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMySurveys, getSurveyQuestions, getSurveyRewardValidation, getSurveyInsight } from '@/services/survey.service'
import QuestionItem from '@/components/creator/QuestionItem'
import { Question } from '@/types/survey.types'

export default function SurveyDetailPage() {
    const params = useParams()
    const router = useRouter()
    const surveyId = params.id as string

    const [survey, setSurvey] = useState<any>(null)
    const [questions, setQuestions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isPublishing, setIsPublishing] = useState(false)
    const [isEditingInfo, setIsEditingInfo] = useState(false)
    const [editTitle, setEditTitle] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [isSavingInfo, setIsSavingInfo] = useState(false)
    const [isEditingReward, setIsEditingReward] = useState(false)
    const [editReward, setEditReward] = useState<number | ''>('')
    const [isSavingReward, setIsSavingReward] = useState(false)
    const [isChangingStatus, setIsChangingStatus] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showPublishModal, setShowPublishModal] = useState(false)
    const [showCloseModal, setShowCloseModal] = useState(false)
    const [publishSuccessWarning, setPublishSuccessWarning] = useState<string | null>(null)
    const [rewardEval, setRewardEval] = useState<{
        hardOk: boolean
        softOk: boolean
        minRequired: number
        recommended: number
        rewardPerResponse: number
        questionCount: number
        estimatedMinutesTotal: number
        hardMessage?: string
        softWarning?: string
    } | null>(null)
    const [insightData, setInsightData] = useState<any>(null)

    useEffect(() => {
        const fetchSurvey = async () => {
            try {
                const json = await getMySurveys()
                const found = json.data.find((s: any) => s.id === surveyId)

                if (!found) {
                    setError('Survey tidak ditemukan')
                } else {
                    setSurvey(found)
                    setEditTitle(found.title || '')
                    setEditDescription(found.description || '')

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

    useEffect(() => {
        if (!surveyId || survey?.status !== 'draft') {
            setRewardEval(null)
            return
        }
        let cancelled = false
        ;(async () => {
            try {
                const json = await getSurveyRewardValidation(surveyId)
                if (!cancelled && json.data) {
                    setRewardEval({
                        hardOk: json.data.hardOk,
                        softOk: json.data.softOk,
                        minRequired: json.data.minRequired,
                        recommended: json.data.recommended,
                        rewardPerResponse: json.data.rewardPerResponse,
                        questionCount: json.data.questionCount,
                        estimatedMinutesTotal: json.data.estimatedMinutesTotal,
                        hardMessage: json.data.hardMessage,
                        softWarning: json.data.softWarning,
                    })
                }
            } catch {
                if (!cancelled) setRewardEval(null)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [surveyId, survey?.status, survey?.reward_per_response, questions.length])

    useEffect(() => {
        if (!surveyId || survey?.status !== 'completed') {
            setInsightData(null)
            return
        }
        let cancelled = false
        ;(async () => {
            try {
                const json = await getSurveyInsight(surveyId)
                if (!cancelled && json.data) {
                    setInsightData(json.data)
                }
            } catch {
                if (!cancelled) setInsightData(null)
            }
        })()
        return () => { cancelled = true }
    }, [surveyId, survey?.status])

    const handleDeleteQuestion = async (questionId: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus pertanyaan ini?')) return;

        try {
            const { deleteSurveyQuestion } = await import('@/services/survey.service');
            await deleteSurveyQuestion(surveyId, questionId);

            setQuestions(prev => prev.filter(q => q.id !== questionId));
        } catch (err: any) {
            alert(err.message || 'Gagal menghapus pertanyaan');
        }
    }

    const handleEditQuestion = (questionId: string) => {
        router.push(`/my-surveys/${surveyId}/edit-question/${questionId}`);
    }

    const handlePublish = () => {
        setShowPublishModal(true)
    }

    const handleConfirmPublish = async () => {
        setShowPublishModal(false)
        setIsPublishing(true)
        try {
            const { publishSurvey } = await import('@/services/survey.service')
            const result = await publishSurvey(surveyId)
            setSurvey({ ...survey, status: 'active' })
            if (result?.reward_warning) {
                setPublishSuccessWarning(result.reward_warning)
            }
        } catch (err: any) {
            alert(err.message || 'Gagal mem-publish survey')
        } finally {
            setIsPublishing(false)
        }
    }

    const publishBlockedByReward = Boolean(rewardEval && !rewardEval.hardOk)

    const handleStatusChange = async (newStatus: 'paused' | 'active' | 'completed') => {
        if (newStatus === 'completed') {
            setShowCloseModal(true);
            return;
        }

        let confirmMsg = '';
        if (newStatus === 'paused') confirmMsg = 'Apakah Anda yakin ingin menjeda (pause) survey ini? Responden tidak akan bisa melihat survey ini sementara waktu.';
        if (newStatus === 'active') confirmMsg = 'Apakah Anda yakin ingin mengaktifkan kembali survey ini?';

        if (!confirm(confirmMsg)) return;

        setIsChangingStatus(true);
        try {
            const { updateSurveyStatus } = await import('@/services/survey.service');
            await updateSurveyStatus(surveyId, newStatus);
            setSurvey({ ...survey, status: newStatus });
        } catch (err: any) {
            alert(err.message || 'Gagal mengubah status survey');
        } finally {
            setIsChangingStatus(false);
        }
    }

    const handleConfirmClose = async () => {
        setShowCloseModal(false);
        setIsChangingStatus(true);
        try {
            const { updateSurveyStatus } = await import('@/services/survey.service');
            await updateSurveyStatus(surveyId, 'completed');
            setSurvey({ ...survey, status: 'completed' });
        } catch (err: any) {
            alert(err.message || 'Gagal menutup survey');
        } finally {
            setIsChangingStatus(false);
        }
    }

    const handleSaveInfo = async () => {
        if (!editTitle.trim()) {
            alert('Judul tidak boleh kosong');
            return;
        }

        setIsSavingInfo(true);
        try {
            const { updateSurveyDetails } = await import('@/services/survey.service');
            await updateSurveyDetails(surveyId, { title: editTitle, description: editDescription });
            setSurvey({ ...survey, title: editTitle, description: editDescription });
            setIsEditingInfo(false);
        } catch (err: any) {
            alert(err.message || 'Gagal menyimpan perubahan');
        } finally {
            setIsSavingInfo(false);
        }
    }

    const handleSaveReward = async () => {
        const rewardValue = Number(editReward);
        if (isNaN(rewardValue) || rewardValue <= 0) {
            alert('Reward harus berupa angka lebih dari 0');
            return;
        }

        setIsSavingReward(true);
        try {
            const { updateSurveyDetails } = await import('@/services/survey.service');
            await updateSurveyDetails(surveyId, { reward_per_response: rewardValue });
            setSurvey({ ...survey, reward_per_response: rewardValue });
            setIsEditingReward(false);
        } catch (err: any) {
            alert(err.message || 'Gagal menyimpan reward');
        } finally {
            setIsSavingReward(false);
        }
    }

    const handleDeleteSurvey = async () => {
        if (!confirm('Apakah Anda yakin ingin MENGHAPUS survey ini secara permanen? Tindakan ini tidak bisa dibatalkan.')) return;

        setIsDeleting(true);
        try {
            const { deleteSurvey } = await import('@/services/survey.service');
            await deleteSurvey(surveyId);
            router.push('/my-surveys');
            router.refresh();
        } catch (err: any) {
            alert(err.message || 'Gagal menghapus survey');
            setIsDeleting(false);
        }
    }

    return (
        <>
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

                            {/* Title & Publish Button */}
                            <div className="flex justify-between items-start">
                                {isEditingInfo ? (
                                    <div className="flex-1 mr-4">
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="w-full text-2xl font-bold text-gray-900 border-b-2 border-blue-500 focus:outline-none mb-2 bg-gray-50 px-2 py-1 rounded-t-md"
                                            placeholder="Judul Survey"
                                        />
                                        <textarea
                                            value={editDescription}
                                            onChange={(e) => setEditDescription(e.target.value)}
                                            className="w-full text-gray-600 border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none text-sm resize-none"
                                            placeholder="Deskripsi Survey (Opsional)"
                                            rows={3}
                                        />
                                        <div className="mt-2 flex gap-2">
                                            <button
                                                onClick={handleSaveInfo}
                                                disabled={isSavingInfo}
                                                className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:bg-blue-400"
                                            >
                                                {isSavingInfo ? 'Menyimpan...' : 'Simpan'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsEditingInfo(false);
                                                    setEditTitle(survey.title || '');
                                                    setEditDescription(survey.description || '');
                                                }}
                                                disabled={isSavingInfo}
                                                className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 disabled:bg-gray-100"
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex-1 mr-4 group">
                                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                            {survey.title}
                                            {survey.status === 'draft' && (
                                                <button
                                                    onClick={() => setIsEditingInfo(true)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-opacity rounded-md hover:bg-blue-50"
                                                    title="Edit Judul & Deskripsi"
                                                >
                                                    ✏️
                                                </button>
                                            )}
                                        </h1>
                                        {survey.description && (
                                            <p className="mt-2 text-gray-600 text-sm whitespace-pre-wrap">
                                                {survey.description}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {survey.status === 'draft' && !isEditingInfo && (
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={handlePublish}
                                            disabled={isPublishing || questions.length === 0 || publishBlockedByReward}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${isPublishing || questions.length === 0 || publishBlockedByReward
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-green-600 hover:bg-green-700'
                                                }`}
                                        >
                                            {isPublishing ? 'Publishing...' : '🚀 Publish Survey'}
                                        </button>
                                        <button
                                            onClick={handleDeleteSurvey}
                                            disabled={isDeleting}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium text-red-600 border border-red-300 transition-colors ${isDeleting
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'hover:bg-red-50'
                                                }`}
                                        >
                                            {isDeleting ? 'Menghapus...' : '🗑️ Hapus Survey'}
                                        </button>
                                    </div>
                                )}

                                {survey.status === 'active' && !isEditingInfo && (
                                    <button
                                        onClick={() => handleStatusChange('paused')}
                                        disabled={isChangingStatus}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors shrink-0 ${isChangingStatus ? 'bg-gray-400 cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600'
                                            }`}
                                    >
                                        {isChangingStatus ? 'Processing...' : '⏸️ Pause Survey'}
                                    </button>
                                )}

                                {survey.status === 'paused' && !isEditingInfo && (
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => handleStatusChange('active')}
                                            disabled={isChangingStatus}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${isChangingStatus ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                                }`}
                                        >
                                            {isChangingStatus ? 'Processing...' : '▶️ Resume Survey'}
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange('completed')}
                                            disabled={isChangingStatus}
                                            className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${isChangingStatus ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
                                                }`}
                                        >
                                            {isChangingStatus ? 'Processing...' : '🛑 Tutup Survey'}
                                        </button>
                                    </div>
                                )}

                            </div>

                            {/* Status + Mode Badge */}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                                <span className={`inline-block px-3 py-1 text-xs rounded-full ${survey.status === 'active' ? 'bg-green-100 text-green-700' :
                                    survey.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                        survey.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-600'
                                    }`}>
                                    {survey.status === 'active' ? 'Active' :
                                        survey.status === 'paused' ? 'Paused' :
                                            survey.status === 'completed' ? 'Completed' : 'Draft'}
                                </span>
                                <span className={`inline-block px-3 py-1 text-xs rounded-full font-medium ${survey.allow_extended_responses
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-slate-100 text-slate-600'
                                    }`} title={survey.allow_extended_responses ? 'Budget dipakai untuk mendapat respon sebanyak mungkin.' : 'Jumlah responden tetap, sisa budget dikembalikan.'}>
                                    {survey.allow_extended_responses ? '🚀 Maksimalkan Respon' : '🔒 Jumlah Tetap'}
                                </span>
                            </div>

                            {survey.status === 'draft' && rewardEval && !rewardEval.hardOk && rewardEval.hardMessage && (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                                    <p className="font-semibold flex items-center gap-2">
                                        <span>🔒</span> Reward terlalu rendah
                                    </p>
                                    <p className="mt-1 text-red-700">{rewardEval.hardMessage}</p>
                                    <div className="mt-3">
                                        <button 
                                            onClick={() => {
                                                setEditReward(rewardEval.recommended);
                                                setIsEditingReward(true);
                                                window.scrollTo({ top: document.getElementById('reward-section')?.offsetTop, behavior: 'smooth' });
                                            }}
                                            className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-lg transition-colors border border-red-300"
                                        >
                                            ✨ Update Reward ke Rp {rewardEval.recommended.toLocaleString('id-ID')}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {survey.status === 'draft' && rewardEval && rewardEval.hardOk && rewardEval.softWarning && (
                                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                                    <p className="font-semibold flex items-center gap-2">
                                        <span>⚠️</span> Insight reward
                                    </p>
                                    <p className="mt-1 text-amber-800">{rewardEval.softWarning}</p>
                                    <p className="mt-1 text-xs text-amber-700">
                                        Minimum wajib: Rp {rewardEval.minRequired.toLocaleString('id-ID')} · Rekomendasi: Rp{' '}
                                        {rewardEval.recommended.toLocaleString('id-ID')} ({rewardEval.questionCount}{' '}
                                        pertanyaan, ~{Math.ceil(rewardEval.estimatedMinutesTotal)} menit estimasi mengisi).
                                    </p>
                                </div>
                            )}

                            {/* Banner reward warning setelah publish berhasil */}
                            {survey.status === 'active' && publishSuccessWarning && (
                                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex gap-2">
                                    <span className="shrink-0 mt-0.5">⚠️</span>
                                    <div>
                                        <p className="font-semibold">Insight Reward</p>
                                        <p className="mt-0.5">{publishSuccessWarning}</p>
                                        <button
                                            onClick={() => setPublishSuccessWarning(null)}
                                            className="mt-1 text-xs text-amber-600 hover:underline"
                                        >
                                            Tutup
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Stats */}
                            <div id="reward-section" className="mt-6 space-y-2 text-sm text-gray-700">
                                <div className="flex items-center gap-2">
                                    <span>Reward / Response:</span>
                                    {isEditingReward ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min="1"
                                                value={editReward}
                                                onChange={(e) => setEditReward(e.target.value === '' ? '' : Number(e.target.value))}
                                                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            />
                                            <button
                                                onClick={handleSaveReward}
                                                disabled={isSavingReward || editReward === '' || editReward <= 0}
                                                className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:bg-gray-400"
                                            >
                                                {isSavingReward ? '⏳' : 'Simpan'}
                                            </button>
                                            <button
                                                onClick={() => setIsEditingReward(false)}
                                                disabled={isSavingReward}
                                                className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 disabled:bg-gray-100"
                                            >
                                                Batal
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group">
                                            <span className="font-semibold text-blue-600">
                                                {new Intl.NumberFormat('id-ID', {
                                                    style: 'currency',
                                                    currency: 'IDR',
                                                    minimumFractionDigits: 0
                                                }).format(survey.reward_per_response)}
                                            </span>
                                            {survey.status === 'draft' && (
                                                <button
                                                    onClick={() => {
                                                        setEditReward(survey.reward_per_response);
                                                        setIsEditingReward(true);
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-opacity rounded hover:bg-blue-50"
                                                    title="Edit Reward"
                                                >
                                                    ✏️
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

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
                                <div className="flex justify-between text-sm mb-1 text-gray-800 font-medium">
                                    <span>Progress</span>
                                    <span className="font-semibold text-gray-900">
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

                            {/* Tombol Lihat Responses */}
                            {(survey.status === 'paused' || survey.status === 'completed') && (
                                <div className="mt-6 pt-5 border-t">
                                    <Link
                                        href={`/my-surveys/${surveyId}/responses`}
                                        className="flex items-center justify-between w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">📊</span>
                                            <div>
                                                <p className="font-semibold text-blue-800 text-sm">Lihat Data Responses</p>
                                                <p className="text-xs text-blue-600">
                                                    {survey.total_responses - survey.remaining_responses} dari {survey.total_responses} responden telah mengisi
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-blue-400 group-hover:text-blue-600 transition-colors">→</span>
                                    </Link>
                                </div>
                            )}

                            {/* Post-Survey Insight */}
                            {survey.status === 'completed' && insightData && (
                                <div className="mt-6 pt-5 border-t">
                                    <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-xl p-5 shadow-sm">
                                        <h3 className="text-sm font-bold text-indigo-900 mb-3 flex items-center gap-2">
                                            <span>💡</span> Post-Survey Insight
                                        </h3>
                                        
                                        <div className="grid grid-cols-3 gap-3 mb-4">
                                            <div className="bg-white p-3 rounded-lg border border-indigo-50 text-center">
                                                <p className="text-xs text-gray-500 mb-1">Valid Rate</p>
                                                <p className={`text-lg font-bold ${insightData.rates.valid >= 0.7 ? 'text-green-600' : 'text-amber-600'}`}>
                                                    {Math.round(insightData.rates.valid * 100)}%
                                                </p>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-indigo-50 text-center">
                                                <p className="text-xs text-gray-500 mb-1">Low Quality</p>
                                                <p className={`text-lg font-bold ${insightData.rates.lowQuality > 0.3 ? 'text-red-600' : 'text-gray-700'}`}>
                                                    {Math.round(insightData.rates.lowQuality * 100)}%
                                                </p>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-indigo-50 text-center">
                                                <p className="text-xs text-gray-500 mb-1">Rejected</p>
                                                <p className={`text-lg font-bold ${insightData.rates.rejected > 0.15 ? 'text-red-600' : 'text-gray-700'}`}>
                                                    {Math.round(insightData.rates.rejected * 100)}%
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-indigo-100/50 rounded-lg p-3 text-sm text-indigo-900">
                                            <p className="font-medium mb-1">📝 Evaluasi & Saran:</p>
                                            <p className="text-indigo-800 leading-relaxed">{insightData.suggestion}</p>
                                            
                                            <div className="mt-2 text-xs text-indigo-700/80 pt-2 border-t border-indigo-200/50 flex flex-wrap gap-x-4 gap-y-1">
                                                <span>Reward: Rp {insightData.reward.toLocaleString('id-ID')}</span>
                                                <span>Recommended: Rp {insightData.recommended.toLocaleString('id-ID')}</span>
                                                <span>Total Data: {insightData.counts.total}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Questions Section */}
                            <div className="mt-8 border-t pt-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900">
                                        Pertanyaan Survey
                                    </h2>
                                    {survey.status === 'draft' && (
                                        <Link
                                            href={`/my-surveys/${surveyId}/add-question`}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                                        >
                                            + Tambah Pertanyaan
                                        </Link>
                                    )}
                                </div>

                                {questions.length === 0 ? (
                                    <p className="text-sm text-gray-500">
                                        Belum ada pertanyaan.
                                    </p>
                                ) : (
                                    <div className="space-y-4">
                                        {questions.map((q: Question, i: number) => (
                                            <QuestionItem
                                                key={q.id}
                                                question={q}
                                                index={i}
                                                onDelete={survey.status === 'draft' ? handleDeleteQuestion : undefined}
                                                onEdit={survey.status === 'draft' ? handleEditQuestion : undefined}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>
                    )}
                </div>
            </div>

            {/* ===== CLOSE SURVEY CONFIRMATION MODAL ===== */}
            {showCloseModal && survey && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowCloseModal(false)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-xl shrink-0">🛑</div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Tutup Survey Permanen</h2>
                                <p className="text-xs text-gray-500">Tindakan ini tidak bisa dibatalkan</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-5">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Judul Survey</span>
                                <span className="font-semibold text-gray-800 text-right max-w-[55%] truncate">{survey.title}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Responden Masuk</span>
                                <span className="font-semibold text-gray-800">{survey.total_responses - survey.remaining_responses} dari {survey.total_responses}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Slot Tersisa</span>
                                <span className="font-semibold text-gray-800">{survey.remaining_responses}</span>
                            </div>
                            <div className="border-t pt-3 flex justify-between items-center">
                                <span className="text-sm font-semibold text-gray-700">Estimasi Refund</span>
                                <span className="text-lg font-bold text-green-700">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(survey.remaining_responses * survey.reward_per_response)}
                                </span>
                            </div>
                        </div>

                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 flex gap-2">
                            <span className="text-red-500 text-base shrink-0 mt-0.5">⚠️</span>
                            <p className="text-xs text-red-700 leading-relaxed">
                                Setelah ditutup, survey <strong>tidak bisa diaktifkan kembali</strong>. Sisa budget yang terkunci akan otomatis dikembalikan ke saldo kamu.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCloseModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmClose}
                                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
                            >
                                🛑 Ya, Tutup Permanen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== PUBLISH CONFIRMATION MODAL ===== */}
            {showPublishModal && survey && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowPublishModal(false)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl shrink-0">🚀</div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Konfirmasi Publish Survey</h2>
                                <p className="text-xs text-gray-500">Tinjau detail sebelum melanjutkan</p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 space-y-3 mb-5">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Judul Survey</span>
                                <span className="font-semibold text-gray-800 text-right max-w-[55%] truncate">{survey.title}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Jumlah Pertanyaan</span>
                                <span className={`font-semibold ${questions.length === 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                    {questions.length} pertanyaan {questions.length === 0 && '⚠️'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Target Responden</span>
                                <span className="font-semibold text-gray-800">{survey.total_responses} orang</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Reward / Responden</span>
                                <span className="font-semibold text-blue-600">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(survey.reward_per_response)}
                                </span>
                            </div>
                            <div className="border-t pt-3 flex justify-between items-center">
                                <span className="text-sm font-semibold text-gray-700">Total Budget Dikunci</span>
                                <span className="text-lg font-bold text-green-700">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(survey.reward_per_response * survey.total_responses)}
                                </span>
                            </div>
                            {rewardEval && (
                                <>
                                    <div className="border-t pt-3 flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Minimum reward (wajib)</span>
                                        <span className="font-semibold text-gray-800">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(rewardEval.minRequired)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Rekomendasi platform</span>
                                        <span className="font-semibold text-amber-800">
                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(rewardEval.recommended)}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>

                        {rewardEval && !rewardEval.hardOk && rewardEval.hardMessage && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-5 text-xs text-red-800">
                                <p className="font-semibold">🔒 Publish diblokir</p>
                                <p className="mt-1">{rewardEval.hardMessage}</p>
                            </div>
                        )}

                        {rewardEval && rewardEval.hardOk && rewardEval.softWarning && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-900">
                                <p className="font-semibold">⚠️ Insight</p>
                                <p className="mt-1">{rewardEval.softWarning}</p>
                            </div>
                        )}

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 flex gap-2">
                            <span className="text-amber-500 text-base shrink-0 mt-0.5">⚠️</span>
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Budget akan <strong>dikunci dari saldo kamu</strong> saat publish. Setelah aktif, pertanyaan tidak bisa diubah lagi.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowPublishModal(false)}
                                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleConfirmPublish}
                                disabled={questions.length === 0 || publishBlockedByReward}
                                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${questions.length === 0 || publishBlockedByReward ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                ✅ Ya, Publish Sekarang
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}