import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/withdrawals
 * Creates a withdrawal request, locks and deducts wallet balance atomically,
 * and executes a Xendit Payout disbursement with fail-safe automatic refunds on error.
 */
export async function POST(req: Request) {
    let withdrawalId: string | null = null
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        // 1. Authenticate Request
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return Response.json({ error: 'Missing authorization header' }, { status: 401 })
        }

        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            return Response.json({ error: 'Unauthorized or invalid token' }, { status: 401 })
        }

        // 2. Parse and Validate Request Parameters
        let body
        try {
            body = await req.json()
        } catch {
            return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
        }

        const amount = Number(body.amount)
        const { channel_code, account_number, account_holder_name } = body

        if (!Number.isInteger(amount) || amount < 10000) {
            return Response.json({ error: 'Nominal penarikan harus berupa angka bulat minimal Rp 10.000' }, { status: 400 })
        }

        if (!channel_code || !account_number) {
            return Response.json({ error: 'Bank/e-wallet channel dan nomor rekening harus diisi' }, { status: 400 })
        }

        // Generate unique external ID for payout
        const timestamp = Date.now()
        const randomNum = Math.floor(100000 + Math.random() * 900000)
        const externalId = `WITHDRAW-${timestamp}-${randomNum}`

        // 3. Request Database Balance Deduction (Atomic RPC)
        const { data: rpcResult, error: rpcError } = await supabase.rpc('request_withdrawal', {
            p_user_id: user.id,
            p_amount: amount,
            p_external_id: externalId,
            p_channel_code: channel_code,
            p_account_number: account_number,
            p_account_holder_name: account_holder_name || null
        })

        if (rpcError) {
            console.error('Error invoking request_withdrawal RPC:', rpcError)
            return Response.json({ error: 'Gagal memproses transaksi penarikan di database' }, { status: 500 })
        }

        // @ts-ignore
        if (rpcResult && !rpcResult.success) {
            // @ts-ignore
            return Response.json({ error: rpcResult.message }, { status: 400 })
        }

        // @ts-ignore
        withdrawalId = rpcResult.withdrawal_id

        // 4. Request Xendit Payout
        const secretKey = process.env.XENDIT_SECRET_KEY
        if (!secretKey) {
            console.error('XENDIT_SECRET_KEY environment variable is not defined')
            if (withdrawalId) {
                await supabase.rpc('fail_withdrawal', {
                    p_withdrawal_id: withdrawalId,
                    p_failure_reason: 'Server configuration error: XENDIT_SECRET_KEY not configured'
                })
            }
            return Response.json({ error: 'Konfigurasi server pembayaran tidak tersedia' }, { status: 500 })
        }

        const basicAuth = Buffer.from(`${secretKey}:`).toString('base64')

        let payoutResponse
        try {
            const xenditRes = await fetch('https://api.xendit.co/v2/payouts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${basicAuth}`,
                    'idempotency-key': externalId
                },
                body: JSON.stringify({
                    reference_id: externalId,
                    channel_code,
                    channel_properties: {
                        account_number,
                        account_holder_name: account_holder_name || undefined
                    },
                    amount,
                    currency: 'IDR',
                    description: `Penarikan Saldo Voca - ${externalId}`
                })
            })

            if (!xenditRes.ok) {
                const errorData = await xenditRes.json().catch(() => ({}))
                throw new Error(errorData.message || `HTTP error! status: ${xenditRes.status}`)
            }

            payoutResponse = await xenditRes.json()
        } catch (xenditError: any) {
            console.error('Xendit Payout API error:', xenditError)
            // AUTOMATIC REFUND GUARD: Refund active wallet balance immediately if Xendit creation fails
            const errorMessage = xenditError?.message || 'Gagal menghubungi Xendit Payout'
            if (withdrawalId) {
                await supabase.rpc('fail_withdrawal', {
                    p_withdrawal_id: withdrawalId,
                    p_failure_reason: `Xendit Payout Error: ${errorMessage}`
                })
            }
            return Response.json({ error: `Gagal memproses penarikan dana ke Xendit: ${errorMessage}` }, { status: 500 })
        }

        // 5. Update status based on Xendit response
        const xenditPayoutId = payoutResponse.id
        const xenditStatus = payoutResponse.status // 'PENDING', 'ACCEPTED', 'SUCCEEDED', 'FAILED'

        if (xenditStatus === 'SUCCEEDED') {
            await supabase.rpc('success_withdrawal', {
                p_withdrawal_id: withdrawalId,
                p_xendit_payout_id: xenditPayoutId
            })
        } else if (xenditStatus === 'FAILED') {
            await supabase.rpc('fail_withdrawal', {
                p_withdrawal_id: withdrawalId,
                p_failure_reason: 'Xendit payout status returned FAILED'
            })
        } else {
            // Keep pending/accepted in DB and save payout ID
            await supabase
                .from('withdrawals')
                .update({
                    xendit_payout_id: xenditPayoutId,
                    status: xenditStatus.toLowerCase()
                })
                .eq('id', withdrawalId)
        }

        return Response.json({
            success: true,
            message: 'Permintaan penarikan berhasil diproses',
            withdrawal_id: withdrawalId,
            xendit_payout_id: xenditPayoutId,
            status: xenditStatus.toLowerCase()
        })

    } catch (error: any) {
        console.error('Internal server error during withdrawal creation:', error)
        // Catch-all fail-safe refund
        if (withdrawalId) {
            try {
                await supabase.rpc('fail_withdrawal', {
                    p_withdrawal_id: withdrawalId,
                    p_failure_reason: `Internal server error: ${error.message || error}`
                })
            } catch (refundError) {
                console.error('Fail-safe refund failed:', refundError)
            }
        }
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}
