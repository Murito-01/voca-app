import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/wallet
 * Returns the authenticated user's wallet balance.
 */
export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.replace('Bearer ', '')
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: wallet, error } = await supabase
            .from('wallets')
            .select('balance, locked_balance')
            .eq('user_id', user.id)
            .single()

        if (error || !wallet) {
            return Response.json({ error: 'Wallet tidak ditemukan' }, { status: 404 })
        }

        return Response.json({
            data: {
                balance: Number(wallet.balance),
                locked_balance: Number(wallet.locked_balance),
            }
        })
    } catch {
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}
