import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
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
        survey_id,
        score,
        status,
        surveys (
          title,
          reward_per_response
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    // 🔥 inject reward_final + clean structure
    const mapped = (data || []).map((item: any) => {
      let reward_final = 0

      if (item.status === 'valid') {
        reward_final = item.surveys?.reward_per_response || 0
      } else if (item.status === 'low_quality') {
        reward_final = item.surveys?.reward_per_response || 0
      } else {
        reward_final = 0
      }

      return {
        id: item.id,
        created_at: item.created_at,
        survey_id: item.survey_id,
        title: item.surveys?.title || '',
        score: item.score,
        status: item.status,
        reward: item.surveys?.reward_per_response || 0,
        reward_final
      }
    })

    return Response.json({ data: mapped })

  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}