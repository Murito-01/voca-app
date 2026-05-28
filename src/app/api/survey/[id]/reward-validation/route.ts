import { createClient } from '@supabase/supabase-js'
import { evaluateReward, type QuestionLike } from '@/lib/reward-recommendation'

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.replace('Bearer ', '')
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: survey, error: surveyError } = await supabase
            .from('surveys')
            .select('id, creator_id, reward_per_response, total_responses, status')
            .eq('id', id)
            .single()

        if (surveyError || !survey) {
            return Response.json({ error: 'Survey tidak ditemukan' }, { status: 404 })
        }

        if (survey.creator_id !== user.id) {
            return Response.json({ error: 'Akses ditolak' }, { status: 403 })
        }

        const { data: questions, error: qError } = await supabase
            .from('questions')
            .select('question_type')
            .eq('survey_id', id)

        if (qError) {
            return Response.json({ error: qError.message }, { status: 400 })
        }

        const questionList: QuestionLike[] = (questions ?? []).map((q: any) => ({
            question_type: q.question_type,
        }))

        const evaluation = evaluateReward(
            Number(survey.reward_per_response) || 0,
            Number(survey.total_responses) || 1,
            questionList
        )

        return Response.json({
            data: {
                rewardPerResponse: evaluation.reward,
                minRequired: evaluation.min_required,
                recommended: evaluation.recommended,
                hardOk: evaluation.hardOk,
                softOk: evaluation.softOk,
                hardMessage: evaluation.hardMessage,
                softWarning: evaluation.softWarning,
                questionCount: questionList.length,
                breakdown: evaluation.breakdown,
                survey_status: survey.status,
            }
        })
    } catch (err: any) {
        return Response.json(
            { error: err.message ?? 'Internal server error' },
            { status: 500 }
        )
    }
}
