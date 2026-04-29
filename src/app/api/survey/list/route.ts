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

    return Response.json({ data })

  } catch (err) {
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}