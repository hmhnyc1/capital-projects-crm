'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createContact(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const contactData = {
    user_id: user.id,
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: formData.get('email') as string || null,
    phone: formData.get('phone') as string || null,
    company: formData.get('company') as string || null,
    title: formData.get('title') as string || null,
    type: formData.get('type') as string || 'lead',
    status: formData.get('status') as string || 'active',
    source: formData.get('source') as string || null,
    address: formData.get('address') as string || null,
    city: formData.get('city') as string || null,
    state: formData.get('state') as string || null,
    zip: formData.get('zip') as string || null,
    notes: formData.get('notes') as string || null,
  }

  const { data, error } = await supabase.from('contacts').insert(contactData).select().single()

  if (error) throw new Error(error.message)

  revalidatePath('/contacts')
  redirect(`/contacts/${data.id}`)
}

export async function updateContact(id: string, formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const contactData = {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    email: formData.get('email') as string || null,
    phone: formData.get('phone') as string || null,
    company: formData.get('company') as string || null,
    title: formData.get('title') as string || null,
    type: formData.get('type') as string || 'lead',
    status: formData.get('status') as string || 'active',
    source: formData.get('source') as string || null,
    address: formData.get('address') as string || null,
    city: formData.get('city') as string || null,
    state: formData.get('state') as string || null,
    zip: formData.get('zip') as string || null,
    notes: formData.get('notes') as string || null,
  }

  const { error } = await supabase
    .from('contacts')
    .update(contactData)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath(`/contacts/${id}`)
  revalidatePath('/contacts')
  redirect(`/contacts/${id}`)
}

export async function deleteContact(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/contacts')
  redirect('/contacts')
}
