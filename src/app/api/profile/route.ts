import { createClient } from '@supabase/supabase-js'

function getSupabase() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

async function getAuthUser(req: Request) {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return null

    const token = authHeader.replace('Bearer ', '')
    const supabase = getSupabase()
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) return null
    return { user, supabase }
}

/**
 * GET /api/profile
 * Returns the authenticated user's profile data.
 */
export async function GET(req: Request) {
    try {
        const auth = await getAuthUser(req)
        if (!auth) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { user, supabase } = auth

        const { data: profile, error } = await supabase
            .from('users')
            .select('id, email, gender, age, job, reputation_score, created_at')
            .eq('id', user.id)
            .single()

        if (error || !profile) {
            return Response.json({ error: 'Profil tidak ditemukan' }, { status: 404 })
        }

        return Response.json({
            data: {
                id: profile.id,
                email: profile.email,
                gender: profile.gender,
                age: profile.age,
                job: profile.job,
                reputation_score: profile.reputation_score ?? 100,
                created_at: profile.created_at,
            }
        })
    } catch {
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}

/**
 * PUT /api/profile
 * Updates the authenticated user's profile (gender, age, job).
 */
export async function PUT(req: Request) {
    try {
        const auth = await getAuthUser(req)
        if (!auth) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { user, supabase } = auth
        const body = await req.json()

        const updates: Record<string, unknown> = {}

        if (body.gender !== undefined) {
            if (body.gender !== null && body.gender !== 'male' && body.gender !== 'female') {
                return Response.json({ error: 'Gender harus "male" atau "female"' }, { status: 400 })
            }
            updates.gender = body.gender
        }

        if (body.age !== undefined) {
            if (body.age !== null) {
                const age = Number(body.age)
                if (!Number.isInteger(age) || age < 1 || age > 120) {
                    return Response.json({ error: 'Usia harus berupa angka antara 1–120' }, { status: 400 })
                }
                updates.age = age
            } else {
                updates.age = null
            }
        }

        if (body.job !== undefined) {
            updates.job = body.job ? String(body.job).trim().slice(0, 100) : null
        }

        if (Object.keys(updates).length === 0) {
            return Response.json({ success: true, message: 'Tidak ada perubahan' })
        }

        const { error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', user.id)

        if (error) {
            return Response.json({ error: error.message }, { status: 400 })
        }

        return Response.json({ success: true })
    } catch {
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}
