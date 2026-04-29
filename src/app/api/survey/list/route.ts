import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')
    let user_id: string | null = null

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        user_id = user.id
      }
    }

    let query = supabase
      .from('surveys')
      .select('*')
      .eq('status', 'active')
      .gt('remaining_responses', 0)

    // ❗ exclude survey milik sendiri
    if (user_id) {
      query = query.neq('creator_id', user_id)
    }

    const { data, error } = await query

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    let filteredData = data;

    // Filter out surveys the user has already responded to
    if (user_id && data && data.length > 0) {
      const { data: responses } = await supabase
        .from('responses')
        .select('survey_id')
        .eq('user_id', user_id);

      if (responses && responses.length > 0) {
        const respondedIds = new Set(responses.map(r => r.survey_id));
        filteredData = data.filter((survey: any) => !respondedIds.has(survey.id));
      }
    }

    return Response.json({ data: filteredData })

  } catch (err) {
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}