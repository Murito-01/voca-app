import { createClient } from '@supabase/supabase-js';
import {
    getRewardThresholdParamsFromEnv,
    mergeRewardParamsFromAppConfig,
    evaluateRewardThresholds,
    assertRewardMeetsHardRule
} from '@/lib/reward-thresholds';

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
        
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            return Response.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: survey, error: surveyFetchError } = await supabase
            .from('surveys')
            .select('status, reward_per_response, creator_id')
            .eq('id', id)
            .single();

        if (surveyFetchError || !survey) {
            return Response.json({ error: 'Survey tidak ditemukan' }, { status: 404 });
        }

        if (survey.creator_id !== user.id) {
            return Response.json({ error: 'Akses ditolak' }, { status: 403 });
        }

        const { count: questionCount, error: countError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('survey_id', id);

        if (countError) {
            return Response.json({ error: countError.message }, { status: 400 });
        }

        if (!questionCount || questionCount < 1) {
            return Response.json(
                { error: 'Tambahkan minimal satu pertanyaan sebelum publish.' },
                { status: 400 }
            );
        }

        let p = getRewardThresholdParamsFromEnv();
        p = await mergeRewardParamsFromAppConfig(supabase, p);
        const rewardCheck = evaluateRewardThresholds(
            Number(survey.reward_per_response) || 0,
            questionCount,
            p
        );
        try {
            assertRewardMeetsHardRule(rewardCheck);
        } catch (e: any) {
            return Response.json({ error: e.message }, { status: 400 });
        }

        const { error: rpcError } = await supabase.rpc('publish_survey', {
            p_survey_id: id,
            p_creator_id: user.id,
        });

        if (rpcError) {
            return Response.json({ error: rpcError.message }, { status: 400 });
        }

        await logSurveyEvent(supabase, id, 'resumed');

        return Response.json({
            success: true,
            message: 'Survey published successfully',
            ...(rewardCheck.softWarning ? { reward_warning: rewardCheck.softWarning } : {})
        });

    } catch (err) {
        console.error(err);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
