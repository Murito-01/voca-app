import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/withdrawals/webhook
 * Handles payout callbacks from Xendit when a disbursement succeeds or fails.
 * Integrates database transactional safety and automatic wallet balance refunding on FAILED payouts.
 */
export async function POST(req: Request) {
    try {
        // 1. Verify Callback Token
        const callbackToken = req.headers.get('x-callback-token')
        const expectedToken = process.env.XENDIT_CALLBACK_TOKEN

        if (!expectedToken) {
            console.error('XENDIT_CALLBACK_TOKEN environment variable is not defined')
            return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        if (callbackToken !== expectedToken) {
            return Response.json({ error: 'Unauthorized callback token' }, { status: 403 })
        }

        let body
        try {
            body = await req.json()
        } catch {
            return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
        }

        // Support both snake_case and camelCase properties for 100% robustness
        const {
            id,
            reference_id,
            referenceId,
            status,
            failure_code,
            failureCode
        } = body

        const xenditPayoutId = id
        const orderId = reference_id || referenceId
        const payoutStatus = status
        const failureReason = failure_code || failureCode

        if (!orderId || !payoutStatus || !xenditPayoutId) {
            return Response.json({ error: 'Missing required parameters' }, { status: 400 })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 2. Fetch corresponding withdrawal record
        const { data: withdrawal, error: findError } = await supabase
            .from('withdrawals')
            .select('*')
            .eq('external_id', orderId)
            .single()

        if (findError || !withdrawal) {
            console.error(`Withdrawal record not found for external_id: ${orderId}`, findError)
            return Response.json({ error: 'Withdrawal transaction not found' }, { status: 404 })
        }

        // 3. Enforce idempotency: skip if already successfully completed or failed
        if (withdrawal.status === 'success' || withdrawal.status === 'failed') {
            return Response.json({ ok: true, message: 'Transaction already processed' })
        }

        // 4. Update status atomically
        if (payoutStatus === 'SUCCEEDED') {
            // Success: Mark withdrawal and transaction success
            const { data: rpcResult, error: rpcError } = await supabase.rpc('success_withdrawal', {
                p_withdrawal_id: withdrawal.id,
                p_xendit_payout_id: xenditPayoutId
            })

            if (rpcError) {
                console.error('Error invoking success_withdrawal RPC:', rpcError)
                return Response.json({ error: 'Failed to process success withdrawal state' }, { status: 500 })
            }

            // @ts-ignore
            if (rpcResult && !rpcResult.success) {
                // @ts-ignore
                return Response.json({ error: rpcResult.message }, { status: 400 })
            }

            return Response.json({ ok: true, status: 'success' })

        } else if (['FAILED', 'VOIDED', 'CANCELLED'].includes(payoutStatus)) {
            // Failure: Mark records failed AND AUTOMATICALLY REFUND wallet balance atomically
            const { data: rpcResult, error: rpcError } = await supabase.rpc('fail_withdrawal', {
                p_withdrawal_id: withdrawal.id,
                p_failure_reason: failureReason || `Xendit callback returned: ${payoutStatus}`
            })

            if (rpcError) {
                console.error('Error invoking fail_withdrawal RPC:', rpcError)
                return Response.json({ error: 'Failed to process fail withdrawal state' }, { status: 500 })
            }

            // @ts-ignore
            if (rpcResult && !rpcResult.success) {
                // @ts-ignore
                return Response.json({ error: rpcResult.message }, { status: 400 })
            }

            return Response.json({ ok: true, status: 'failed', refunded: true })

        } else {
            // Status is pending or accepted, simply save the payout ID and keep pending state
            const { error: updateError } = await supabase
                .from('withdrawals')
                .update({
                    xendit_payout_id: xenditPayoutId,
                    status: payoutStatus.toLowerCase()
                })
                .eq('id', withdrawal.id)

            if (updateError) {
                console.error('Error updating pending withdrawal status:', updateError)
                return Response.json({ error: 'Failed to update pending status' }, { status: 500 })
            }

            return Response.json({ ok: true, status: payoutStatus.toLowerCase() })
        }

    } catch (err: any) {
        console.error('Unhandled error in Xendit payout webhook handler:', err)
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}
