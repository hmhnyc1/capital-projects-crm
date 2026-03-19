'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createActivity(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const contactId = formData.get('contact_id') as string
  const dealId = formData.get('deal_id') as string
  const dueDate = formData.get('due_date') as string

  const activityData = {
    user_id: user.id,
    contact_id: contactId || null,
    deal_id: dealId || null,
    type: formData.get('type') as string || 'note',
    title: formData.get('title') as string,
    content: formData.get('content') as string || null,
    due_date: dueDate || null,
    completed: false,
  }

  const { error } = await supabase.from('activities').insert(activityData)

  if (error) throw new Error(error.message)

  revalidatePath('/activities')
  if (contactId) revalidatePath(`/contacts/${contactId}`)
  if (dealId) revalidatePath(`/deals/${dealId}`)

  redirect('/activities')
}

export async function updateActivity(id: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const contactId = formData.get('contact_id') as string
  const dealId = formData.get('deal_id') as string
  const dueDate = formData.get('due_date') as string

  const activityData = {
    contact_id: contactId || null,
    deal_id: dealId || null,
    type: formData.get('type') as string || 'note',
    title: formData.get('title') as string,
    content: formData.get('content') as string || null,
    due_date: dueDate || null,
  }

  const { error } = await supabase
    .from('activities')
    .update(activityData)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/activities')
  redirect('/activities')
}

export async function toggleActivityComplete(id: string, completed: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('activities')
    .update({ completed: !completed })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/activities')
}

export async function deleteActivity(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/activities')
  redirect('/activities')
}
