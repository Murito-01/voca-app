import { createClient } from '@supabase/supabase-js'

export async function GET(
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

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Pastikan survey milik creator yang login
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

        // Ambil semua responses beserta jawaban
        const { data: responses, error: responsesError } = await supabase
            .from('responses')
            .select(`
                id,
                user_id,
                created_at,
                score,
                status,
                answers (
                    id,
                    answer_text,
                    option_id,
                    questions (
                        id,
                        question_text,
                        question_type,
                        is_attention_check,
                        correct_option_id
                    ),
                    options (
                        id,
                        option_text
                    )
                )
            `)
            .eq('survey_id', id)
            .order('created_at', { ascending: false });

        if (responsesError) {
            return Response.json({ error: responsesError.message }, { status: 400 });
        }

        // Flatten data untuk tiap response
        const formatted = (responses || []).map((r: any, index: number) => {
            const answers = (r.answers || []).map((a: any) => {
                const question: any = Array.isArray(a.questions) ? a.questions[0] : (a.questions || {});
                const option: any = Array.isArray(a.options) ? a.options[0] : (a.options || null);

                const isAttentionCheck = question.is_attention_check || false;
                const isCorrect = isAttentionCheck
                    ? (a.option_id === question.correct_option_id)
                    : null;

                return {
                    question_id: question.id,
                    question_text: question.question_text,
                    question_type: question.question_type,
                    is_attention_check: isAttentionCheck,
                    answer_text: a.answer_text,
                    option_id: a.option_id,
                    option_text: option?.option_text || null,
                    is_correct: isCorrect,
                };
            });

            return {
                id: r.id,
                respondent_number: index + 1,
                user_id: r.user_id,
                created_at: r.created_at,
                score: r.score,
                status: r.status,
                answers,
            };
        });

        return Response.json({ data: formatted });

    } catch (err) {
        console.error(err);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
