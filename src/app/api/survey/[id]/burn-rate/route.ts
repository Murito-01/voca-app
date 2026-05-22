import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type BurnRateSnapshot = {
    total_spent: number
    active_duration_seconds: number
}

async function getBurnRateSnapshot(supabase: SupabaseClient, surveyId: string): Promise<BurnRateSnapshot> {
    const { data, error } = await supabase.rpc('get_survey_burn_rate', {
        p_survey_id: surveyId,
    })

    if (error) {
        return { total_spent: 0, active_duration_seconds: 0 }
    }

    const firstRow = Array.isArray(data) ? data[0] : data
    return {
        total_spent: Number(firstRow?.total_spent) || 0,
        active_duration_seconds: Number(firstRow?.active_duration_seconds) || 0,
    }
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const authHeader = req.headers.get('Authorization')

        if (!authHeader) {
            return Response.json({ error: 'Missing authorization header' }, { status: 401 })
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
            .select('id, creator_id, created_at, reward_per_response, total_responses, remaining_responses, locked_budget')
            .eq('id', id)
            .single()

        if (surveyError || !survey) {
            return Response.json({ error: 'Survey tidak ditemukan' }, { status: 404 })
        }

        if (survey.creator_id !== user.id) {
            return Response.json({ error: 'Akses ditolak' }, { status: 403 })
        }

        const { count: completedCount, error: countError } = await supabase
            .from('responses')
            .select('id', { count: 'exact', head: true })
            .eq('survey_id', id)
            .in('status', ['valid', 'low_quality', 'rejected'])

        if (countError) {
            return Response.json({ error: countError.message }, { status: 400 })
        }

        const { data: publishEvent } = await supabase
            .from('survey_events')
            .select('created_at')
            .eq('survey_id', id)
            .eq('event_type', 'resumed')
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()

        const startedAt = publishEvent?.created_at || survey.created_at
        const startedTime = startedAt ? new Date(startedAt).getTime() : Date.now()
        const elapsedMinutes = Math.max(0, (Date.now() - startedTime) / 60000)
        const completedResponses = Number(completedCount) || 0
        const remainingResponses = Math.max(0, Number(survey.remaining_responses) || 0)
        const responsesPerMinute = elapsedMinutes > 0
            ? completedResponses / elapsedMinutes
            : 0
        const hasEnoughData = completedResponses >= 5 && responsesPerMinute > 0
        const estimatedMinutesToFinish = hasEnoughData
            ? remainingResponses / responsesPerMinute
            : null
        const snapshot = await getBurnRateSnapshot(supabase, id)
        const rewardPerResponse = Number(survey.reward_per_response) || 0
        const lockedBudget = Number(survey.locked_budget) || 0

        return Response.json({
            data: {
                completed_responses: completedResponses,
                remaining_responses: remainingResponses,
                responses_per_minute: responsesPerMinute,
                estimated_minutes_to_finish: estimatedMinutesToFinish,
                has_enough_data: hasEnoughData,
                elapsed_minutes: elapsedMinutes,
                started_at: startedAt,
                locked_budget: lockedBudget,
                reward_per_response: rewardPerResponse,
                total_spent: snapshot.total_spent,
                remaining_budget: lockedBudget,
                budget_used_percent: snapshot.total_spent + lockedBudget > 0
                    ? (snapshot.total_spent / (snapshot.total_spent + lockedBudget)) * 100
                    : 0,
            },
        })
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Internal server error'
        return Response.json({ error: message }, { status: 500 })
    }
}
