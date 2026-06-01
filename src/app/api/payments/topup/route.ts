import { createClient } from '@supabase/supabase-js'
// @ts-ignore
import midtransClient from 'midtrans-client'

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return Response.json({ error: 'Missing authorization header' }, { status: 401 })
        }

        const token = authHeader.replace('Bearer ', '')

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data: { user }, error: authError } = await supabase.auth.getUser(token)
        if (authError || !user) {
            return Response.json({ error: 'Unauthorized or invalid token' }, { status: 401 })
        }

        let body
        try {
            body = await req.json()
        } catch {
            return Response.json({ error: 'Invalid JSON request body' }, { status: 400 })
        }

        const amount = Number(body.amount)
        if (!Number.isInteger(amount) || amount < 10000) {
            return Response.json({ error: 'Nominal top up harus berupa angka bulat minimal Rp 10.000' }, { status: 400 })
        }

        // Generate unique order ID
        const timestamp = Date.now()
        const randomNum = Math.floor(100000 + Math.random() * 900000)
        const orderId = `TOPUP-${timestamp}-${randomNum}`

        // 1. Create a row in the topups database table with status 'pending'
        const { error: insertError } = await supabase
            .from('topups')
            .insert({
                user_id: user.id,
                order_id: orderId,
                amount: amount,
                status: 'pending'
            })

        if (insertError) {
            console.error('Error inserting topup row:', insertError)
            return Response.json({ error: 'Gagal membuat transaksi top up' }, { status: 500 })
        }

        // 2. Request Midtrans Snap Transaction
        const snap = new midtransClient.Snap({
            isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'false',
            serverKey: process.env.MIDTRANS_SERVER_KEY,
            clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY
        })

        const parameter = {
            transaction_details: {
                order_id: orderId,
                gross_amount: amount
            },
            credit_card: {
                secure: true
            },
            customer_details: {
                email: user.email || ''
            }
        }

        let transaction
        try {
            transaction = await snap.createTransaction(parameter)
        } catch (midtransError: any) {
            console.error('Midtrans API error:', midtransError)
            // Update topup status to failed
            await supabase
                .from('topups')
                .update({ status: 'failed' })
                .eq('order_id', orderId)

            return Response.json({ error: 'Gagal menghubungi payment gateway' }, { status: 500 })
        }

        // 3. Save the token and redirect URL returned from Midtrans into the topups row
        const { error: updateError } = await supabase
            .from('topups')
            .update({
                snap_token: transaction.token,
                redirect_url: transaction.redirect_url
            })
            .eq('order_id', orderId)

        if (updateError) {
            console.error('Error updating topup row with snap token:', updateError)
            return Response.json({ error: 'Gagal menyimpan token transaksi' }, { status: 500 })
        }

        // Return snap_token and redirect_url
        return Response.json({
            snap_token: transaction.token,
            redirect_url: transaction.redirect_url,
            order_id: orderId
        })

    } catch (error: any) {
        console.error('Internal server error during topup creation:', error)
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}
