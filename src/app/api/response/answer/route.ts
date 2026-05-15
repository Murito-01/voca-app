import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/response/answer
 *
 * Saves a single answer for a question. Dispatches to the correct DB function
 * based on payload shape:
 *
 *   Checkbox: { response_id, question_id, option_ids: string[] }
 *             → save_checkbox_answers(p_response_id, p_question_id, p_option_ids)
 *
 *   Radio:    { response_id, question_id, option_id: string }
 *             → save_response_answer(p_response_id, p_question_id, p_option_id, null)
 *
 *   Essay:    { response_id, question_id, answer_text: string }
 *             → save_response_answer(p_response_id, p_question_id, null, p_answer_text)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const authHeader = req.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    if (!body.response_id || !body.question_id) {
      return Response.json({ error: 'response_id and question_id are required' }, { status: 400 })
    }

    const isCheckbox = Array.isArray(body.option_ids)
    const isRadio    = typeof body.option_id === 'string'
    const isEssay    = typeof body.answer_text === 'string'

    if (!isCheckbox && !isRadio && !isEssay) {
      return Response.json(
        { error: 'Provide option_ids (checkbox), option_id (radio), or answer_text (essay)' },
        { status: 400 }
      )
    }

    if (isCheckbox && body.option_ids.length === 0) {
      return Response.json({ error: 'option_ids must not be empty' }, { status: 400 })
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

    if (isCheckbox) {
      const { error } = await supabase.rpc('save_checkbox_answers', {
        p_response_id: body.response_id,
        p_question_id: body.question_id,
        p_option_ids:  body.option_ids,
        p_user_id: user.id,
      })

      if (error) return Response.json({ error: error.message }, { status: 400 })
    } else {
      const { error } = await supabase.rpc('save_response_answer', {
        p_response_id: body.response_id,
        p_question_id: body.question_id,
        p_option_id:   isRadio ? body.option_id   : null,
        p_answer_text: isEssay ? body.answer_text : null,
        p_user_id: user.id,
      })

      if (error) return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('[POST /api/response/answer]', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
