import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export async function POST(req: Request) {
    try {
        let body
        try {
            body = await req.json()
        } catch {
            return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
        }

        const {
            order_id,
            status_code,
            gross_amount,
            signature_key,
            transaction_status,
            transaction_id
        } = body

        if (!order_id || !status_code || !gross_amount || !signature_key || !transaction_status) {
            return Response.json({ error: 'Missing required parameters' }, { status: 400 })
        }

        // 1. Verify Midtrans cryptographic signature
        const serverKey = process.env.MIDTRANS_SERVER_KEY
        if (!serverKey) {
            console.error('MIDTRANS_SERVER_KEY environment variable is not defined')
            return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        const rawString = `${order_id}${status_code}${gross_amount}${serverKey}`
        const expectedSignature = crypto.createHash('sha512').update(rawString).digest('hex')

        if (expectedSignature !== signature_key) {
            return Response.json({ error: 'Invalid signature key' }, { status: 403 })
        }

        // 2. Map transaction_status to app status
        let newStatus: 'pending' | 'success' | 'failed'
        if (transaction_status === 'settlement' || transaction_status === 'capture') {
            newStatus = 'success'
        } else if (transaction_status === 'pending') {
            newStatus = 'pending'
        } else if (['deny', 'cancel', 'expire', 'failure'].includes(transaction_status)) {
            newStatus = 'failed'
        } else {
            // Acknowledge other transaction states without taking action
            return Response.json({ ok: true, message: `Unhandled status: ${transaction_status}` })
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // 3. Find the corresponding topup record
        const { data: topup, error: findError } = await supabase
            .from('topups')
            .select('*')
            .eq('order_id', order_id)
            .single()

        if (findError || !topup) {
            console.error(`Topup record not found for order_id: ${order_id}`, findError)
            return Response.json({ error: 'Topup transaction not found' }, { status: 404 })
        }

        // 4. Enforce idempotency: skip if already successfully processed
        if (topup.status === 'success') {
            return Response.json({ ok: true, message: 'Transaction already successfully processed' })
        }

        // 5. Update database: use a stored procedure transaction for success to guarantee atomicity
        if (newStatus === 'success') {
            const { data: rpcResult, error: rpcError } = await supabase.rpc('process_topup_payment', {
                p_order_id: order_id,
                p_amount: Number(topup.amount),
                p_user_id: topup.user_id,
                p_midtrans_transaction_id: transaction_id || null
            })

            if (rpcError) {
                console.error('Error executing process_topup_payment RPC:', rpcError)
                return Response.json({ error: 'Failed to process payment transaction' }, { status: 500 })
            }

            // @ts-ignore
            if (rpcResult && !rpcResult.success) {
                // @ts-ignore
                return Response.json({ error: rpcResult.message }, { status: 400 })
            }

            return Response.json({ ok: true, status: 'success', message: rpcResult ? rpcResult.message : 'Processed' })
        } else {
            // For failed or pending, just update the topup record status
            const { error: updateTopupError } = await supabase
                .from('topups')
                .update({
                    status: newStatus,
                    midtrans_transaction_id: transaction_id || null
                })
                .eq('id', topup.id)

            if (updateTopupError) {
                console.error(`Error updating topup record status to ${newStatus}:`, updateTopupError)
                return Response.json({ error: 'Failed to update transaction status' }, { status: 500 })
            }

            return Response.json({ ok: true, status: newStatus })
        }

    } catch (err: any) {
        console.error('Unhandled error in Midtrans webhook handler:', err)
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}
