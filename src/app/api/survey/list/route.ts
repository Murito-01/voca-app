import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const user_id = searchParams.get('user_id')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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