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

    // =========================
    // 🔍 FETCH RESPONSE DETAIL
    // =========================
    const { data, error } = await supabase
      .from('responses')
      .select(`
        id,
        created_at,
        score,
        status,
        score_breakdown,
        reward_final,
        surveys (
          title,
          reward_per_response
        ),
        answers (
          question_id,
          answer_text,
          option_id
        )
      `)
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }

    // =========================
    // 🧠 FORMAT RESPONSE
    // =========================
    const formatted = {
      id: data.id,
      created_at: data.created_at,
      title: data.surveys?.title || '',
      score: data.score,
      status: data.status,
      reward: data.surveys?.reward_per_response || 0,
      reward_final: data.reward_final || 0,

      breakdown: data.score_breakdown || {},

      answers: (data.answers || []).map((a: any) => ({
        question_id: a.question_id,
        answer_text: a.answer_text,
        option_id: a.option_id
      }))
    }

    return Response.json({ data: formatted })

  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}