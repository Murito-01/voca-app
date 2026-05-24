'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getMySurveys, getSurveyQuestions, getSurveyInsight, getSurveyBurnRate } from '@/services/survey.service'
import { generateSurveyInsight } from '@/lib/survey-insight'
import { getEstimationSummary } from '@/lib/survey-estimation'
import { computeRewardRecommendation, type QuestionLike } from '@/lib/reward-recommendation'
import QuestionItem from '@/components/creator/QuestionItem'
import { Question } from '@/types/survey.types'

type SurveyBurnRate = {
    completed_responses: number
    remaining_responses: number
    responses_per_minute: number
    estimated_minutes_to_finish: number | null
    has_enough_data: boolean
    locked_budget: number
    reward_per_response: number
    total_spent: number
    remaining_budget: number
    budget_used_percent: number
}

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
    const [burnRate, setBurnRate] = useState<SurveyBurnRate | null>(null)

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
        if (!survey || questions.length === 0) return

        const questionList: QuestionLike[] = questions.map((q: any) => ({
            question_type: q.question_type,
        }))

        const { min_required, recommended } = computeRewardRecommendation(
            Number(survey.total_responses) || 1,
            questionList
        )

        const currentReward = Number(survey.reward_per_response) || 0

        setRewardEval({
            hardOk: currentReward >= min_required,
            softOk: currentReward >= recommended,
            minRequired: min_required,
            recommended,
            rewardPerResponse: currentReward,
            questionCount: questions.length,
            estimatedMinutesTotal: questions.length * 1.5,
            hardMessage: currentReward < min_required
                ? `Minimum reward adalah Rp ${min_required.toLocaleString('id-ID')} untuk survey ini.`
                : undefined,
            softWarning: currentReward >= min_required && currentReward < recommended
                ? 'Reward di bawah rekomendasi platform.'
                : undefined,
        })
    }, [surveyId, survey?.status, survey?.reward_per_response, survey?.total_responses, questions])

    useEffect(() => {
        if (!surveyId || survey?.status !== 'completed') {
            setInsightData(null)
            return
        }
        let cancelled = false
            ; (async () => {
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

    useEffect(() => {
        if (!surveyId || !survey) return

        let cancelled = false
            ; (async () => {
                try {
                    const json = await getSurveyBurnRate(surveyId)
                    if (!cancelled) {
                        setBurnRate(json.data || null)
                    }
                } catch (err) {
                    console.error('Failed to fetch burn rate:', err)
                    if (!cancelled) setBurnRate(null)
                }
            })()

        return () => { cancelled = true }
    }, [surveyId, survey?.status, survey?.remaining_responses])

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

                            {/* Reward Edit Section */}
                            <div id="reward-section" className="mt-6 mb-4 text-sm text-gray-700">
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
                            </div>

                            {/* Burn Rate Visualization UI */}
                            {(() => {
                                const total = survey.total_responses;
                                const completed = burnRate?.completed_responses ?? Math.max(0, total - survey.remaining_responses);
                                const remaining = burnRate?.remaining_responses ?? Math.max(0, total - completed);
                                const progressPercent = total > 0 ? (completed / total) * 100 : 0;
                                const progressStr = Math.round(progressPercent);

                                const responsesPerMinute = burnRate?.responses_per_minute ?? 0;
                                const estimatedMinutesToFinish = burnRate?.estimated_minutes_to_finish ?? null;
                                const hoursToFinish = estimatedMinutesToFinish !== null ? estimatedMinutesToFinish / 60 : null;

                                const budgetTerpakai = burnRate?.total_spent ?? completed * survey.reward_per_response;
                                const sisaBudget = burnRate?.remaining_budget ?? remaining * survey.reward_per_response;
                                const totalBudget = budgetTerpakai + sisaBudget;
                                const budgetTerpakaiPercent = totalBudget > 0 ? (budgetTerpakai / totalBudget) * 100 : 0;

                                const isDataEnough = burnRate?.has_enough_data ?? (completed >= 5 && responsesPerMinute > 0);

                                return (
                                    <div className="space-y-4 font-mono mt-8">
                                        {/* Card 1: Progress */}
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-800 mb-2">Progress</h3>
                                            <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-700 text-sm shadow-sm">
                                                <div className="flex justify-between items-center mb-2">
                                                    <p>Progress: {completed} / {total} responses</p>
                                                    <span className="text-slate-400">📋</span>
                                                </div>
                                                {completed === 0 ? (
                                                    <div className="py-2 text-slate-400 italic text-center border border-dashed border-slate-200 rounded-lg">
                                                        Belum ada response masuk
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 font-bold text-slate-500 tracking-[0.2em] relative h-4 bg-slate-100 rounded flex items-center overflow-hidden">
                                                            <div
                                                                className="absolute top-0 left-0 bottom-0 bg-blue-500"
                                                                style={{ width: `${progressPercent}%` }}
                                                            />
                                                        </div>
                                                        <span className="w-10 text-right font-semibold">{progressStr}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card 2: Time Estimation */}
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-800 mb-2">Estimasi waktu</h3>
                                            <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-700 text-sm shadow-sm">
                                                {responsesPerMinute <= 0 ? (
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <span>⏱️</span> Belum ada aktivitas
                                                    </div>
                                                ) : !isDataEnough ? (
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <span>⏱️</span> Belum cukup data untuk estimasi (butuh min 5 response)
                                                    </div>
                                                ) : (
                                                    (() => {
                                                        const safeHoursToFinish = hoursToFinish ?? 0;
                                                        const formatDynamicTime = (hours: number) => {
                                                            if (hours >= 24) {
                                                                const d = Math.floor(hours / 24);
                                                                const remainingHours = Math.floor(hours % 24);
                                                                const remainingMinutes = Math.round((hours % 1) * 60);
                                                                
                                                                if (remainingHours > 0) {
                                                                    return `${d} Hari ${remainingHours} Jam`;
                                                                } else if (remainingMinutes > 0) {
                                                                    return `${d} Hari ${remainingMinutes} Menit`;
                                                                } else {
                                                                    return `${d} Hari`;
                                                                }
                                                            } else {
                                                                const h = Math.floor(hours);
                                                                const m = Math.round((hours % 1) * 60);
                                                                if (h > 0) {
                                                                    if (m > 0) return `${h} Jam ${m} Menit`;
                                                                    return `${h} Jam`;
                                                                }
                                                                return `${m} Menit`;
                                                            }
                                                        };

                                                        const timeText = formatDynamicTime(safeHoursToFinish);

                                                        return (
                                                            <>
                                                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                                                    <p className="flex items-center gap-2 font-medium">
                                                                        <span>⏱️</span>
                                                                        Estimasi selesai: {timeText} lagi
                                                                    </p>
                                                                    <span className="text-slate-400">⏱️</span>
                                                                </div>
                                                                <div className="mb-4">
                                                                    <p className="mb-2 font-medium text-slate-500">Status:</p>
                                                                    <div className="space-y-1.5 pl-1">
                                                                        <p className={`flex items-center gap-2 ${safeHoursToFinish < 2 ? 'text-emerald-700 font-bold bg-emerald-50 py-1 px-2 rounded-md -ml-2' : 'text-slate-500'}`}>
                                                                            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Cepat ( kemungkinan selesai &lt; 2 jam )
                                                                        </p>
                                                                        <p className={`flex items-center gap-2 ${(safeHoursToFinish >= 2 && safeHoursToFinish <= 6) ? 'text-amber-700 font-bold bg-amber-50 py-1 px-2 rounded-md -ml-2' : 'text-slate-500'}`}>
                                                                            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Normal ( stabil )
                                                                        </p>
                                                                        <p className={`flex items-center gap-2 ${safeHoursToFinish > 6 ? 'text-rose-700 font-bold bg-rose-50 py-1 px-2 rounded-md -ml-2' : 'text-slate-500'}`}>
                                                                            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> Lambat ( risiko tidak selesai )
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Urgency */}
                                                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                                    <p className="font-semibold text-slate-800 flex items-center gap-2">
                                                                        {safeHoursToFinish > 10 ? '⚠️' : '⏳'} Dengan kondisi sekarang:
                                                                    </p>
                                                                    <p className={`mt-1 ${safeHoursToFinish > 10 ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                                                                        {safeHoursToFinish > 10
                                                                            ? `Survey kemungkinan butuh waktu lama` 
                                                                            : `Survey selesai dalam ~${timeText}`}
                                                                    </p>
                                                                </div>
                                                            </>
                                                        );
                                                    })()
                                                )}
                                            </div>
                                        </div>

                                        {/* Card 3: Budget Burn */}
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-800 mb-2">Budget burn</h3>
                                            <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-700 text-sm shadow-sm">
                                                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                                                    <p className="flex items-center gap-2 font-medium">
                                                        <span>💰</span>
                                                        Budget terpakai: {Math.round(budgetTerpakaiPercent)}%
                                                    </p>
                                                    <span className="text-slate-400">💰</span>
                                                </div>
                                                <div className="space-y-2">
                                                    <div>
                                                        <p className="text-slate-500 mb-1">Sisa:</p>
                                                        <p className="font-bold text-slate-800 text-lg">
                                                            Rp{sisaBudget.toLocaleString('id-ID')}
                                                        </p>
                                                        <p className="text-slate-500">
                                                            ≈ {remaining} respon lagi
                                                        </p>
                                                    </div>
                                                    {isDataEnough && (
                                                        <div className="pt-2 border-t border-slate-100">
                                                            <p className="text-slate-600">
                                                                Burn rate: <span className="font-semibold text-slate-800">~{responsesPerMinute.toFixed(2)} respon / menit</span>
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card 4: Insight */}
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-800 mb-2">Insight</h3>
                                            <div className="bg-white border border-slate-200 rounded-xl p-4 text-slate-700 text-sm shadow-sm">
                                                <div className="flex items-center gap-2 font-bold text-indigo-900 mb-3 border-b border-slate-100 pb-2">
                                                    <span>💡</span> Evaluasi & Insight
                                                </div>

                                                {(() => {
                                                    const insight = generateSurveyInsight({
                                                        status: survey.status,
                                                        reward: survey.reward_per_response,
                                                        recommended_reward: rewardEval?.recommended || 0,
                                                        responses: completed,
                                                        valid_rate: insightData?.rates?.valid,
                                                        low_quality_rate: insightData?.rates?.lowQuality,
                                                        isDataEnough,
                                                        hoursToFinish: hoursToFinish ?? undefined
                                                    });

                                                    const estimation = survey.status === 'draft' && rewardEval ? getEstimationSummary(
                                                        survey.reward_per_response,
                                                        rewardEval.recommended,
                                                        survey.total_responses
                                                    ) : null;

                                                    if (!insight) return null;

                                                    const bgColor = insight.type === 'good' ? 'bg-emerald-50 border-emerald-100' :
                                                                    insight.type === 'normal' ? 'bg-amber-50 border-amber-100' :
                                                                    insight.type === 'warning' ? 'bg-orange-50 border-orange-100' :
                                                                    insight.type === 'danger' ? 'bg-red-50 border-red-100' :
                                                                    'bg-blue-50 border-blue-100';
                                                    const textColor = insight.type === 'good' ? 'text-emerald-800' :
                                                                      insight.type === 'normal' ? 'text-amber-800' :
                                                                      insight.type === 'warning' ? 'text-orange-800' :
                                                                      insight.type === 'danger' ? 'text-red-800' :
                                                                      'text-blue-800';
                                                    const titleColor = insight.type === 'good' ? 'text-emerald-900' :
                                                                       insight.type === 'normal' ? 'text-amber-900' :
                                                                       insight.type === 'warning' ? 'text-orange-900' :
                                                                       insight.type === 'danger' ? 'text-red-900' :
                                                                       'text-blue-900';
                                                    const subTextColor = insight.type === 'good' ? 'text-emerald-700' :
                                                                         insight.type === 'normal' ? 'text-amber-700' :
                                                                         insight.type === 'warning' ? 'text-orange-700' :
                                                                         insight.type === 'danger' ? 'text-red-700' :
                                                                         'text-blue-700';
                                                    const insightIcon = insight.type === 'good' ? '🟢' :
                                                                        insight.type === 'normal' ? '🟡' :
                                                                        insight.type === 'danger' ? '🔴' :
                                                                        insight.type === 'warning' ? '⚠️' :
                                                                        '💡';

                                                    return (
                                                        <div className={`border rounded-lg p-3 ${bgColor}`}>
                                                            {survey.status === 'draft' && estimation && (
                                                                <div className="mb-4 pb-4 border-b border-black/10">
                                                                    <div className="flex justify-between items-center mb-3">
                                                                        <span className={`font-bold text-xs uppercase tracking-wider ${titleColor}`}>Confidence Score</span>
                                                                        <span className={`text-xl font-extrabold ${titleColor}`}>
                                                                            {estimation.confidence_score}%
                                                                        </span>
                                                                    </div>
                                                                    <div className={`text-xs space-y-2 ${textColor}`}>
                                                                        <p className="font-semibold flex items-center gap-1.5">
                                                                            {estimation.confidence_color === 'green' ? '🟢' : estimation.confidence_color === 'yellow' ? '🟡' : '🔴'} Kemungkinan:
                                                                        </p>
                                                                        <ul className="list-disc pl-5 space-y-1">
                                                                            <li>Selesai {estimation.speed === 'cepat' ? 'sangat cepat' : estimation.speed === 'sedang' ? 'dalam waktu wajar' : 'sangat lambat'}</li>
                                                                            <li>Kualitas response {estimation.quality}</li>
                                                                        </ul>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {survey.status === 'draft' && rewardEval && !rewardEval.softOk && (
                                                                <p className={`font-semibold ${textColor} mb-2`}>Karena reward &lt; rekomendasi final:</p>
                                                            )}
                                                            <p className={`font-bold text-base ${titleColor}`}>
                                                                {insightIcon} {insight.title}
                                                            </p>
                                                            <p className={`${textColor} mt-1`}>{insight.message}</p>
                                                            {insight.suggestion && (
                                                                <p className={`${subTextColor} mt-1`}>→ {insight.suggestion}</p>
                                                            )}
                                                            {insight.impact && (
                                                                <div className={`mt-3 border-t border-black/10 pt-2 ${subTextColor}`}>
                                                                    <p className="font-semibold">Dampak:</p>
                                                                    <p>{insight.impact}</p>
                                                                </div>
                                                            )}

                                                            {survey.status === 'draft' && insight.type === 'warning' && (
                                                                <div className="mt-3">
                                                                    <p className={`${titleColor} font-semibold mb-1`}>Saran:</p>
                                                                    <p className={`${textColor} text-xs mb-2`}>
                                                                        Berdasarkan {questions.length} pertanyaan dan estimasi waktu pengisian.
                                                                    </p>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditReward(rewardEval?.recommended || 0);
                                                                            setIsEditingReward(true);
                                                                            window.scrollTo({ top: document.getElementById('reward-section')?.offsetTop, behavior: 'smooth' });
                                                                        }}
                                                                        className="w-full text-center px-3 py-2 bg-amber-200 hover:bg-amber-300 text-amber-900 text-xs font-semibold rounded-lg transition-colors"
                                                                    >
                                                                        ✨ Gunakan rekomendasi final Rp {(rewardEval?.recommended || 0).toLocaleString('id-ID')}
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {survey.status === 'completed' && insightData && (
                                                                <div className="grid grid-cols-3 gap-3 my-3">
                                                                    <div className="bg-white p-2 rounded border border-indigo-50 text-center">
                                                                        <p className="text-[10px] text-gray-500 mb-0.5">Valid Rate</p>
                                                                        <p className={`text-sm font-bold ${insightData.rates.valid >= 0.7 ? 'text-green-600' : 'text-amber-600'}`}>
                                                                            {Math.round(insightData.rates.valid * 100)}%
                                                                        </p>
                                                                    </div>
                                                                    <div className="bg-white p-2 rounded border border-indigo-50 text-center">
                                                                        <p className="text-[10px] text-gray-500 mb-0.5">Low Quality</p>
                                                                        <p className={`text-sm font-bold ${insightData.rates.lowQuality > 0.3 ? 'text-red-600' : 'text-gray-700'}`}>
                                                                            {Math.round(insightData.rates.lowQuality * 100)}%
                                                                        </p>
                                                                    </div>
                                                                    <div className="bg-white p-2 rounded border border-indigo-50 text-center">
                                                                        <p className="text-[10px] text-gray-500 mb-0.5">Rejected</p>
                                                                        <p className={`text-sm font-bold ${insightData.rates.rejected > 0.15 ? 'text-red-600' : 'text-gray-700'}`}>
                                                                            {Math.round(insightData.rates.rejected * 100)}%
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {survey.status === 'completed' && insightData && insightData.suggestion && (
                                                                <>
                                                                    <p className="font-semibold text-indigo-900 mb-1 mt-3">📝 Evaluasi AI:</p>
                                                                    <p className="text-indigo-800 text-xs leading-relaxed">{insightData.suggestion}</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}


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

                        <div className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl p-4 space-y-3 mb-5">
                            <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                                <span className="text-slate-500">Judul Survey</span>
                                <span className="font-semibold text-slate-800 text-right max-w-[55%] truncate">{survey.title}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                                <span className="text-slate-500">Jumlah Pertanyaan</span>
                                <span className={`font-semibold ${questions.length === 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                    {questions.length} pertanyaan {questions.length === 0 && '⚠️'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                                <span className="text-slate-500">Target Responden</span>
                                <span className="font-semibold text-slate-800">{survey.total_responses} orang</span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
                                <span className="text-slate-500">Reward / Responden</span>
                                <span className="font-semibold text-blue-600">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(survey.reward_per_response)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-500">Total Budget</span>
                                <span className="font-semibold text-emerald-600">
                                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(survey.reward_per_response * survey.total_responses)}
                                </span>
                            </div>
                        </div>

                        {rewardEval && !rewardEval.hardOk && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 text-sm text-red-800">
                                <p className="font-bold text-red-600 mb-3 flex items-center gap-2">
                                    <span>❌</span> Reward terlalu rendah
                                </p>
                                <div className="mb-4 space-y-1 text-sm">
                                    <p>Minimal: <span className="font-semibold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(rewardEval.minRequired)}</span></p>
                                    <p>Rekomendasi final: <span className="font-semibold">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(rewardEval.recommended)}</span></p>
                                    <p className="text-xs text-red-700 italic mt-1">Berdasarkan {questions.length} pertanyaan dan estimasi waktu pengisian.</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setShowPublishModal(false);
                                        setEditReward(rewardEval.recommended);
                                        setIsEditingReward(true);
                                        window.scrollTo({ top: document.getElementById('reward-section')?.offsetTop, behavior: 'smooth' });
                                    }}
                                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-lg transition-colors border border-red-300 w-full"
                                >
                                    ✨ Gunakan Rekomendasi Final
                                </button>
                            </div>
                        )}

                        {rewardEval && rewardEval.hardOk && !rewardEval.softOk && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-900">
                                <p className="font-bold text-amber-600 mb-3 flex items-center gap-2">
                                    <span>⚠️</span> Reward di bawah rekomendasi
                                </p>
                                <div className="mb-4">
                                    <p className="font-medium mb-1">Survey kemungkinan:</p>
                                    <ul className="list-disc pl-5 space-y-1 text-amber-800 mb-2">
                                        <li>Berjalan lambat</li>
                                        <li>Mendapat banyak respon low quality</li>
                                    </ul>
                                    <p className="text-xs text-amber-700 italic">Berdasarkan {questions.length} pertanyaan dan estimasi waktu pengisian.</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => {
                                            setShowPublishModal(false);
                                            setEditReward(rewardEval.recommended);
                                            setIsEditingReward(true);
                                            window.scrollTo({ top: document.getElementById('reward-section')?.offsetTop, behavior: 'smooth' });
                                        }}
                                        className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold rounded-lg transition-colors border border-amber-300 w-full text-center"
                                    >
                                        ✨ Gunakan Rekomendasi Final Rp {rewardEval.recommended.toLocaleString('id-ID')}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => setShowPublishModal(false)}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Batal
                            </button>
                            {(!rewardEval || (rewardEval.hardOk && rewardEval.softOk)) && (
                                <button
                                    onClick={handleConfirmPublish}
                                    disabled={questions.length === 0}
                                    className={`px-4 py-2 rounded-xl text-white text-sm font-semibold transition-colors ${questions.length === 0 ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                >
                                    ✅ Ya, Publish Sekarang
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
