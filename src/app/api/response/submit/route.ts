import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const body = await req.json()
  const authHeader = req.headers.get('Authorization')

  if (!authHeader) {
    return Response.json({ error: 'Missing authorization header' }, { status: 401 })
  }

  const token = authHeader.replace('Bearer ', '')

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify token and get the user securely
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return Response.json({ error: 'Unauthorized or invalid token' }, { status: 401 })
  }

  const { error } = await supabase.rpc('submit_response', {
    p_user_id: user.id,
    p_survey_id: body.survey_id,
    p_score: body.score
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ success: true })
}