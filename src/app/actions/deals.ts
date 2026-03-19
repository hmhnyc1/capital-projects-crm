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

  const dealData = {
    user_id: user.id,
    title: formData.get('title') as string,
    contact_id: contactId || null,
    value: valueStr ? parseFloat(valueStr) : null,
    stage: formData.get('stage') as string || 'Prospecting',
    probability: probStr ? parseInt(probStr) : null,
    expected_close_date: formData.get('expected_close_date') as string || null,
    description: formData.get('description') as string || null,
  }

  const { data, error } = await supabase.from('deals').insert(dealData).select().single()

  if (error) throw new Error(error.message)

  revalidatePath('/deals')
  redirect(`/deals/${data.id}`)
}

export async function updateDeal(id: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const valueStr = formData.get('value') as string
  const probStr = formData.get('probability') as string
  const contactId = formData.get('contact_id') as string

  const dealData = {
    title: formData.get('title') as string,
    contact_id: contactId || null,
    value: valueStr ? parseFloat(valueStr) : null,
    stage: formData.get('stage') as string || 'Prospecting',
    probability: probStr ? parseInt(probStr) : null,
    expected_close_date: formData.get('expected_close_date') as string || null,
    description: formData.get('description') as string || null,
  }

  const { error } = await supabase
    .from('deals')
    .update(dealData)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath(`/deals/${id}`)
  revalidatePath('/deals')
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
