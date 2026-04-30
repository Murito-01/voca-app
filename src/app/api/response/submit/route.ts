import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const authHeader = req.headers.get('Authorization')

    // 🔐 cek auth header
    if (!authHeader) {
      return Response.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 🔐 validasi user via token
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return Response.json(
        { error: 'Unauthorized or invalid token' },
        { status: 401 }
      )
    }

    const { survey_id, answers } = body

    // 🧠 validasi payload
    if (!survey_id || !answers || !Array.isArray(answers)) {
      return Response.json(
        { error: 'Invalid payload' },
        { status: 400 }
      )
    }

    // 🚫 BLOCK DOUBLE SUBMIT
    const { data: existing, error: checkError } = await supabase
      .from('responses')
      .select('id')
      .eq('survey_id', survey_id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (checkError) {
      return Response.json(
        { error: checkError.message },
        { status: 400 }
      )
    }

    if (existing) {
      return Response.json(
        { error: 'Kamu sudah mengisi survey ini' },
        { status: 400 }
      )
    }

    // 📝 INSERT RESPONSE
    const { data: responseData, error: responseError } = await supabase
      .from('responses')
      .insert({
        survey_id,
        user_id: user.id
      })
      .select()
      .single()

    if (responseError || !responseData) {
      return Response.json(
        { error: responseError?.message || 'Gagal membuat response' },
        { status: 400 }
      )
    }

    const response_id = responseData.id

    // 🧠 PREPARE ANSWERS
    const answersToInsert: any[] = []

    for (const a of answers) {
      // TEXT (essay)
      if (a.answer_text) {
        answersToInsert.push({
          response_id,
          question_id: a.question_id,
          answer_text: a.answer_text
        })
      }

      // OPTION (radio / checkbox)
      if (a.option_ids && Array.isArray(a.option_ids)) {
        for (const opt of a.option_ids) {
          answersToInsert.push({
            response_id,
            question_id: a.question_id,
            option_id: opt
          })
        }
      }
    }

    // 💾 INSERT ANSWERS
    if (answersToInsert.length > 0) {
      const { error: answersError } = await supabase
        .from('answers')
        .insert(answersToInsert)

      if (answersError) {
        return Response.json(
          { error: answersError.message },
          { status: 400 }
        )
      }
    }

    // 📉 UPDATE SLOT
    const { error: updateError } = await supabase.rpc(
      'decrement_response_slot',
      { p_survey_id: survey_id }
    )

    if (updateError) {
      return Response.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    return Response.json({ success: true })

  } catch (err) {
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}