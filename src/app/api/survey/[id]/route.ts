import { createClient } from '@supabase/supabase-js'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data: survey, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    if (!survey) {
      return Response.json({ error: 'Survey not found' }, { status: 404 })
    }

    let has_submitted = false;
    if (user_id) {
      const { data: existingResponse } = await supabase
        .from('responses')
        .select('id')
        .eq('survey_id', id)
        .eq('user_id', user_id)
        .maybeSingle()
      
      if (existingResponse) {
        has_submitted = true;
      }
    }

    return Response.json({ data: { ...survey, has_submitted } })

  } catch (err) {
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

