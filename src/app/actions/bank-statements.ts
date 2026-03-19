'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export interface ParsedTransaction {
  transaction_date: string | null
  description: string | null
  amount: number | null
  transaction_type: 'credit' | 'debit' | null
  balance: number | null
  is_nsf: boolean
}

export interface StatementStats {
  total_deposits: number
  total_withdrawals: number
  average_daily_balance: number
  nsf_count: number
  ending_balance: number | null
  largest_deposit: number
  transaction_count: number
}

export async function createBankStatement(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const contactId = formData.get('contact_id') as string
  const fileName = formData.get('file_name') as string
  const monthStr = formData.get('statement_month') as string
  const yearStr = formData.get('statement_year') as string
  const analysisNotes = formData.get('analysis_notes') as string || null
  const transactionsJson = formData.get('transactions_json') as string
  const statsJson = formData.get('stats_json') as string

  const transactions: ParsedTransaction[] = transactionsJson ? JSON.parse(transactionsJson) : []
  const stats: StatementStats = statsJson ? JSON.parse(statsJson) : {
    total_deposits: 0,
    total_withdrawals: 0,
    average_daily_balance: 0,
    nsf_count: 0,
    ending_balance: null,
    largest_deposit: 0,
    transaction_count: 0,
  }

  const statementData = {
    user_id: user.id,
    contact_id: contactId,
    file_name: fileName,
    statement_month: monthStr ? parseInt(monthStr) : null,
    statement_year: yearStr ? parseInt(yearStr) : null,
    total_deposits: stats.total_deposits,
    total_withdrawals: stats.total_withdrawals,
    average_daily_balance: stats.average_daily_balance,
    nsf_count: stats.nsf_count,
    ending_balance: stats.ending_balance,
    largest_deposit: stats.largest_deposit,
    transaction_count: stats.transaction_count,
    analysis_notes: analysisNotes,
    raw_data: transactions,
  }

  const { data: statement, error: stmtError } = await supabase
    .from('bank_statements')
    .insert(statementData)
    .select()
    .single()

  if (stmtError) throw new Error(stmtError.message)

  // Insert transactions
  if (transactions.length > 0) {
    const txRows = transactions.map(tx => ({
      statement_id: statement.id,
      user_id: user.id,
      transaction_date: tx.transaction_date,
      description: tx.description,
      amount: tx.amount,
      transaction_type: tx.transaction_type,
      balance: tx.balance,
      is_nsf: tx.is_nsf,
    }))

    const { error: txError } = await supabase.from('bank_transactions').insert(txRows)
    if (txError) throw new Error(txError.message)
  }

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
