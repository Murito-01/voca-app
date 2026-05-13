import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/response/draft?survey_id=<uuid>
 * Calls: get_draft_response(p_user_id, p_survey_id)
 * Returns: { data: { response_id, question_id, option_id, answer_text }[] }
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const surveyId = searchParams.get('survey_id')

    if (!surveyId) {
      return Response.json({ error: 'survey_id query param is required' }, { status: 400 })
    }

    const authHeader = req.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized or invalid token' }, { status: 401 })
    }

    const { data, error } = await supabase.rpc('get_draft_response', {
      p_user_id: user.id,
      p_survey_id: surveyId,
    })

    if (error) {
      return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ data: data ?? [] })
  } catch (err) {
    console.error('[GET /api/response/draft]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
