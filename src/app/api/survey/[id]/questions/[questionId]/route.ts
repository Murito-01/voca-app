import { createClient } from '@supabase/supabase-js';

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string; questionId: string }> }
) {
    try {
        const { id: surveyId, questionId } = await params;
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
            .eq('id', surveyId)
            .eq('creator_id', user.id)
            .single();

        if (surveyError || !survey) {
            return Response.json({ error: 'Survey not found or unauthorized' }, { status: 403 });
        }

        if (survey.status !== 'draft') {
            return Response.json({ error: 'Hanya survey draft yang bisa menghapus pertanyaan' }, { status: 403 });
        }

        // Delete question (assuming CASCADE handles options, or we can manually delete options first if needed)
        // Usually Supabase relationships have ON DELETE CASCADE.
        const { error: deleteError } = await supabase
            .from('questions')
            .delete()
            .eq('id', questionId)
            .eq('survey_id', surveyId);

        if (deleteError) {
            return Response.json({ error: deleteError.message }, { status: 400 });
        }

        return Response.json({ success: true });
    } catch (err) {
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string; questionId: string }> }
) {
    try {
        const { id: surveyId, questionId } = await params;
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

        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify survey ownership
        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .select('id, status')
            .eq('id', surveyId)
            .eq('creator_id', user.id)
            .single();

        if (surveyError || !survey) {
            return Response.json({ error: 'Survey not found or unauthorized' }, { status: 403 });
        }

        if (survey.status !== 'draft') {
            return Response.json({ error: 'Hanya survey draft yang bisa mengedit pertanyaan' }, { status: 403 });
        }

        const { question_text, question_type, options } = body;

        // Update question
        const { error: updateQError } = await supabase
            .from('questions')
            .update({
                question_text,
                question_type
            })
            .eq('id', questionId)
            .eq('survey_id', surveyId);

        if (updateQError) {
            return Response.json({ error: updateQError.message }, { status: 400 });
        }

        // Delete old options
        await supabase
            .from('options')
            .delete()
            .eq('question_id', questionId);

        // Insert new options
        if (options && options.length > 0) {
            const optionsToInsert = options.map((optText: string) => ({
                question_id: questionId,
                option_text: optText
            }));

            const { error: optionsError } = await supabase
                .from('options')
                .insert(optionsToInsert);

            if (optionsError) {
                return Response.json({ error: 'Failed to insert new options' }, { status: 400 });
            }
        }

        return Response.json({ success: true });
    } catch (err) {
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
