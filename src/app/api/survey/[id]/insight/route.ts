import { createClient } from '@supabase/supabase-js'
import {
    getRewardThresholdParamsFromEnv,
    mergeRewardParamsFromAppConfig,
    evaluateRewardThresholds
} from '@/lib/reward-thresholds'

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.replace('Bearer ', '')
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .select('id, creator_id, reward_per_response, status, avg_duration, avg_score')
            .eq('id', id)
            .single()

        if (surveyError || !survey) {
            return Response.json({ error: 'Survey tidak ditemukan' }, { status: 404 })
        }

        if (survey.creator_id !== user.id) {
            return Response.json({ error: 'Akses ditolak' }, { status: 403 })
        }

        if (survey.status !== 'completed') {
            return Response.json({ error: 'Insight hanya tersedia untuk survey yang sudah selesai (completed)' }, { status: 400 })
        }

        // Fetch question count to compute recommended reward and duration
        const { count: questionCount, error: countError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('survey_id', id)

        if (countError) {
            return Response.json({ error: countError.message }, { status: 400 })
        }

        let p = getRewardThresholdParamsFromEnv()
        p = await mergeRewardParamsFromAppConfig(supabase, p)

        const evaluation = evaluateRewardThresholds(
            Number(survey.reward_per_response) || 0,
            questionCount ?? 0,
            p
        )

        // Fetch responses
        const { data: responses, error: responseError } = await supabase
            .from('responses')
            .select('status')
            .eq('survey_id', id)

        if (responseError) {
            return Response.json({ error: responseError.message }, { status: 400 })
        }

        let validCount = 0
        let lowQualityCount = 0
        let rejectedCount = 0

        for (const r of responses || []) {
            if (r.status === 'valid') validCount++
            else if (r.status === 'low_quality') lowQualityCount++
            else if (r.status === 'rejected') rejectedCount++
        }

        const totalResponses = validCount + lowQualityCount + rejectedCount
        const validRate = totalResponses > 0 ? validCount / totalResponses : 0
        const lowQualityRate = totalResponses > 0 ? lowQualityCount / totalResponses : 0
        const rejectedRate = totalResponses > 0 ? rejectedCount / totalResponses : 0

        // Expected duration in seconds (evaluation.estimatedMinutesTotal is in minutes)
        const expectedDurationSeconds = evaluation.estimatedMinutesTotal * 60

        let suggestion = "Survey berjalan sangat baik! Pertahankan kualitas dan struktur reward ini untuk survey selanjutnya."

        if (lowQualityRate > 0.3 && survey.reward_per_response < evaluation.recommended) {
            suggestion = `Naikkan reward ke Rp ${evaluation.recommended.toLocaleString('id-ID')} untuk mendapatkan respons yang lebih berkualitas.`
        } else if (rejectedRate > 0.15) {
            suggestion = "Perbaiki kualitas pertanyaan atau tambahkan attention check untuk memfilter responden yang asal isi."
        } else if (survey.avg_duration && survey.avg_duration < expectedDurationSeconds * 0.5) {
            suggestion = "Banyak responden yang mengisi terlalu cepat. Kemungkinan asal isi, pertimbangkan untuk menambah attention check."
        }

        return Response.json({
            data: {
                reward: survey.reward_per_response,
                recommended: evaluation.recommended,
                counts: {
                    valid: validCount,
                    lowQuality: lowQualityCount,
                    rejected: rejectedCount,
                    total: totalResponses
                },
                rates: {
                    valid: validRate,
                    lowQuality: lowQualityRate,
                    rejected: rejectedRate
                },
                avgDuration: survey.avg_duration || 0,
                expectedDuration: expectedDurationSeconds,
                suggestion
            }
        })

    } catch (err: any) {
        return Response.json({ error: err.message || 'Internal server error' }, { status: 500 })
    }
}
