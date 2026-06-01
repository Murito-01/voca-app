import { createClient } from '@supabase/supabase-js'

/**
 * GET /api/wallet
 * Returns the authenticated user's wallet balance, transaction history, and stats.
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

        // Fetch wallet balance
        const { data: wallet, error: walletError } = await supabase
            .from('wallets')
            .select('balance, locked_balance')
            .eq('user_id', user.id)
            .single()

        if (walletError || !wallet) {
            return Response.json({ error: 'Wallet tidak ditemukan' }, { status: 404 })
        }

        // Fetch user info for card personalization
        const { data: dbUser, error: dbUserError } = await supabase
            .from('users')
            .select('email, reputation_score')
            .eq('id', user.id)
            .single()

        const email = dbUser?.email ?? user.email ?? 'User Account'
        const reputationScore = dbUser?.reputation_score ?? 100

        // Fetch 50 most recent transactions
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('id, type, amount, status, reference_id, reference_type, metadata, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50)

        if (txError) {
            return Response.json({ error: txError.message }, { status: 400 })
        }

        // Aggregate stats
        const txList = transactions ?? []
        const totalEarned = txList
            .filter((t) => t.type === 'reward' && t.status === 'success')
            .reduce((sum, t) => sum + Number(t.amount), 0)
        const totalWithdrawn = txList
            .filter((t) => (t.type === 'withdraw_success' || t.type === 'withdraw') && t.status === 'success')
            .reduce((sum, t) => sum + Number(t.amount), 0)
        const pendingAmount = txList
            .filter((t) => t.status === 'pending')
            .reduce((sum, t) => sum + Number(t.amount), 0)

        return Response.json({
            data: {
                balance: Number(wallet.balance),
                locked_balance: Number(wallet.locked_balance),
                email,
                reputation_score: Number(reputationScore),
                stats: {
                    total_earned: totalEarned,
                    total_withdrawn: totalWithdrawn,
                    pending: pendingAmount,
                },
                transactions: txList.map((t) => ({
                    id: t.id,
                    type: t.type,
                    amount: Number(t.amount),
                    status: t.status,
                    reference_id: t.reference_id,
                    reference_type: t.reference_type,
                    metadata: t.metadata,
                    created_at: t.created_at,
                })),
            }
        })
    } catch {
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}

