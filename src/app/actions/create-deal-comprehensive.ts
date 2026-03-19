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

export async function createDealComprehensive(
  application: ParsedApplication,
  statements: ParsedBankStatement[],
  dealId: string,
  filePaths: string[],
  position: 'approved' | 'declined' | 'counter' | 'review',
  customTerms?: { advanceAmount: number; factorRate: number; termDays: number },
  uploadedFiles?: Array<{ name: string; size: number }>
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  try {
    const riskMetrics = calculateRiskMetrics(application, statements)

    // Create or update contact (merchant)
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
      business_address: application.business_address || null,
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

    const { data: merchant, error: merchantError } = await supabase
      .from('contacts')
      .insert(merchantData)
      .select()
      .single()

    if (merchantError) throw new Error(`Failed to create contact: ${merchantError.message}`)

    // Calculate portfolio metrics
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

    const dateRange = statements.length > 0
      ? `${statements[0].statement_start_date} to ${statements[statements.length - 1].statement_end_date}`
      : null

    // Generate executive summary
    const executiveSummary = `${application.business_legal_name} is a ${application.entity_type?.toLowerCase() || 'business'} in the ${application.industry || 'retail'} industry, owned by ${application.owner_name} with ${application.time_in_business_years} years in business. The merchant reports ${application.stated_monthly_revenue?.toLocaleString() || 'undisclosed'} in monthly revenue, though bank analysis shows ${avgMonthlyRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} average true revenue across ${statements.length} months. The merchant has an average daily balance of ${avgAdb.toLocaleString(undefined, { maximumFractionDigits: 0 })} and ${totalNsf} NSF events. ${avgHoldback > 0 ? `Current MCA obligations represent ${avgHoldback.toFixed(1)}% holdback on revenue.` : 'No active MCA positions identified.'} Risk assessment: ${riskMetrics.riskGrade === 'A' ? 'LOW - Strong approval candidate' : riskMetrics.riskGrade === 'B' ? 'LOW-MEDIUM - Review carefully' : riskMetrics.riskGrade === 'C' ? 'MEDIUM - Counter-offer recommended' : 'HIGH - Decline or significant restructuring required'}.`

    // Create deal
    const dealNumber = generateDealNumber()
    const dealData = {
      user_id: user.id,
      contact_id: merchant.id,
      merchant_id: merchant.id,
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

    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .insert(dealData)
      .select()
      .single()

    if (dealError) throw new Error(`Failed to create deal: ${dealError.message}`)

    // Save bank statements
    for (const statement of statements) {
      const { error: stmtError } = await supabase
        .from('bank_statements_detailed')
        .insert({
          user_id: user.id,
          deal_id: deal.id,
          merchant_id: merchant.id,
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

      if (stmtError) console.error('Failed to save bank statement:', stmtError.message)
    }

    // Save MCA positions
    const lenderMap: Record<string, { first: string; last: string; daily: number }> = {}
    statements.forEach((s, idx) => {
      const month = `${s.statement_year}-${String(s.statement_month).padStart(2, '0')}`
      s.mca_debits?.forEach(d => {
        if (!lenderMap[d.funder_name]) {
          lenderMap[d.funder_name] = { first: month, last: month, daily: d.daily_debit_amount || 0 }
        } else {
          lenderMap[d.funder_name].last = month
        }
      })
    })

    for (const [funderName, info] of Object.entries(lenderMap)) {
      const { error: mcaError } = await supabase
        .from('mca_positions_detailed')
        .insert({
          user_id: user.id,
          deal_id: deal.id,
          merchant_id: merchant.id,
          funder_name: funderName,
          daily_debit_amount: info.daily,
          weekly_amount: info.daily * 7,
          monthly_total: info.daily * 30,
          first_seen_month: info.first,
          last_seen_month: info.last,
          status: 'active',
        })

      if (mcaError) console.error('Failed to save MCA position:', mcaError.message)
    }

    // Save underwriting scorecard
    const adbScore = Math.max(0, Math.min(100, (avgAdb / 10000) * 100))
    const nsfScore = Math.max(0, 100 - totalNsf * 20)
    const mcaStackScore = Math.max(0, 100 - Object.keys(lenderMap).length * 25)
    const timeInBusinessScore = Math.min(100, (application.time_in_business_years || 0) * 25)

    const { error: scorecardError } = await supabase
      .from('underwriting_scorecards_detailed')
      .insert({
        user_id: user.id,
        deal_id: deal.id,
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

    if (scorecardError) console.error('Failed to save scorecard:', scorecardError.message)

    // Save risk flags
    for (const flag of riskMetrics.flags) {
      const { error: flagError } = await supabase
        .from('risk_flags_detailed')
        .insert({
          user_id: user.id,
          deal_id: deal.id,
          flag_type: flag.message,
          severity: flag.severity,
          description: flag.message,
          value_that_triggered_it: flag.value,
        })

      if (flagError) console.error('Failed to save risk flag:', flagError.message)
    }

    // Save documents
    for (let idx = 0; idx < filePaths.length; idx++) {
      const path = filePaths[idx]
      const isApplication = idx === 0
      const fileInfo = uploadedFiles?.[idx]

      const { error: docError } = await supabase
        .from('documents_detailed')
        .insert({
          user_id: user.id,
          deal_id: deal.id,
          merchant_id: merchant.id,
          file_name: fileInfo?.name || path.split('/').pop() || `document-${idx}`,
          file_size: fileInfo?.size || 0,
          document_type: isApplication ? 'application' : 'bank_statement',
          storage_path: path,
          model_used: 'claude-haiku-4-5-20251001',
          uploaded_at: new Date().toISOString(),
        })

      if (docError) console.error('Failed to save document:', docError.message)
    }

    // Log activity
    const { error: activityError } = await supabase
      .from('deal_activities')
      .insert({
        user_id: user.id,
        deal_id: deal.id,
        action_type: position === 'approved' ? 'approved' : position === 'declined' ? 'declined' : position === 'counter' ? 'counter_offered' : 'saved_for_review',
        action_title: `Deal ${position === 'approved' ? 'Approved' : position === 'declined' ? 'Declined' : position === 'counter' ? 'Countered' : 'Saved for Review'}`,
        action_description: `Deal was ${position === 'approved' ? 'approved' : position === 'declined' ? 'declined' : position === 'counter' ? 'countered' : 'saved'} with risk score ${riskMetrics.score}/100 (Grade ${riskMetrics.riskGrade})`,
        new_values: { status: position, risk_score: riskMetrics.score },
        created_by_user_id: user.id,
      })

    if (activityError) console.error('Failed to log activity:', activityError.message)

    revalidatePath('/deals')
    revalidatePath(`/deals/${deal.id}`)
    redirect(`/deals/${deal.id}`)
  } catch (error) {
    console.error('Error in createDealComprehensive:', error)
    throw error
  }
}

