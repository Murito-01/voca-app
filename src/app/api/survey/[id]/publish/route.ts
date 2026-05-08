import { createClient } from '@supabase/supabase-js';

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

        const { data: survey } = await supabase
            .from('surveys')
            .select('status')
            .eq('id', id)
            .single();

        const { error: rpcError } = await supabase.rpc('publish_survey', {
            p_survey_id: id,
            p_creator_id: user.id,
        });

        if (rpcError) {
            return Response.json({ error: rpcError.message }, { status: 400 });
        }

        await logSurveyEvent(supabase, id, 'resumed');

        return Response.json({ success: true, message: 'Survey published successfully' });

    } catch (err) {
        console.error(err);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
