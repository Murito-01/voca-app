import { createClient } from '@supabase/supabase-js'
import {
    getRewardThresholdParamsFromEnv,
    mergeRewardParamsFromAppConfig,
    evaluateRewardThresholds,
    assertRewardMeetsHardRule
} from '@/lib/reward-thresholds'

async function logSurveyEvent(
    supabase: any,
    surveyId: string,
    eventType: 'created' | 'paused' | 'resumed' | 'completed'
) {
    try {
        await supabase.from('survey_events').insert({
            survey_id: surveyId,
            event_type: eventType
        });
    } catch {
        // Keep create flow successful even if event logging fails.
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
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
            return Response.json({ error: 'Unauthorized or invalid token' }, { status: 401 })
        }

        const rewardPerResponse = Number(body.reward_per_response)
        if (!Number.isFinite(rewardPerResponse) || rewardPerResponse <= 0) {
            return Response.json({ error: 'Reward harus lebih dari 0' }, { status: 400 })
        }

        let p = getRewardThresholdParamsFromEnv()
        p = await mergeRewardParamsFromAppConfig(supabase, p)
        const rewardCheck = evaluateRewardThresholds(rewardPerResponse, 0, p)
        try {
            assertRewardMeetsHardRule(rewardCheck)
        } catch (e: any) {
            return Response.json({ error: e.message }, { status: 400 })
        }

        const { data, error } = await supabase.rpc('create_survey', {
            p_creator_id: user.id,
            p_title: body.title,
            p_description: body.description || null,
            p_reward_per_response: rewardPerResponse,
            p_total_responses: body.total_responses,
            p_allow_extended_responses: body.allow_extended_responses ?? false,
        })

        if (error) {
            return Response.json({ error: error.message }, { status: 400 })
        }

        const surveyId = Array.isArray(data) ? data[0] : data;
        if (surveyId) {
            await logSurveyEvent(supabase, surveyId, 'created');
        }

        return Response.json({
            success: true,
            survey_id: surveyId,
            ...(rewardCheck.softWarning
                ? { reward_warning: rewardCheck.softWarning }
                : {})
        })

    } catch (err) {
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}