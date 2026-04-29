import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            global: {
                headers: {
                    Authorization: req.headers.get('Authorization')!
                }
            }
        }
    )

    const {
        data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
        .from('surveys')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        return Response.json({ error: error.message }, { status: 400 })
    }

    return Response.json({ data })
}