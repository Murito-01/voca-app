import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
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