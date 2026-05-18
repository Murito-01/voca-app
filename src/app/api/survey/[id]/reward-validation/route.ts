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
            .select('id, creator_id, reward_per_response, status')
            .eq('id', id)
            .single()

        if (surveyError || !survey) {
            return Response.json({ error: 'Survey tidak ditemukan' }, { status: 404 })
        }

        if (survey.creator_id !== user.id) {
            return Response.json({ error: 'Akses ditolak' }, { status: 403 })
        }

        const { count, error: countError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('survey_id', id)

        if (countError) {
            return Response.json({ error: countError.message }, { status: 400 })
        }

        const questionCount = count ?? 0
        let p = getRewardThresholdParamsFromEnv()
        p = await mergeRewardParamsFromAppConfig(supabase, p)

        const evaluation = evaluateRewardThresholds(
            Number(survey.reward_per_response) || 0,
            questionCount,
            p
        )

        return Response.json({
            data: {
                ...evaluation,
                survey_status: survey.status
            }
        })
    } catch (err: any) {
        return Response.json(
            { error: err.message ?? 'Internal server error' },
            { status: 500 }
        )
    }
}
