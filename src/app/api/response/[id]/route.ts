import { createClient } from '@supabase/supabase-js'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
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
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('responses')
      .select(`
        id,
        created_at,
        score,
        status,
        score_breakdown,
        surveys (
          title,
          description,
          reward_per_response
        ),
        answers (
          id,
          answer_text,
          option_id,
          questions (
            id,
            question_text,
            question_type
          ),
          options (
            id,
            option_text
          )
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    // =========================
    // 🔥 FLATTEN DATA
    // =========================

    const survey = data.surveys?.[0] || {}

    const answers = (data.answers || []).map((a: any) => {
      const question = a.questions?.[0] || {}
      const option = a.options?.[0] || {}

      return {
        answer_id: a.id,
        question_id: question.id,
        question_text: question.question_text,
        question_type: question.question_type,
        answer_text: a.answer_text,
        option_id: a.option_id,
        option_text: option.option_text
      }
    })

    let reward_final = 0
    if (data.status === 'valid') {
      reward_final = survey.reward_per_response || 0
    } else if (data.status === 'low_quality') {
      reward_final = survey.reward_per_response || 0
    }

    return Response.json({
      data: {
        id: data.id,
        created_at: data.created_at,
        score: data.score,
        status: data.status,
        score_breakdown: data.score_breakdown,

        survey: {
          title: survey.title || '',
          description: survey.description || '',
          reward: survey.reward_per_response || 0
        },

        reward_final,
        answers
      }
    })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}