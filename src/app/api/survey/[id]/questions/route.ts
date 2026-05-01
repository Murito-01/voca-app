import { createClient } from '@supabase/supabase-js'

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Ambil questions
        const { data: questions, error: qError } = await supabase
            .from('questions')
            .select('*')
            .eq('survey_id', id)
            .order('created_at', { ascending: true })

        if (qError) {
            return Response.json({ error: qError.message }, { status: 400 })
        }

        // Ambil options untuk pertanyaan-pertanyaan ini
        if (questions && questions.length > 0) {
            const questionIds = questions.map(q => q.id)
            const { data: options, error: optError } = await supabase
                .from('options')
                .select('*')
                .in('question_id', questionIds)

            if (optError) {
                return Response.json({ error: optError.message }, { status: 400 })
            }

            // Gabungkan options ke dalam questions
            const questionsWithOptions = questions.map(q => ({
                ...q,
                options: options ? options.filter(o => o.question_id === q.id) : []
            }))

            return Response.json({ data: questionsWithOptions })
        }

        return Response.json({ data: questions })

    } catch (err) {
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await req.json()
        const authHeader = req.headers.get('Authorization')

        if (!authHeader) {
            return Response.json(
                { error: 'Missing authorization header' },
                { status: 401 }
            )
        }

        const token = authHeader.replace('Bearer ', '')

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const {
            data: { user },
            error: authError
        } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return Response.json(
                { error: 'Unauthorized or invalid token' },
                { status: 401 }
            )
        }

        // Pastikan survey ini milik user yang login
        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .select('id, creator_id')
            .eq('id', id)
            .single()

        if (surveyError || !survey) {
            return Response.json({ error: 'Survey tidak ditemukan' }, { status: 404 })
        }

        if (survey.creator_id !== user.id) {
            return Response.json({ error: 'Akses ditolak' }, { status: 403 })
        }

        const { question_text, question_type, options } = body

        if (!question_text || !question_type) {
            return Response.json({ error: 'Data pertanyaan tidak lengkap' }, { status: 400 })
        }

        // Insert Question
        const { data: questionData, error: qError } = await supabase
            .from('questions')
            .insert({
                survey_id: id,
                question_text,
                question_type
            })
            .select()
            .single()

        if (qError || !questionData) {
            return Response.json({ error: qError?.message || 'Gagal menyimpan pertanyaan' }, { status: 400 })
        }

        // Insert Options jika ada
        if (options && Array.isArray(options) && options.length > 0 && ['radio', 'checkbox'].includes(question_type)) {
            const optionsToInsert = options.map(optText => ({
                question_id: questionData.id,
                option_text: optText
            }))

            const { error: optError } = await supabase
                .from('options')
                .insert(optionsToInsert)

            if (optError) {
                // Walaupun gagal insert options, question sudah terbuat.
                // Bisa saja dihandle lebih baik (misalnya rollback/delete question),
                // tapi kita kembalikan error dulu.
                return Response.json({ error: optError.message }, { status: 400 })
            }
        }

        return Response.json({ success: true, data: questionData })

    } catch (err) {
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
