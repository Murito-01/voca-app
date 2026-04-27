import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  const body = await req.json()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabase.rpc('submit_response', {
    p_user_id: body.user_id,
    p_survey_id: body.survey_id,
    p_score: body.score
  })

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({ success: true })
}