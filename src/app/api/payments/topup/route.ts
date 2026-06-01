import { createClient } from '@supabase/supabase-js'
import { Xendit } from 'xendit-node'

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

        // 2. Request Xendit Invoice
        const secretKey = process.env.XENDIT_SECRET_KEY
        if (!secretKey) {
            console.error('XENDIT_SECRET_KEY environment variable is not defined')
            return Response.json({ error: 'Konfigurasi server pembayaran tidak tersedia' }, { status: 500 })
        }

        const xenditClient = new Xendit({ secretKey })
        const { Invoice } = xenditClient

        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const referer = req.headers.get('referer')
        
        let returnUrl = `${origin}/creator/wallet` // Safe default fallback
        if (referer) {
            try {
                const refererUrl = new URL(referer)
                returnUrl = `${refererUrl.origin}${refererUrl.pathname}`
            } catch (e) {
                console.error('Error parsing referer URL:', e)
            }
        }
        
        let invoice
        try {
            invoice = await Invoice.createInvoice({
                data: {
                    amount,
                    externalId: orderId,
                    description: `Top up Saldo Voca - ${orderId}`,
                    currency: 'IDR',
                    payerEmail: user.email || undefined,
                    successRedirectUrl: `${returnUrl}?status=success`,
                    failureRedirectUrl: `${returnUrl}?status=failed`,
                }
            })
        } catch (xenditError: any) {
            console.error('Xendit API error:', xenditError)
            // Update topup status to failed
            await supabase
                .from('topups')
                .update({ status: 'failed' })
                .eq('order_id', orderId)

            return Response.json({ error: 'Gagal menghubungi payment gateway' }, { status: 500 })
        }

        // 3. Save the invoice ID and redirect URL returned from Xendit into the topups row
        const { error: updateError } = await supabase
            .from('topups')
            .update({
                snap_token: invoice.id,
                redirect_url: invoice.invoiceUrl
            })
            .eq('order_id', orderId)

        if (updateError) {
            console.error('Error updating topup row with Xendit invoice details:', updateError)
            return Response.json({ error: 'Gagal menyimpan token transaksi' }, { status: 500 })
        }

        // Return snap_token (invoice ID) and redirect_url
        return Response.json({
            snap_token: invoice.id,
            redirect_url: invoice.invoiceUrl,
            order_id: orderId
        })

    } catch (error: any) {
        console.error('Internal server error during topup creation:', error)
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}
