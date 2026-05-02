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

        // Verify survey ownership and status
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

        if (survey.status !== 'draft') {
            return Response.json({ error: 'Hanya survey berstatus draft yang bisa diedit' }, { status: 403 });
        }

        const { title, description } = body;

        if (!title || title.trim() === '') {
            return Response.json({ error: 'Judul tidak boleh kosong' }, { status: 400 });
        }

        const { error: updateError } = await supabase
            .from('surveys')
            .update({ 
                title: title.trim(),
                description: description ? description.trim() : null
            })
            .eq('id', id);

        if (updateError) {
            return Response.json({ error: updateError.message }, { status: 400 });
        }

        return Response.json({ success: true });

    } catch (err) {
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
