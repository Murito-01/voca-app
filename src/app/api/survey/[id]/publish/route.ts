import { createClient } from '@supabase/supabase-js';

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

        // Verify survey ownership
        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .select('id, status')
            .eq('id', id)
            .eq('creator_id', user.id)
            .single();

        if (surveyError || !survey) {
            return Response.json({ error: 'Survey not found or unauthorized' }, { status: 403 });
        }

        if (survey.status === 'active') {
            return Response.json({ error: 'Survey is already active' }, { status: 400 });
        }

        // Verify survey has questions before publishing
        const { count, error: countError } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('survey_id', id);

        if (countError || count === 0) {
            return Response.json({ error: 'Cannot publish survey without any questions' }, { status: 400 });
        }

        // Update status to active
        const { error: updateError } = await supabase
            .from('surveys')
            .update({ status: 'active' })
            .eq('id', id);

        if (updateError) {
            return Response.json({ error: updateError.message }, { status: 400 });
        }

        return Response.json({ success: true, message: 'Survey published successfully' });
    } catch (err) {
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
