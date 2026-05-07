import { createClient } from '@supabase/supabase-js'

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

            return Response.json({ success: true, status: 'completed' });
        }

        const { error: updateError } = await supabase
            .from('surveys')
            .update({ status })
            .eq('id', id);

        if (updateError) {
            return Response.json({ error: updateError.message }, { status: 400 });
        }

        return Response.json({ success: true, status });

    } catch (err) {
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
