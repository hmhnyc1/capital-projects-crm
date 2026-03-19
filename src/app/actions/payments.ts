'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createPayment(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dealId = formData.get('deal_id') as string
  const amountStr = formData.get('amount') as string
  const amount = parseFloat(amountStr)

  const paymentData = {
    user_id: user.id,
    deal_id: dealId,
    amount,
    payment_date: formData.get('payment_date') as string,
    status: formData.get('status') as string || 'completed',
    payment_type: formData.get('payment_type') as string || 'ach',
    notes: formData.get('notes') as string || null,
  }

  const { error: paymentError } = await supabase.from('payments').insert(paymentData)
  if (paymentError) throw new Error(paymentError.message)

  // Update deal's total_paid and remaining_balance
  const { data: deal } = await supabase
    .from('deals')
    .select('total_paid, payback_amount')
    .eq('id', dealId)
    .single()

  if (deal) {
    const status = paymentData.status
    // Only count completed payments toward total_paid
    if (status === 'completed') {
      const newTotalPaid = (Number(deal.total_paid) || 0) + amount
      const newRemaining = deal.payback_amount
        ? Math.max(0, Number(deal.payback_amount) - newTotalPaid)
        : null
      const newMcaStatus = newRemaining !== null && newRemaining <= 0 ? 'paid_off' : undefined

      await supabase
        .from('deals')
        .update({
          total_paid: newTotalPaid,
          remaining_balance: newRemaining,
          ...(newMcaStatus ? { mca_status: newMcaStatus } : {}),
        })
        .eq('id', dealId)
    }
  }

  revalidatePath('/payments')
  revalidatePath('/portfolio')
  revalidatePath(`/deals/${dealId}`)
  redirect('/payments')
}

export async function deletePayment(id: string, dealId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get payment details before deleting
  const { data: payment } = await supabase
    .from('payments')
    .select('amount, status, deal_id')
    .eq('id', id)
    .single()

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  // Recalculate total_paid and remaining_balance from remaining payments
  if (payment && payment.status === 'completed') {
    const { data: remainingPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('deal_id', payment.deal_id)
      .eq('status', 'completed')

    const newTotalPaid = (remainingPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

    const { data: deal } = await supabase
      .from('deals')
      .select('payback_amount')
      .eq('id', payment.deal_id)
      .single()

    const newRemaining = deal?.payback_amount
      ? Math.max(0, Number(deal.payback_amount) - newTotalPaid)
      : null

    await supabase
      .from('deals')
      .update({
        total_paid: newTotalPaid,
        remaining_balance: newRemaining,
      })
      .eq('id', payment.deal_id)
  }

  revalidatePath('/payments')
  revalidatePath('/portfolio')
  revalidatePath(`/deals/${dealId}`)
}
