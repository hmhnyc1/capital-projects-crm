'use server'

import { createClient } from '@/lib/supabase/server'
import type { ParsedApplication, ParsedBankStatement } from '@/types'

// Generate a unique job ID
function generateJobId(): string {
  return `job-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Unified: Save all parsed data (application + bank statements) to single record
export async function saveParsedData(
  application: ParsedApplication,
  statements: ParsedBankStatement[]
): Promise<{ jobId: string }> {
  console.log('[save-parsed-data] 🔍 Starting...')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[save-parsed-data] ❌ Unauthorized')
    throw new Error('Unauthorized')
  }

  const jobId = generateJobId()
  console.log('[save-parsed-data] 📝 Saving parsed data with jobId:', jobId)

  const { data, error } = await supabase
    .from('temp_parsed_applications')
    .insert({
      job_id: jobId,
      application_data: application,
      bank_statements_data: statements,
      status: 'parsed',
    })
    .select()
    .single()

  if (error) {
    console.error('[save-parsed-data] ❌ Failed to save:', error.message)
    throw new Error(`Failed to save parsed data: ${error.message}`)
  }
  if (!data) {
    console.error('[save-parsed-data] ❌ No data returned')
    throw new Error('No data returned after saving parsed data')
  }

  console.log('[save-parsed-data] ✅ Parsed data saved successfully!')
  console.log('[save-parsed-data] ✅ jobId:', jobId)
  return { jobId }
}

// Helper: Fetch all data for a job
export async function getParsingJobData(jobId: string) {
  console.log('[save-parsed-data] 📦 Fetching job data for:', jobId)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('[save-parsed-data] ❌ Unauthorized')
    throw new Error('Unauthorized')
  }

  // Get the record with all data
  const { data: record, error: recordError } = await supabase
    .from('temp_parsed_applications')
    .select('*')
    .eq('job_id', jobId)
    .single()

  if (recordError) {
    console.error('[save-parsed-data] ❌ Record not found:', recordError.message)
    throw new Error(`Record not found: ${recordError.message}`)
  }
  if (!record) {
    console.error('[save-parsed-data] ❌ No record found for jobId:', jobId)
    throw new Error('Record not found')
  }
  if (record.status !== 'parsed') {
    console.error('[save-parsed-data] ❌ Invalid status:', record.status)
    throw new Error(`Invalid status: ${record.status}`)
  }

  const application = record.application_data as ParsedApplication
  const statements = record.bank_statements_data as ParsedBankStatement[]

  console.log('[save-parsed-data] ✅ Retrieved job data: 1 application, ' + (statements?.length || 0) + ' statements')

  return {
    jobId,
    application,
    statements: statements || [],
  }
}

// Cleanup: Delete old parsed data (called after deal creation)
export async function cleanupParsingJob(jobId: string) {
  console.log('[save-parsed-data] 🗑️ Cleaning up jobId:', jobId)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('temp_parsed_applications')
    .delete()
    .eq('job_id', jobId)

  if (error) {
    console.error('[save-parsed-data] ⚠️ Cleanup failed:', error.message)
  } else {
    console.log('[save-parsed-data] ✅ Cleanup complete')
  }
}
