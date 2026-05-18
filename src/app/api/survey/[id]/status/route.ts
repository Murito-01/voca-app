import { createClient } from '@supabase/supabase-js'

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

/**
 * Snapshot survey metrics into survey_analytics for future ML training.
 * Uses upsert because the trigger already creates/updates a row per response.
 * On survey completion we finalize: completion_rate, reward, category.
 */
async function saveSurveyAnalytics(supabase: any, surveyId: string) {
    try {
        const { data: survey } = await supabase
            .from('surveys')
            .select('reward_per_response, total_responses, remaining_responses, avg_score, avg_duration, category')
            .eq('id', surveyId)
            .single();

        if (!survey) return;

        const completedResponses = (survey.total_responses || 0) - (survey.remaining_responses || 0);
        const completionRate = survey.total_responses > 0
            ? completedResponses / survey.total_responses
            : 0;

        // Update completion_rate on the survey itself
        await supabase
            .from('surveys')
            .update({ completion_rate: completionRate })
            .eq('id', surveyId);

        // Upsert analytics — trigger may have already created this row
        await supabase.from('survey_analytics').upsert({
            survey_id: surveyId,
            reward: survey.reward_per_response,
            category: survey.category || null,
            total_responses: survey.total_responses || 0,
            completed_responses: completedResponses,
            avg_score: survey.avg_score || 0,
            avg_duration: survey.avg_duration || 0,
            completion_rate: completionRate,
        }, { onConflict: 'survey_id' });
    } catch {
        // Analytics save should never block the completion flow
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json();
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            return Response.json({ error: 'Missing authorization header' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return Response.json({ error: 'Unauthorized or invalid token' }, { status: 401 });
        }

        const { status } = body;
        const validStatuses = ['paused', 'active', 'completed'];

        if (!status || !validStatuses.includes(status)) {
            return Response.json({ error: 'Status tidak valid' }, { status: 400 });
        }

        // Verify survey ownership
        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .select('id, creator_id, status')
            .eq('id', id)
            .single();

        if (surveyError || !survey) {
            return Response.json({ error: 'Survey tidak ditemukan' }, { status: 404 });
        }

        if (survey.creator_id !== user.id) {
            return Response.json({ error: 'Akses ditolak' }, { status: 403 });
        }

        if (survey.status === 'draft') {
            return Response.json({ error: 'Survey draft harus di-publish terlebih dahulu' }, { status: 400 });
        }

        if (status === 'completed') {
            const { error: rpcError } = await supabase.rpc('complete_survey', {
                p_survey_id: id,
            });

            if (rpcError) {
                return Response.json({ error: rpcError.message }, { status: 400 });
            }

            await logSurveyEvent(supabase, id, 'completed');
            await saveSurveyAnalytics(supabase, id);
            return Response.json({ success: true, status: 'completed' });
        }

        const { error: updateError } = await supabase
            .from('surveys')
            .update({ status })
            .eq('id', id);

        if (updateError) {
            return Response.json({ error: updateError.message }, { status: 400 });
        }

        if (status === 'paused') {
            await logSurveyEvent(supabase, id, 'paused');
        } else if (status === 'active') {
            await logSurveyEvent(supabase, id, 'resumed');
        }

        return Response.json({ success: true, status });

    } catch (err) {
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
