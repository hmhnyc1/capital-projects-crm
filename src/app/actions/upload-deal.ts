'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ParsedApplication, ParsedBankStatement } from '@/types'

export async function createDealFromUpload(
  application: ParsedApplication,
  statements: ParsedBankStatement[],
  dealId: string,
  filePaths: string[],
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Create merchant contact
  const merchantData = {
    user_id: user.id,
    first_name: application.owner_name?.split(' ')[0] || 'Merchant',
    last_name: application.owner_name?.split(' ').slice(1).join(' ') || '',
    company: application.business_legal_name || application.dba,
    email: application.business_email || null,
    phone: application.business_phone || null,
    address: application.business_address || null,
    ein: application.ein || null,
    owner_name: application.owner_name || null,
    monthly_revenue: application.stated_monthly_revenue || null,
    type: 'lead' as const,
    status: 'qualified' as const,
  }

  const { data: merchant, error: merchantError } = await supabase
    .from('contacts')
    .insert(merchantData)
    .select()
    .single()

  if (merchantError) throw new Error(`Failed to create merchant: ${merchantError.message}`)

  // Create deal with file paths stored in raw_data
  const dealData = {
    user_id: user.id,
    contact_id: merchant.id,
    title: `${application.business_legal_name || 'Merchant'} - MCA Deal`,
    stage: 'Prospecting' as const,
    mca_status: 'Underwriting' as const,
    advance_amount: null,
    factor_rate: null,
    payback_amount: null,
    daily_payment: null,
    origination_date: new Date().toISOString().split('T')[0],
    description: `Uploaded ${statements.length} bank statements`,
    raw_data: {
      application,
      statements,
      uploadedFilePaths: filePaths,
    },
  }

  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .insert(dealData)
    .select()
    .single()

  if (dealError) throw new Error(`Failed to create deal: ${dealError.message}`)

  revalidatePath('/deals')
  revalidatePath(`/deals/${deal.id}`)
  redirect(`/deals/${deal.id}`)
}
