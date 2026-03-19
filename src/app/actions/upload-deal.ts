'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { ParsedApplication, ParsedBankStatement } from '@/types'

// Helper function to calculate risk score and flags
function calculateRiskMetrics(application: ParsedApplication, statements: ParsedBankStatement[]) {
  const flags: Array<{ severity: 'high' | 'medium' | 'low'; message: string }> = []
  let score = 0

  // Revenue check
  if (application?.stated_monthly_revenue && application.stated_monthly_revenue < 10000) {
    flags.push({ severity: 'medium', message: 'Low stated monthly revenue' })
    score += 15
  }

  // Time in business
  if (!application?.time_in_business_years || application.time_in_business_years < 2) {
    flags.push({ severity: 'medium', message: 'Business less than 2 years old' })
    score += 20
  }

  // NSF issues
  const totalNsf = statements.reduce((sum, s) => sum + s.nsf_count, 0)
  if (totalNsf > 3) {
    flags.push({ severity: 'high', message: `${totalNsf} NSF events detected across statements` })
    score += 30
  }

  // Average daily balance
  const avgAdb = statements.length > 0
    ? statements.reduce((sum, s) => sum + (s.average_daily_balance || 0), 0) / statements.length
    : 0
  if (avgAdb < 1000) {
    flags.push({ severity: 'high', message: 'Average daily balance below $1,000' })
    score += 25
  }

  // Holdback
  const avgHoldback = statements.length > 0
    ? statements.reduce((sum, s) => sum + s.holdback_percentage, 0) / statements.length
    : 0
  if (avgHoldback > 15) {
    flags.push({ severity: 'high', message: `High MCA holdback (${avgHoldback.toFixed(1)}% of revenue)` })
    score += 20
  }

  // Stacking
  const lenders = new Set<string>()
  statements.forEach(s => {
    s.mca_debits?.forEach(d => lenders.add(d.funder_name))
  })
  if (lenders.size > 1) {
    flags.push({ severity: 'high', message: `Multiple MCA lenders detected (${lenders.size})` })
    score += 25
  }

  // Revenue trend
  if (statements.length > 1) {
    const revenues = statements.map(s => s.true_revenue_deposits)
    const lastRev = revenues[revenues.length - 1]
    const firstRev = revenues[0]
    if (lastRev < firstRev * 0.8) {
      flags.push({ severity: 'medium', message: 'Declining revenue trend' })
      score += 15
    }
  }

  // Days below balance
  const avgDaysBelow500 = statements.length > 0
    ? statements.reduce((sum, s) => sum + s.days_below_500, 0) / statements.length
    : 0
  if (avgDaysBelow500 > 5) {
    flags.push({ severity: 'medium', message: `Balance below $500 for ${avgDaysBelow500.toFixed(0)} days/month on average` })
    score += 10
  }

  score = Math.min(score, 100)

  // Calculate recommended advance
  let baseAdvance = statements.length > 0
    ? (statements.reduce((sum, s) => sum + s.true_revenue_deposits, 0) / statements.length) * 0.1
    : 0

  const mediumFlags = flags.filter(f => f.severity === 'medium').length
  const highFlags = flags.filter(f => f.severity === 'high').length
  baseAdvance *= (1 - mediumFlags * 0.05 - highFlags * 0.15)
  baseAdvance = Math.max(baseAdvance, 0)

  const recommendedAdvance = Math.round(baseAdvance / 500) * 500

  // Risk grade
  const riskGrade = score < 35 ? 'A' : score < 50 ? 'B' : score < 65 ? 'C' : score < 80 ? 'D' : score < 95 ? 'E' : 'F'

  return { score, flags, recommendedAdvance, riskGrade }
}

function calculateComponentScores(application: ParsedApplication, statements: ParsedBankStatement[]) {
  if (statements.length === 0) {
    return {
      adbScore: 0,
      revenueConsistencyScore: 75,
      nsfScore: 100,
      mcaStackScore: 100,
      revenueTrendScore: 75,
      timeInBusinessScore: Math.min(100, (application?.time_in_business_years || 0) * 25),
    }
  }

  const avgAdb = statements.reduce((sum, s) => sum + (s.average_daily_balance || 0), 0) / statements.length
  const adbScore = Math.max(0, Math.min(100, (avgAdb / 10000) * 100))

  const revenues = statements.map(s => s.true_revenue_deposits)
  let revenueTrendScore = 75
  if (revenues.length > 1) {
    const trend = ((revenues[revenues.length - 1] - revenues[0]) / revenues[0]) * 100
    revenueTrendScore = Math.max(0, Math.min(100, 75 + trend / 2))
  }

  const revenueConsistencyScore = 100 - Math.abs(revenueTrendScore - 75)

  const totalNsf = statements.reduce((sum, s) => sum + s.nsf_count, 0)
  const nsfScore = Math.max(0, 100 - totalNsf * 20)

  const lenderCount = new Set(statements.flatMap(s => s.mca_debits?.map(d => d.funder_name) || [])).size
  const mcaStackScore = Math.max(0, 100 - lenderCount * 25)

  const timeInBusinessScore = Math.min(100, (application?.time_in_business_years || 0) * 25)

  return {
    adbScore: Math.round(adbScore),
    revenueConsistencyScore: Math.round(revenueConsistencyScore),
    nsfScore: Math.round(nsfScore),
    mcaStackScore: Math.round(mcaStackScore),
    revenueTrendScore: Math.round(revenueTrendScore),
    timeInBusinessScore: Math.round(timeInBusinessScore),
  }
}

export async function createDealFromUpload(
  application: ParsedApplication,
  statements: ParsedBankStatement[],
  dealId: string,
  filePaths: string[],
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const riskMetrics = calculateRiskMetrics(application, statements)
  const componentScores = calculateComponentScores(application, statements)

  // Create merchant contact
  const merchantData = {
    user_id: user.id,
    first_name: application.owner_name?.split(' ')[0] || 'Merchant',
    last_name: application.owner_name?.split(' ').slice(1).join(' ') || '',
    company: application.business_legal_name || application.dba,
    business_legal_name: application.business_legal_name || null,
    dba: application.dba || null,
    entity_type: application.entity_type || null,
    email: application.business_email || null,
    phone: application.business_phone || null,
    address: application.business_address || null,
    business_address: application.business_address || null,
    ein: application.ein || null,
    owner_name: application.owner_name || null,
    ownership_percentage: application.ownership_percentage || null,
    industry: application.industry || null,
    monthly_revenue: application.stated_monthly_revenue || null,
    bank_name: application.bank_name || null,
    account_type: application.account_type || null,
    landlord_name: application.landlord_name || null,
    monthly_rent: application.monthly_rent || null,
    use_of_funds: application.use_of_funds || null,
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
    date_uploaded: new Date().toISOString().split('T')[0],
    description: `Uploaded ${statements.length} bank statements`,
    risk_score: riskMetrics.score,
    risk_grade: riskMetrics.riskGrade,
    recommended_max_advance: riskMetrics.recommendedAdvance,
    recommended_factor_rate_min: 1.2,
    recommended_factor_rate_max: 1.45,
    recommended_term_days: 150,
    recommended_daily_debit_min: Math.round((riskMetrics.recommendedAdvance / 150) / 30),
    recommended_daily_debit_max: Math.round((riskMetrics.recommendedAdvance / 120) / 30),
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

  // Create underwriting scorecard
  const { error: scorecardError } = await supabase
    .from('underwriting_scorecards')
    .insert({
      user_id: user.id,
      deal_id: deal.id,
      overall_score: riskMetrics.score,
      risk_grade: riskMetrics.riskGrade,
      adb_score: componentScores.adbScore,
      revenue_consistency_score: componentScores.revenueConsistencyScore,
      nsf_score: componentScores.nsfScore,
      mca_stack_score: componentScores.mcaStackScore,
      revenue_trend_score: componentScores.revenueTrendScore,
      time_in_business_score: componentScores.timeInBusinessScore,
      max_advance_recommended: riskMetrics.recommendedAdvance,
      factor_rate_min: 1.2,
      factor_rate_max: 1.45,
      term_days_recommended: 150,
      daily_debit_min: Math.round((riskMetrics.recommendedAdvance / 150) / 30),
      daily_debit_max: Math.round((riskMetrics.recommendedAdvance / 120) / 30),
    })

  if (scorecardError) console.error('Failed to create scorecard:', scorecardError.message)

  // Create risk flags
  for (const flag of riskMetrics.flags) {
    const { error: flagError } = await supabase
      .from('risk_flags')
      .insert({
        user_id: user.id,
        deal_id: deal.id,
        severity: flag.severity,
        message: flag.message,
      })

    if (flagError) console.error('Failed to create risk flag:', flagError.message)
  }

  // Create MCA positions
  const lendersSet = new Set<string>()
  const lenderInfo: Record<string, { firstMonth: string; lastMonth: string; dailyDebit: number }> = {}

  statements.forEach((s, idx) => {
    const monthKey = `${s.statement_year}-${String(s.statement_month).padStart(2, '0')}`
    s.mca_debits?.forEach(d => {
      lendersSet.add(d.funder_name)
      if (!lenderInfo[d.funder_name]) {
        lenderInfo[d.funder_name] = { firstMonth: monthKey, lastMonth: monthKey, dailyDebit: d.daily_debit_amount || d.daily_amount || 0 }
      } else {
        lenderInfo[d.funder_name].lastMonth = monthKey
        lenderInfo[d.funder_name].dailyDebit = d.daily_debit_amount || d.daily_amount || 0
      }
    })
  })

  for (const [funderName, info] of Object.entries(lenderInfo)) {
    const { error: mcaError } = await supabase
      .from('mca_positions')
      .insert({
        user_id: user.id,
        deal_id: deal.id,
        funder_name: funderName,
        daily_debit_amount: info.dailyDebit,
        first_seen_month: info.firstMonth,
        last_seen_month: info.lastMonth,
        status: 'active',
      })

    if (mcaError) console.error('Failed to create MCA position:', mcaError.message)
  }

  // Create deal documents
  for (let i = 0; i < filePaths.length; i++) {
    const originalFile = application ? (i === 0 ? 'application' : 'bank_statement') : 'other'
    const { error: docError } = await supabase
      .from('deal_documents')
      .insert({
        user_id: user.id,
        deal_id: deal.id,
        file_path: filePaths[i],
        file_name: filePaths[i].split('/').pop() || `document-${i}`,
        document_type: originalFile as 'application' | 'bank_statement' | 'other',
      })

    if (docError) console.error('Failed to create deal document:', docError.message)
  }

  revalidatePath('/deals')
  revalidatePath(`/deals/${deal.id}`)
  redirect(`/deals/${deal.id}`)
}
