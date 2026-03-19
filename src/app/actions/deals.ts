'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createDeal(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const valueStr = formData.get('value') as string
  const probStr = formData.get('probability') as string
  const contactId = formData.get('contact_id') as string
  const advanceAmountStr = formData.get('advance_amount') as string
  const factorRateStr = formData.get('factor_rate') as string
  const dailyPaymentStr = formData.get('daily_payment') as string
  const positionStr = formData.get('position') as string
  const commissionRateStr = formData.get('commission_rate') as string

  const advanceAmount = advanceAmountStr ? parseFloat(advanceAmountStr) : null
  const factorRate = factorRateStr ? parseFloat(factorRateStr) : null
  const paybackAmount = advanceAmount && factorRate ? Math.round(advanceAmount * factorRate * 100) / 100 : null
  const totalPaid = 0
  const remainingBalance = paybackAmount !== null ? paybackAmount - totalPaid : null

  const dealData = {
    user_id: user.id,
    title: formData.get('title') as string,
    contact_id: contactId || null,
    value: valueStr ? parseFloat(valueStr) : null,
    stage: formData.get('stage') as string || 'Prospecting',
    probability: probStr ? parseInt(probStr) : null,
    expected_close_date: formData.get('expected_close_date') as string || null,
    description: formData.get('description') as string || null,
    // MCA fields
    advance_amount: advanceAmount,
    factor_rate: factorRate,
    payback_amount: paybackAmount,
    total_paid: totalPaid,
    remaining_balance: remainingBalance,
    daily_payment: dailyPaymentStr ? parseFloat(dailyPaymentStr) : null,
    payment_frequency: formData.get('payment_frequency') as string || 'daily',
    position: positionStr ? parseInt(positionStr) : 1,
    origination_date: formData.get('origination_date') as string || null,
    maturity_date: formData.get('maturity_date') as string || null,
    mca_status: formData.get('mca_status') as string || 'active',
    funder_name: formData.get('funder_name') as string || null,
    iso_name: formData.get('iso_name') as string || null,
    commission_rate: commissionRateStr ? parseFloat(commissionRateStr) : null,
  }

  const { data, error } = await supabase.from('deals').insert(dealData).select().single()

  if (error) throw new Error(error.message)

  revalidatePath('/deals')
  revalidatePath('/portfolio')
  redirect(`/deals/${data.id}`)
}

export async function updateDeal(id: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const valueStr = formData.get('value') as string
  const probStr = formData.get('probability') as string
  const contactId = formData.get('contact_id') as string
  const advanceAmountStr = formData.get('advance_amount') as string
  const factorRateStr = formData.get('factor_rate') as string
  const dailyPaymentStr = formData.get('daily_payment') as string
  const positionStr = formData.get('position') as string
  const commissionRateStr = formData.get('commission_rate') as string

  const advanceAmount = advanceAmountStr ? parseFloat(advanceAmountStr) : null
  const factorRate = factorRateStr ? parseFloat(factorRateStr) : null
  const paybackAmount = advanceAmount && factorRate ? Math.round(advanceAmount * factorRate * 100) / 100 : null

  // Fetch current total_paid to recalculate remaining_balance
  const { data: existingDeal } = await supabase
    .from('deals')
    .select('total_paid')
    .eq('id', id)
    .single()

  const totalPaid = Number(existingDeal?.total_paid ?? 0)
  const remainingBalance = paybackAmount !== null ? Math.max(0, paybackAmount - totalPaid) : null

  const dealData = {
    title: formData.get('title') as string,
    contact_id: contactId || null,
    value: valueStr ? parseFloat(valueStr) : null,
    stage: formData.get('stage') as string || 'Prospecting',
    probability: probStr ? parseInt(probStr) : null,
    expected_close_date: formData.get('expected_close_date') as string || null,
    description: formData.get('description') as string || null,
    // MCA fields
    advance_amount: advanceAmount,
    factor_rate: factorRate,
    payback_amount: paybackAmount,
    remaining_balance: remainingBalance,
    daily_payment: dailyPaymentStr ? parseFloat(dailyPaymentStr) : null,
    payment_frequency: formData.get('payment_frequency') as string || 'daily',
    position: positionStr ? parseInt(positionStr) : 1,
    origination_date: formData.get('origination_date') as string || null,
    maturity_date: formData.get('maturity_date') as string || null,
    mca_status: formData.get('mca_status') as string || 'active',
    funder_name: formData.get('funder_name') as string || null,
    iso_name: formData.get('iso_name') as string || null,
    commission_rate: commissionRateStr ? parseFloat(commissionRateStr) : null,
  }

  const { error } = await supabase
    .from('deals')
    .update(dealData)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath(`/deals/${id}`)
  revalidatePath('/deals')
  revalidatePath('/portfolio')
  redirect(`/deals/${id}`)
}

export async function deleteDeal(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/deals')
  revalidatePath('/portfolio')
  redirect('/deals')
}

export async function updateDealStage(id: string, stage: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('deals')
    .update({ stage })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/deals')
  revalidatePath(`/deals/${id}`)
}
