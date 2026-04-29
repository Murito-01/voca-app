import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
    try {
        const body = await req.json()

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data, error } = await supabase.rpc('create_survey', {
            p_creator_id: body.creator_id,
            p_title: body.title,
            p_reward_per_response: body.reward_per_response,
            p_total_responses: body.total_responses
        })

        if (error) {
            return Response.json({ error: error.message }, { status: 400 })
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