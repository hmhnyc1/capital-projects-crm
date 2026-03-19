'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ParsedApplication, ParsedBankStatement } from '@/types'

function generateDealNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `DEAL-${timestamp}-${random}`
}

function calculateRiskMetrics(application: ParsedApplication, statements: ParsedBankStatement[]) {
  const flags: Array<{ severity: 'high' | 'medium' | 'low'; message: string; value: string }> = []
  let score = 0

  if (application?.stated_monthly_revenue && application.stated_monthly_revenue < 10000) {
    flags.push({ severity: 'medium', message: 'Low stated monthly revenue', value: application.stated_monthly_revenue.toString() })
    score += 15
  }

  if (!application?.time_in_business_years || application.time_in_business_years < 2) {
    flags.push({ severity: 'medium', message: 'Business less than 2 years old', value: (application?.time_in_business_years || 0).toString() })
    score += 20
  }

  const totalNsf = statements.reduce((sum, s) => sum + s.nsf_count, 0)
  if (totalNsf > 3) {
    flags.push({ severity: 'high', message: `${totalNsf} NSF events detected`, value: totalNsf.toString() })
    score += 30
  }

  const avgAdb = statements.length > 0
    ? statements.reduce((sum, s) => sum + (s.average_daily_balance || 0), 0) / statements.length
    : 0
  if (avgAdb < 1000) {
    flags.push({ severity: 'high', message: 'Average daily balance below $1,000', value: avgAdb.toString() })
    score += 25
  }

  const avgHoldback = statements.length > 0
    ? statements.reduce((sum, s) => sum + s.holdback_percentage, 0) / statements.length
    : 0
  if (avgHoldback > 15) {
    flags.push({ severity: 'high', message: `High MCA holdback (${avgHoldback.toFixed(1)}%)`, value: avgHoldback.toString() })
    score += 20
  }

  const lenders = new Set<string>()
  statements.forEach(s => {
    s.mca_debits?.forEach(d => lenders.add(d.funder_name))
  })
  if (lenders.size > 1) {
    flags.push({ severity: 'high', message: `Multiple MCA lenders (${lenders.size})`, value: lenders.size.toString() })
    score += 25
  }

  if (statements.length > 1) {
    const revenues = statements.map(s => s.true_revenue_deposits)
    const lastRev = revenues[revenues.length - 1]
    const firstRev = revenues[0]
    if (lastRev < firstRev * 0.8) {
      flags.push({ severity: 'medium', message: 'Declining revenue trend', value: ((lastRev - firstRev) / firstRev * 100).toFixed(1) })
      score += 15
    }
  }

  score = Math.min(score, 100)
  const riskGrade = score < 35 ? 'A' : score < 50 ? 'B' : score < 65 ? 'C' : score < 80 ? 'D' : score < 95 ? 'E' : 'F'

  let baseAdvance = statements.length > 0
    ? (statements.reduce((sum, s) => sum + s.true_revenue_deposits, 0) / statements.length) * 0.1
    : 0

  const mediumFlags = flags.filter(f => f.severity === 'medium').length
  const highFlags = flags.filter(f => f.severity === 'high').length
  baseAdvance *= (1 - mediumFlags * 0.05 - highFlags * 0.15)
  baseAdvance = Math.max(baseAdvance, 0)

  return { score, riskGrade, flags, recommendedAdvance: Math.round(baseAdvance / 500) * 500 }
}

// Stage 1: Create contact and deal
export async function createContact(
  application: ParsedApplication
) {
  console.log('[createContact] 🔍 Starting...')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[createContact] 👤 Auth user:', user?.id)
  if (!user) {
    console.error('[createContact] ❌ No authenticated user found')
    redirect('/login')
  }

  const merchantData = {
    user_id: user.id,
    first_name: application.owner_name?.split(' ')[0] || 'Merchant',
    last_name: application.owner_name?.split(' ').slice(1).join(' ') || '',
    company: application.business_legal_name || application.dba,
    email: application.business_email || null,
    phone: application.business_phone || null,
    address: application.business_address || null,
    business_legal_name: application.business_legal_name || null,
    dba: application.dba || null,
    entity_type: application.entity_type || null,
    owner_dob: application.owner_dob || null,
    owner_ssn_last4: application.owner_ssn_last4 || null,
    ownership_percentage: application.ownership_percentage || null,
    industry: application.industry || null,
    ein: application.ein || null,
    stated_monthly_revenue: application.stated_monthly_revenue || null,
    bank_name: application.bank_name || null,
    account_type: application.account_type || null,
    landlord_name: application.landlord_name || null,
    monthly_rent: application.monthly_rent || null,
    use_of_funds: application.use_of_funds || null,
    time_in_business_years: application.time_in_business_years || null,
    type: 'lead' as const,
    status: 'qualified' as const,
  }

  console.log('[createContact] 📝 Inserting merchant:', {
    company: merchantData.company,
    owner: merchantData.first_name + ' ' + merchantData.last_name,
    ein: merchantData.ein,
  })

  const { data: merchant, error: merchantError } = await supabase
    .from('contacts')
    .insert(merchantData)
    .select()
    .single()

  console.log('[createContact] Response:', { merchantError, merchantId: merchant?.id })
  if (merchantError) {
    console.error('[createContact] ❌ Error creating contact:', merchantError.message)
    throw new Error(`Failed to create contact: ${merchantError.message}`)
  }
  console.log('[createContact] ✅ Contact created:', merchant.id)
  return merchant
}

// Stage 2: Create deal with summary data
export async function createDeal(
  application: ParsedApplication,
  statements: ParsedBankStatement[],
  merchantId: string,
  position: 'approved' | 'declined' | 'counter' | 'review',
  customTerms?: { advanceAmount: number; factorRate: number; termDays: number }
) {
  console.log('[createDeal] 🔍 Starting...')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[createDeal] 👤 Auth user:', user?.id)
  if (!user) {
    console.error('[createDeal] ❌ No authenticated user found')
    redirect('/login')
  }

  console.log('[createDeal] 📊 Calculating risk metrics...')
  const riskMetrics = calculateRiskMetrics(application, statements)
  console.log('[createDeal] 📊 Risk metrics calculated:', {
    score: riskMetrics.score,
    grade: riskMetrics.riskGrade,
    flags: riskMetrics.flags.length,
  })

  const avgMonthlyRevenue = statements.length > 0
    ? statements.reduce((sum, s) => sum + s.true_revenue_deposits, 0) / statements.length
    : 0

  const avgAdb = statements.length > 0
    ? statements.reduce((sum, s) => sum + (s.average_daily_balance || 0), 0) / statements.length
    : 0

  const totalNsf = statements.reduce((sum, s) => sum + s.nsf_count, 0)
  const avgHoldback = statements.length > 0
    ? statements.reduce((sum, s) => sum + s.holdback_percentage, 0) / statements.length
    : 0

  const revenues = statements.map(s => s.true_revenue_deposits)
  const revenueTrend = revenues.length < 2 ? 'Flat'
    : revenues[revenues.length - 1] > revenues[0] ? 'Growing'
    : revenues[revenues.length - 1] < revenues[0] ? 'Declining'
    : 'Flat'

  // Generate executive summary
  const executiveSummary = `${application.business_legal_name} is a ${application.entity_type?.toLowerCase() || 'business'} in the ${application.industry || 'retail'} industry, owned by ${application.owner_name} with ${application.time_in_business_years} years in business. The merchant reports ${application.stated_monthly_revenue?.toLocaleString() || 'undisclosed'} in monthly revenue, though bank analysis shows ${avgMonthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} average true revenue across ${statements.length} months. The merchant has an average daily balance of ${avgAdb.toLocaleString(undefined, { maximumFractionDigits: 0 })} and ${totalNsf} NSF events. ${avgHoldback > 0 ? `Current MCA obligations represent ${avgHoldback.toFixed(1)}% holdback on revenue.` : 'No active MCA positions identified.'} Risk assessment: ${riskMetrics.riskGrade === 'A' ? 'LOW - Strong approval candidate' : riskMetrics.riskGrade === 'B' ? 'LOW-MEDIUM - Review carefully' : riskMetrics.riskGrade === 'C' ? 'MEDIUM - Counter-offer recommended' : 'HIGH - Decline or significant restructuring required'}.`

  // Create deal
  const dealNumber = generateDealNumber()
  const dealData = {
    user_id: user.id,
    contact_id: merchantId,
    merchant_id: merchantId,
    deal_number: dealNumber,
    title: `${application.business_legal_name} - MCA Deal`,
    stage: 'Prospecting' as const,
    mca_status: 'Underwriting' as const,
    status: position === 'approved' ? 'Approved' : position === 'declined' ? 'Declined' : position === 'counter' ? 'Counter' : 'Under Review',
    position_recommendation: position.charAt(0).toUpperCase() + position.slice(1),
    date_uploaded: new Date().toISOString().split('T')[0],
    risk_score: riskMetrics.score,
    risk_grade: riskMetrics.riskGrade,
    executive_summary: executiveSummary,
    average_monthly_true_revenue: avgMonthlyRevenue,
    revenue_trend: revenueTrend,
    average_daily_balance_all_months: avgAdb,
    total_nsfs_all_months: totalNsf,
    average_holdback_percentage: avgHoldback,
    date_range_start: statements[0]?.statement_start_date || null,
    date_range_end: statements[statements.length - 1]?.statement_end_date || null,
    total_months_analyzed: statements.length,
    recommended_max_advance: customTerms?.advanceAmount || riskMetrics.recommendedAdvance,
    recommended_factor_rate_min: 1.2,
    recommended_factor_rate_max: 1.45,
    recommended_term_days: customTerms?.termDays || 150,
    recommended_daily_debit: customTerms
      ? (customTerms.advanceAmount * customTerms.factorRate) / customTerms.termDays
      : (riskMetrics.recommendedAdvance / 150),
    description: `Uploaded ${statements.length} bank statements for underwriting analysis`,
    advance_amount: customTerms?.advanceAmount || riskMetrics.recommendedAdvance,
    factor_rate: customTerms?.factorRate || 1.3,
    daily_payment: customTerms
      ? (customTerms.advanceAmount * customTerms.factorRate) / customTerms.termDays
      : (riskMetrics.recommendedAdvance / 150),
    origination_date: new Date().toISOString().split('T')[0],
  }

  console.log('[createDeal] 📝 Inserting deal:', {
    title: dealData.title,
    dealNumber: dealData.deal_number,
    contactId: dealData.contact_id,
    status: dealData.status,
  })

  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .insert(dealData)
    .select()
    .single()

  console.log('[createDeal] Response:', { dealError, dealId: deal?.id })
  if (dealError) {
    console.error('[createDeal] ❌ Error creating deal:', dealError.message)
    throw new Error(`Failed to create deal: ${dealError.message}`)
  }
  console.log('[createDeal] ✅ Deal created:', deal.id)
  return { deal, riskMetrics }
}

// Stage 3: Save bank statements one at a time
export async function saveBankStatements(
  statements: ParsedBankStatement[],
  dealId: string,
  merchantId: string
) {
  console.log('[saveBankStatements] 🔍 Starting...')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[saveBankStatements] 👤 Auth user:', user?.id)
  if (!user) {
    console.error('[saveBankStatements] ❌ No authenticated user found')
    redirect('/login')
  }

  console.log('[saveBankStatements] 📝 Saving', statements.length, 'statements...')

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    console.log(`[saveBankStatements] 📊 Statement ${i + 1}/${statements.length}:`, {
      month: statement.statement_month,
      year: statement.statement_year,
      revenue: statement.true_revenue_deposits,
    })

    const { error: stmtError } = await supabase
      .from('bank_statements_detailed')
      .insert({
        user_id: user.id,
        deal_id: dealId,
        merchant_id: merchantId,
        statement_month: statement.statement_month,
        statement_year: statement.statement_year,
        statement_period_start: statement.statement_start_date,
        statement_period_end: statement.statement_end_date,
        starting_balance: statement.starting_balance,
        ending_balance: statement.ending_balance,
        total_deposits: statement.total_deposits,
        true_revenue: statement.true_revenue_deposits,
        non_revenue_deposits: statement.non_revenue_deposits,
        average_daily_balance: statement.average_daily_balance,
        lowest_daily_balance: statement.lowest_daily_balance,
        days_below_500: statement.days_below_500,
        days_below_1000: statement.days_below_1000,
        nsf_count: statement.nsf_count,
        nsf_dates: statement.nsf_dates,
        nsf_amounts: statement.nsf_amounts,
        nsf_total: statement.nsf_amounts?.reduce((sum: number, a: number) => sum + a, 0) || 0,
        total_mca_holdback: statement.total_mca_holdback,
        holdback_percentage: statement.holdback_percentage,
        net_cash_flow: statement.net_cash_flow_after_mca,
        model_used: 'claude-haiku-4-5-20251001',
      })

    if (stmtError) {
      console.error(`[saveBankStatements] ❌ Failed to save statement ${i + 1}:`, stmtError.message)
    } else {
      console.log(`[saveBankStatements] ✅ Statement ${i + 1} saved`)
    }
  }
  console.log('[saveBankStatements] ✅ All bank statements saved')
}

// Stage 4: Save MCA positions
export async function saveMCAPositions(
  statements: ParsedBankStatement[],
  dealId: string,
  merchantId: string
) {
  console.log('[saveMCAPositions] 🔍 Starting...')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[saveMCAPositions] 👤 Auth user:', user?.id)
  if (!user) {
    console.error('[saveMCAPositions] ❌ No authenticated user found')
    redirect('/login')
  }

  const lenderMap: Record<string, { first: string; last: string; daily: number }> = {}
  statements.forEach((s) => {
    const month = `${s.statement_year}-${String(s.statement_month).padStart(2, '0')}`
    s.mca_debits?.forEach(d => {
      if (!lenderMap[d.funder_name]) {
        lenderMap[d.funder_name] = { first: month, last: month, daily: d.daily_debit_amount || 0 }
      } else {
        lenderMap[d.funder_name].last = month
      }
    })
  })

  console.log('[saveMCAPositions] 📊 Found', Object.keys(lenderMap).length, 'unique lenders')

  for (const [funderName, info] of Object.entries(lenderMap)) {
    console.log(`[saveMCAPositions] 📝 Saving MCA position: ${funderName} (daily: $${info.daily})`)
    const { error: mcaError } = await supabase
      .from('mca_positions_detailed')
      .insert({
        user_id: user.id,
        deal_id: dealId,
        merchant_id: merchantId,
        funder_name: funderName,
        daily_debit_amount: info.daily,
        weekly_amount: info.daily * 7,
        monthly_total: info.daily * 30,
        first_seen_month: info.first,
        last_seen_month: info.last,
        status: 'active',
      })

    if (mcaError) {
      console.error(`[saveMCAPositions] ❌ Failed to save MCA position ${funderName}:`, mcaError.message)
    } else {
      console.log(`[saveMCAPositions] ✅ MCA position ${funderName} saved`)
    }
  }
  console.log('[saveMCAPositions] ✅ All MCA positions saved')
}

// Stage 5: Save risk assessment (scorecard and flags)
export async function saveRiskAssessment(
  application: ParsedApplication,
  statements: ParsedBankStatement[],
  riskMetrics: ReturnType<typeof calculateRiskMetrics>,
  dealId: string,
  position: 'approved' | 'declined' | 'counter' | 'review',
  customTerms?: { advanceAmount: number; factorRate: number; termDays: number }
) {
  console.log('[saveRiskAssessment] 🔍 Starting...')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[saveRiskAssessment] 👤 Auth user:', user?.id)
  if (!user) {
    console.error('[saveRiskAssessment] ❌ No authenticated user found')
    redirect('/login')
  }

  const avgMonthlyRevenue = statements.length > 0
    ? statements.reduce((sum, s) => sum + s.true_revenue_deposits, 0) / statements.length
    : 0

  const avgAdb = statements.length > 0
    ? statements.reduce((sum, s) => sum + (s.average_daily_balance || 0), 0) / statements.length
    : 0

  const totalNsf = statements.reduce((sum, s) => sum + s.nsf_count, 0)
  const avgHoldback = statements.length > 0
    ? statements.reduce((sum, s) => sum + s.holdback_percentage, 0) / statements.length
    : 0

  const revenues = statements.map(s => s.true_revenue_deposits)
  const revenueTrend = revenues.length < 2 ? 'Flat'
    : revenues[revenues.length - 1] > revenues[0] ? 'Growing'
    : revenues[revenues.length - 1] < revenues[0] ? 'Declining'
    : 'Flat'

  // Get lender count
  const lenderSet = new Set<string>()
  statements.forEach(s => {
    s.mca_debits?.forEach(d => lenderSet.add(d.funder_name))
  })

  const adbScore = Math.max(0, Math.min(100, (avgAdb / 10000) * 100))
  const nsfScore = Math.max(0, 100 - totalNsf * 20)
  const mcaStackScore = Math.max(0, 100 - lenderSet.size * 25)
  const timeInBusinessScore = Math.min(100, (application.time_in_business_years || 0) * 25)

  // Save scorecard
  console.log('[saveRiskAssessment] 📝 Saving scorecard...')
  const { error: scorecardError } = await supabase
    .from('underwriting_scorecards_detailed')
    .insert({
      user_id: user.id,
      deal_id: dealId,
      overall_score: riskMetrics.score,
      risk_grade: riskMetrics.riskGrade,
      adb_score: Math.round(adbScore),
      adb_value: avgAdb,
      revenue_consistency_score: 75,
      nsf_score: Math.round(nsfScore),
      nsf_count: totalNsf,
      mca_stack_score: Math.round(mcaStackScore),
      holdback_percentage: avgHoldback,
      revenue_trend_score: revenueTrend === 'Growing' ? 85 : revenueTrend === 'Declining' ? 45 : 65,
      revenue_trend_direction: revenueTrend as 'Growing' | 'Declining' | 'Flat',
      revenue_trend_percentage: statements.length > 1 ? ((revenues[revenues.length - 1] - revenues[0]) / revenues[0] * 100) : 0,
      time_in_business_score: timeInBusinessScore,
      stated_vs_actual_score: 100 - Math.abs((application.stated_monthly_revenue || avgMonthlyRevenue) - avgMonthlyRevenue) / avgMonthlyRevenue * 100,
      stated_revenue: application.stated_monthly_revenue || null,
      actual_revenue: avgMonthlyRevenue,
      revenue_variance_percentage: application.stated_monthly_revenue ? Math.abs((application.stated_monthly_revenue - avgMonthlyRevenue) / avgMonthlyRevenue * 100) : 0,
      recommended_max_advance: customTerms?.advanceAmount || riskMetrics.recommendedAdvance,
      recommended_factor_rate_min: 1.2,
      recommended_factor_rate_max: 1.45,
      recommended_term_days: customTerms?.termDays || 150,
      recommended_daily_debit: customTerms ? (customTerms.advanceAmount * customTerms.factorRate) / customTerms.termDays : (riskMetrics.recommendedAdvance / 150),
      recommended_position: position.toUpperCase(),
    })

  if (scorecardError) {
    console.error('[saveRiskAssessment] ❌ Failed to save scorecard:', scorecardError.message)
  } else {
    console.log('[saveRiskAssessment] ✅ Scorecard saved')
  }

  // Save risk flags
  console.log('[saveRiskAssessment] 📝 Saving', riskMetrics.flags.length, 'risk flags...')
  for (let i = 0; i < riskMetrics.flags.length; i++) {
    const flag = riskMetrics.flags[i]
    console.log(`[saveRiskAssessment] 🚩 Flag ${i + 1}/${riskMetrics.flags.length}: ${flag.message} (${flag.severity})`)
    const { error: flagError } = await supabase
      .from('risk_flags_detailed')
      .insert({
        user_id: user.id,
        deal_id: dealId,
        flag_type: flag.message,
        severity: flag.severity,
        description: flag.message,
        value_that_triggered_it: flag.value,
      })

    if (flagError) {
      console.error(`[saveRiskAssessment] ❌ Failed to save flag ${i + 1}:`, flagError.message)
    } else {
      console.log(`[saveRiskAssessment] ✅ Flag ${i + 1} saved`)
    }
  }
  console.log('[saveRiskAssessment] ✅ Risk assessment complete')
}

// Stage 6: Save documents and activity
export async function saveDocumentsAndActivity(
  filePaths: string[],
  dealId: string,
  merchantId: string,
  position: 'approved' | 'declined' | 'counter' | 'review',
  riskMetrics: ReturnType<typeof calculateRiskMetrics>,
  uploadedFiles?: Array<{ name: string; size: number }>
) {
  console.log('[saveDocumentsAndActivity] 🔍 Starting...')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  console.log('[saveDocumentsAndActivity] 👤 Auth user:', user?.id)
  if (!user) {
    console.error('[saveDocumentsAndActivity] ❌ No authenticated user found')
    redirect('/login')
  }

  // Save documents
  console.log('[saveDocumentsAndActivity] 📝 Saving', filePaths.length, 'documents...')
  for (let idx = 0; idx < filePaths.length; idx++) {
    const path = filePaths[idx]
    const isApplication = idx === 0
    const fileInfo = uploadedFiles?.[idx]

    console.log(`[saveDocumentsAndActivity] 📄 Document ${idx + 1}/${filePaths.length}:`, {
      name: fileInfo?.name,
      type: isApplication ? 'application' : 'bank_statement',
      path: path,
    })

    const { error: docError } = await supabase
      .from('documents_detailed')
      .insert({
        user_id: user.id,
        deal_id: dealId,
        merchant_id: merchantId,
        file_name: fileInfo?.name || path.split('/').pop() || `document-${idx}`,
        file_size: fileInfo?.size || 0,
        document_type: isApplication ? 'application' : 'bank_statement',
        storage_path: path,
        model_used: 'claude-haiku-4-5-20251001',
        uploaded_at: new Date().toISOString(),
      })

    if (docError) {
      console.error(`[saveDocumentsAndActivity] ❌ Failed to save document ${idx + 1}:`, docError.message)
    } else {
      console.log(`[saveDocumentsAndActivity] ✅ Document ${idx + 1} saved`)
    }
  }

  // Log activity
  console.log('[saveDocumentsAndActivity] 📝 Logging deal activity...')
  const { error: activityError } = await supabase
    .from('deal_activities')
    .insert({
      user_id: user.id,
      deal_id: dealId,
      action_type: position === 'approved' ? 'approved' : position === 'declined' ? 'declined' : position === 'counter' ? 'counter_offered' : 'saved_for_review',
      action_title: `Deal ${position === 'approved' ? 'Approved' : position === 'declined' ? 'Declined' : position === 'counter' ? 'Countered' : 'Saved for Review'}`,
      action_description: `Deal was ${position === 'approved' ? 'approved' : position === 'declined' ? 'declined' : position === 'counter' ? 'countered' : 'saved'} with risk score ${riskMetrics.score}/100 (Grade ${riskMetrics.riskGrade})`,
      new_values: { status: position, risk_score: riskMetrics.score },
      created_by_user_id: user.id,
    })

  if (activityError) {
    console.error('[saveDocumentsAndActivity] ❌ Failed to log activity:', activityError.message)
  } else {
    console.log('[saveDocumentsAndActivity] ✅ Activity logged')
  }

  console.log('[saveDocumentsAndActivity] 🔄 Revalidating paths...')
  revalidatePath('/deals')
  revalidatePath(`/deals/${dealId}`)
  console.log('[saveDocumentsAndActivity] ✅ Paths revalidated')
}

// NEW: Refactored to accept just job ID - payload is tiny!
export async function createDealComprehensive(
  jobId: string,
  dealId: string,
  filePaths: string[],
  position: 'approved' | 'declined' | 'counter' | 'review',
  customTerms?: { advanceAmount: number; factorRate: number; termDays: number },
  uploadedFiles?: Array<{ name: string; size: number }>
) {
  try {
    console.log('═══════════════════════════════════════════════════════════════════')
    console.log('[createDealComprehensive] 🚀 STARTING DEAL CREATION')
    console.log('───────────────────────────────────────────────────────────────────')
    console.log('[createDealComprehensive] Input params:', {
      jobId,
      dealId,
      position,
      filePaths: filePaths.length,
      uploadedFiles: uploadedFiles?.length,
    })

    // Fetch parsed data from Supabase (ONLY request - no payload data sent!)
    console.log('[createDealComprehensive] 📦 Fetching parsed data from Supabase...')
    const { getParsingJobData } = await import('./save-parsed-data')
    const jobData = await getParsingJobData(jobId)

    const application = jobData.application
    const statements = jobData.statements

    console.log('[createDealComprehensive] ✅ Fetched parsed data:', {
      merchantName: application?.business_legal_name,
      ein: application?.ein,
      statementCount: statements.length,
    })

    // Stage 1: Create contact
    console.log('───────────────────────────────────────────────────────────────────')
    console.log('[createDealComprehensive] 📋 STAGE 1: Creating contact...')
    const merchant = await createContact(application)
    console.log('[createDealComprehensive] ✅ Stage 1 complete - Contact ID:', merchant.id)

    // Stage 2: Create deal
    console.log('───────────────────────────────────────────────────────────────────')
    console.log('[createDealComprehensive] 📋 STAGE 2: Creating deal...')
    const { deal, riskMetrics } = await createDeal(application, statements, merchant.id, position, customTerms)
    console.log('[createDealComprehensive] ✅ Stage 2 complete - Deal ID:', deal.id)

    // Stage 3: Save bank statements
    console.log('───────────────────────────────────────────────────────────────────')
    console.log('[createDealComprehensive] 📋 STAGE 3: Saving bank statements...')
    await saveBankStatements(statements, deal.id, merchant.id)
    console.log('[createDealComprehensive] ✅ Stage 3 complete')

    // Stage 4: Save MCA positions
    console.log('───────────────────────────────────────────────────────────────────')
    console.log('[createDealComprehensive] 📋 STAGE 4: Saving MCA positions...')
    await saveMCAPositions(statements, deal.id, merchant.id)
    console.log('[createDealComprehensive] ✅ Stage 4 complete')

    // Stage 5: Save risk assessment
    console.log('───────────────────────────────────────────────────────────────────')
    console.log('[createDealComprehensive] 📋 STAGE 5: Saving risk assessment...')
    await saveRiskAssessment(application, statements, riskMetrics, deal.id, position, customTerms)
    console.log('[createDealComprehensive] ✅ Stage 5 complete')

    // Stage 6: Save documents and activity
    console.log('───────────────────────────────────────────────────────────────────')
    console.log('[createDealComprehensive] 📋 STAGE 6: Saving documents and activity...')
    await saveDocumentsAndActivity(filePaths, deal.id, merchant.id, position, riskMetrics, uploadedFiles)
    console.log('[createDealComprehensive] ✅ Stage 6 complete')

    // Cleanup temp data
    console.log('───────────────────────────────────────────────────────────────────')
    console.log('[createDealComprehensive] 🗑️ Cleaning up temporary parsing data...')
    const { cleanupParsingJob } = await import('./save-parsed-data')
    await cleanupParsingJob(jobId)
    console.log('[createDealComprehensive] ✅ Cleanup complete')

    console.log('═══════════════════════════════════════════════════════════════════')
    console.log('[createDealComprehensive] ✅✅✅ ALL STAGES COMPLETE ✅✅✅')
    console.log('[createDealComprehensive] 🎉 Deal created successfully!')
    console.log('[createDealComprehensive] Deal ID:', deal.id)
    console.log('[createDealComprehensive] Redirecting to deal detail page...')
    console.log('═══════════════════════════════════════════════════════════════════')
    redirect(`/deals/${deal.id}`)
  } catch (error) {
    console.error('═══════════════════════════════════════════════════════════════════')
    console.error('[createDealComprehensive] ❌❌❌ ERROR ❌❌❌')
    console.error('[createDealComprehensive] Error type:', error?.constructor?.name)
    console.error('[createDealComprehensive] Error message:', error instanceof Error ? error.message : String(error))
    console.error('[createDealComprehensive] Full error:', error)
    console.error('═══════════════════════════════════════════════════════════════════')
    throw error
  }
}

