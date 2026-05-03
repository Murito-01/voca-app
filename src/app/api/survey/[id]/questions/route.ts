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
        const { id } = await params
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

        // =========================
        // 🔐 AUTH
        // =========================
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

        // =========================
        // 🔍 VALIDASI SURVEY
        // =========================
        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .select('id, creator_id, status')
            .eq('id', id)
            .single()

        if (surveyError || !survey) {
            return Response.json({ error: 'Survey tidak ditemukan' }, { status: 404 })
        }

        if (survey.creator_id !== user.id) {
            return Response.json({ error: 'Akses ditolak' }, { status: 403 })
        }

        if (survey.status !== 'draft') {
            return Response.json(
                { error: 'Hanya survey draft yang bisa menambah pertanyaan' },
                { status: 403 }
            )
        }

        // =========================
        // 📥 INPUT
        // =========================
        const {
            question_text,
            question_type,
            options,
            is_attention_check
        } = body

        let finalQuestionText = question_text
        let finalOptions = options
        let finalCorrectOptionIndex = null

        // =========================
        // 🧠 ATTENTION CHECK SYSTEM (ANTI ABUSE)
        // =========================
        if (is_attention_check) {
            // 🔒 HARD LIMIT (max 2 attention check per survey)
            const { count } = await supabase
                .from('questions')
                .select('*', { count: 'exact', head: true })
                .eq('survey_id', id)
                .eq('is_attention_check', true)

            if ((count || 0) >= 2) {
                return Response.json(
                    { error: 'Maksimal 2 attention check per survey' },
                    { status: 400 }
                )
            }

            // 🎯 TEMPLATE SYSTEM (bukan dari creator)
            const templates = [
                {
                    text: "Untuk memastikan kualitas, pilih jawaban 'Sangat Setuju'.",
                    options: ['Sangat Setuju', 'Setuju', 'Tidak Setuju'],
                    correct: 0
                },
                {
                    text: "Pilih opsi 'Warna Merah' untuk validasi.",
                    options: ['Warna Merah', 'Warna Biru', 'Warna Hijau'],
                    correct: 0
                },
                {
                    text: "Silakan pilih jawaban 'Ya' pada pertanyaan ini.",
                    options: ['Ya', 'Tidak'],
                    correct: 0
                }
            ]

            const randomTemplate =
                templates[Math.floor(Math.random() * templates.length)]

            finalQuestionText = randomTemplate.text
            finalOptions = randomTemplate.options
            finalCorrectOptionIndex = randomTemplate.correct
        } else {
            // =========================
            // 📌 VALIDASI NORMAL QUESTION
            // =========================
            if (!question_text || !question_type) {
                return Response.json(
                    { error: 'Data pertanyaan tidak lengkap' },
                    { status: 400 }
                )
            }
        }

        // =========================
        // 📝 INSERT QUESTION
        // =========================
        const { data: questionData, error: qError } = await supabase
            .from('questions')
            .insert({
                survey_id: id,
                question_text: finalQuestionText,
                question_type,
                is_attention_check: is_attention_check || false
            })
            .select()
            .single()

        if (qError || !questionData) {
            return Response.json(
                { error: qError?.message || 'Gagal menyimpan pertanyaan' },
                { status: 400 }
            )
        }

        // =========================
        // 📝 INSERT OPTIONS
        // =========================
        if (
            finalOptions &&
            Array.isArray(finalOptions) &&
            finalOptions.length > 0 &&
            ['radio', 'checkbox'].includes(question_type)
        ) {
            const optionsToInsert = finalOptions.map((optText: string) => ({
                question_id: questionData.id,
                option_text: optText
            }))

            const { data: insertedOptions, error: optError } = await supabase
                .from('options')
                .insert(optionsToInsert)
                .select()

            if (optError) {
                return Response.json({ error: optError.message }, { status: 400 })
            }

            // =========================
            // 🎯 SET CORRECT OPTION (AUTO)
            // =========================
            if (
                is_attention_check &&
                insertedOptions &&
                finalCorrectOptionIndex !== null
            ) {
                const correctOptionId =
                    insertedOptions[finalCorrectOptionIndex]?.id

                if (correctOptionId) {
                    await supabase
                        .from('questions')
                        .update({ correct_option_id: correctOptionId })
                        .eq('id', questionData.id)
                }
            }
        }

        return Response.json({
            success: true,
            data: questionData
        })
    } catch (err) {
        console.error(err)
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}