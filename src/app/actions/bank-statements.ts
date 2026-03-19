'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createBankStatement(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const contactId = formData.get('contact_id') as string
  const fileName = formData.get('file_name') as string
  const monthStr = formData.get('statement_month') as string
  const yearStr = formData.get('statement_year') as string
  const analysisNotes = formData.get('analysis_notes') as string || null
  const analysisJson = formData.get('analysis_json') as string

  const analysis = analysisJson ? JSON.parse(analysisJson) : {}

  const statementData = {
    user_id: user.id,
    contact_id: contactId,
    file_name: fileName,
    statement_month: monthStr && monthStr !== 'null' ? parseInt(monthStr) : (analysis.statement_month ?? null),
    statement_year: yearStr && yearStr !== 'null' ? parseInt(yearStr) : (analysis.statement_year ?? null),
    total_deposits: analysis.total_deposits ?? 0,
    total_withdrawals: analysis.total_withdrawals ?? 0,
    average_daily_balance: analysis.average_daily_balance ?? null,
    nsf_count: analysis.nsf_count ?? 0,
    ending_balance: analysis.ending_balance != null ? analysis.ending_balance : null,
    largest_deposit: analysis.largest_single_deposit != null ? analysis.largest_single_deposit : null,
    transaction_count: (analysis.deposit_count || 0) + (analysis.withdrawal_count || 0),
    analysis_notes: analysisNotes,
    raw_data: analysis,
  }

  const { data: statement, error: stmtError } = await supabase
    .from('bank_statements')
    .insert(statementData)
    .select()
    .single()

  if (stmtError) throw new Error(stmtError.message)

  revalidatePath('/bank-statements')
  revalidatePath(`/contacts/${contactId}`)
  redirect(`/bank-statements/${statement.id}`)
}

export async function deleteBankStatement(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('bank_statements')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(error.message)

  revalidatePath('/bank-statements')
  redirect('/bank-statements')
}
