'use server'

import { createClient } from '@/lib/supabase/server'
import type { ParsedApplication, ParsedBankStatement } from '@/types'

// Generate a unique job ID
function generateJobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Stage 1: Save application data
export async function saveParsedApplication(
  application: ParsedApplication
): Promise<{ applicationId: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('temp_parsed_applications')
    .insert({
      user_id: user.id,
      business_legal_name: application.business_legal_name,
      dba: application.dba,
      owner_name: application.owner_name,
      owner_dob: application.owner_dob,
      owner_ssn_last4: application.owner_ssn_last4,
      business_address: application.business_address,
      business_phone: application.business_phone,
      business_email: application.business_email,
      ein: application.ein,
      entity_type: application.entity_type,
      ownership_percentage: application.ownership_percentage,
      industry: application.industry,
      stated_monthly_revenue: application.stated_monthly_revenue,
      bank_name: application.bank_name,
      account_type: application.account_type,
      landlord_name: application.landlord_name,
      monthly_rent: application.monthly_rent,
      use_of_funds: application.use_of_funds,
      time_in_business_years: application.time_in_business_years,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save application: ${error.message}`)
  if (!data) throw new Error('No data returned after saving application')

  console.log('[save-parsed-data] ✅ Application saved with ID:', data.id)
  return { applicationId: data.id }
}

// Stage 2: Save bank statement data
export async function saveParsedBankStatement(
  statement: ParsedBankStatement
): Promise<{ statementId: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('temp_parsed_bank_statements')
    .insert({
      user_id: user.id,
      statement_period_text: statement.statement_period_text,
      statement_month: statement.statement_month,
      statement_year: statement.statement_year,
      statement_start_date: statement.statement_start_date,
      statement_end_date: statement.statement_end_date,
      starting_balance: statement.starting_balance,
      ending_balance: statement.ending_balance,
      average_daily_balance: statement.average_daily_balance,
      lowest_daily_balance: statement.lowest_daily_balance,
      total_deposits: statement.total_deposits,
      true_revenue_deposits: statement.true_revenue_deposits,
      non_revenue_deposits: statement.non_revenue_deposits,
      nsf_count: statement.nsf_count,
      nsf_dates: statement.nsf_dates,
      nsf_amounts: statement.nsf_amounts,
      mca_debits: statement.mca_debits || null,
      total_mca_holdback: statement.total_mca_holdback,
      holdback_percentage: statement.holdback_percentage,
      net_cash_flow_after_mca: statement.net_cash_flow_after_mca,
      days_below_500: statement.days_below_500,
      days_below_1000: statement.days_below_1000,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to save bank statement: ${error.message}`)
  if (!data) throw new Error('No data returned after saving bank statement')

  console.log('[save-parsed-data] ✅ Bank statement saved with ID:', data.id)
  return { statementId: data.id }
}

// Stage 3: Create parsing job
export async function createParsingJob(
  applicationId: string,
  statementIds: string[]
): Promise<{ jobId: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const jobId = generateJobId()

  const { data, error } = await supabase
    .from('parsing_jobs')
    .insert({
      user_id: user.id,
      job_id: jobId,
      status: 'parsed',
      application_id: applicationId,
      bank_statement_ids: statementIds,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create parsing job: ${error.message}`)
  if (!data) throw new Error('No data returned after creating job')

  console.log('[save-parsed-data] ✅ Parsing job created with ID:', jobId)
  return { jobId }
}

// Helper: Fetch all data for a job
export async function getParsingJobData(jobId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  console.log('[save-parsed-data] 📦 Fetching job data for:', jobId)

  // Get job
  const { data: job, error: jobError } = await supabase
    .from('parsing_jobs')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', user.id)
    .single()

  if (jobError) throw new Error(`Job not found: ${jobError.message}`)
  if (!job) throw new Error('Job not found')
  if (job.status !== 'parsed') throw new Error(`Job status is ${job.status}, expected 'parsed'`)

  // Get application
  const { data: application, error: appError } = await supabase
    .from('temp_parsed_applications')
    .select('*')
    .eq('id', job.application_id)
    .single()

  if (appError) throw new Error(`Application not found: ${appError.message}`)

  // Get bank statements
  const { data: statements, error: stmtError } = await supabase
    .from('temp_parsed_bank_statements')
    .select('*')
    .in('id', job.bank_statement_ids || [])
    .order('statement_year', { ascending: true })
    .order('statement_month', { ascending: true })

  if (stmtError) throw new Error(`Bank statements not found: ${stmtError.message}`)

  console.log('[save-parsed-data] ✅ Retrieved job data: 1 application, ' + (statements?.length || 0) + ' statements')

  return {
    job,
    application,
    statements: statements || [],
  }
}

// Cleanup: Delete old parsed data (called after deal creation)
export async function cleanupParsingJob(jobId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: job } = await supabase
    .from('parsing_jobs')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', user.id)
    .single()

  if (!job) return

  // Delete temp data
  await supabase.from('temp_parsed_applications').delete().eq('id', job.application_id)
  if (job.bank_statement_ids?.length) {
    await supabase.from('temp_parsed_bank_statements').delete().in('id', job.bank_statement_ids)
  }
  await supabase.from('parsing_jobs').delete().eq('job_id', jobId)

  console.log('[save-parsed-data] 🗑️ Cleaned up parsing job:', jobId)
}
