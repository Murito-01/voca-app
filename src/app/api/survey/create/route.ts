import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
    try {
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

        // Verifikasi token dan ambil user secara eksplisit
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            return Response.json({ error: 'Unauthorized or invalid token' }, { status: 401 })
        }

        const { data, error } = await supabase.rpc('create_survey', {
            p_creator_id: user.id,
            p_title: body.title,
            p_reward_per_response: body.reward_per_response,
            p_total_responses: body.total_responses
        })

        if (error) {
            return Response.json({ error: error.message }, { status: 400 })
        }

        // Force status to draft initially
        const { error: updateError } = await supabase
            .from('surveys')
            .update({ status: 'draft' })
            .eq('id', data)

        if (updateError) {
            console.error('Update to draft error:', updateError);
            return Response.json({ error: 'Failed to set draft status: ' + updateError.message }, { status: 400 })
        }

        return Response.json({
            success: true,
            survey_id: data
        })

    } catch (err) {
        return Response.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}