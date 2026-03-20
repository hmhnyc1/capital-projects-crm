/**
 * PART 6: FILE CONTROL SHEET GENERATOR
 *
 * Generates comprehensive standardized underwriting report combining
 * parsed application + bank statement data. This is the output that
 * underwriters use to make funding decisions - must be accurate, complete, and professional.
 */

import { ParsedApplication } from './application-parser'
import { ParsedBankStatement } from './bank-statement-parser'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface FileControlSheet {
  // HEADER
  merchant_legal_name: string | null
  merchant_dba: string | null
  date_generated: string // YYYY-MM-DD
  prepared_by: string
  deal_number: string | null
  overall_recommendation: 'APPROVE' | 'DECLINE' | 'COUNTER' | 'REVIEW'

  // MERCHANT SUMMARY
  merchant_summary: {
    legal_name: string | null
    dba: string | null
    entity_type: string | null
    ein: string | null
    date_established: string | null
    time_in_business_years: number | null
    industry: string | null
    address: string | null
    phone: string | null
    email: string | null
    owner_1_name: string | null
    owner_1_ownership_pct: number | null
    owner_1_ssn_last4: string | null
    owner_2_name: string | null
    owner_2_ownership_pct: number | null
  }

  // BANK ANALYSIS - ONE ROW PER STATEMENT MONTH
  bank_analysis_months: Array<{
    month_label: string
    starting_balance: number | null
    ending_balance: number | null
    true_revenue: number
    non_revenue: number
    total_deposits: number
    avg_daily_balance: number | null
    lowest_balance: number | null
    nsf_count: number
    mca_holdback: number
    holdback_pct: number | null
    net_cash_flow: number
  }>

  // TREND ANALYSIS
  trend_analysis: {
    revenue_trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'VOLATILE'
    revenue_month_over_month_change: number | null
    adb_trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'VOLATILE'
    nsf_trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'VOLATILE'
    mca_load_trend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'VOLATILE'
    overall_direction: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'VOLATILE'
  }

  // MCA POSITION SUMMARY
  mca_positions: Array<{
    funder: string
    type: string
    per_debit: number
    frequency: string
    monthly_total: number
    months_active: number
    total_paid: number
    status: string
  }>

  mca_summary: {
    combined_daily_obligation: number
    combined_monthly_obligation: number
    combined_holdback_pct: number | null
  }

  // RISK FLAGS - CATEGORIZED BY SEVERITY
  risk_flags: Array<{
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    flag: string
    description: string
  }>

  // UNDERWRITING SCORECARD
  scorecard: {
    overall_score: number // 0-100
    grade: string // A-F
    revenue_quality_score: number
    cash_flow_score: number
    credit_score: number
    time_in_business_score: number
    debt_service_score: number
  }

  underwriting_recommendation: {
    advance_amount: number | null
    factor_rate_range_low: number | null
    factor_rate_range_high: number | null
    recommended_term_days: number | null
    recommended_daily_debit: number | null
    rationale: string
  }

  // DETAIL DATA ARRAYS
  non_revenue_deposits: Array<{
    date: string
    amount: number
    source: string
    reason: string
  }>

  daily_balances: Array<{
    date: string
    balance: number
    status: string
  }>

  revenue_source_breakdown: Array<{
    source: string
    total_amount: number
    percentage_of_revenue: number
  }>

  // QUALITY SCORES
  application_confidence_score: number
  bank_statement_confidence_score: number
  overall_confidence_score: number
}

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculates trend direction based on values
 */
function calculateTrend(values: (number | null)[]): 'IMPROVING' | 'STABLE' | 'DECLINING' | 'VOLATILE' {
  const numbers = values.filter((v): v is number => v !== null && v !== undefined)

  if (numbers.length < 2) return 'STABLE'

  const changes: number[] = []
  for (let i = 1; i < numbers.length; i++) {
    changes.push(numbers[i] - numbers[i - 1])
  }

  // Count direction of changes
  const improving = changes.filter(c => c > 0).length
  const declining = changes.filter(c => c < 0).length
  const flat = changes.filter(c => c === 0).length

  // Determine overall trend
  const improvingRatio = improving / changes.length
  const decliningRatio = declining / changes.length

  // If mostly improving
  if (improvingRatio >= 0.66) return 'IMPROVING'

  // If mostly declining
  if (decliningRatio >= 0.66) return 'DECLINING'

  // If about half up and half down - volatile
  if (Math.abs(improving - declining) <= 1) return 'VOLATILE'

  // Otherwise stable
  return 'STABLE'
}

/**
 * Converts monthly obligation to daily (rough estimate)
 */
function monthlyToDaily(monthlyAmount: number): number {
  return Math.round(monthlyAmount / 30)
}

/**
 * Safely converts to number with default
 */
function toNumber(value: any, defaultValue: number = 0): number {
  const num = Number(value)
  return isNaN(num) ? defaultValue : num
}

/**
 * Calculates percent safely
 */
function calculatePercent(numerator: number, denominator: number): number | null {
  if (denominator === 0 || denominator === null) return null
  return (numerator / denominator) * 100
}

// ============================================================================
// MAIN GENERATION FUNCTION
// ============================================================================

export function generateFileControlSheet(
  application: ParsedApplication | null,
  bankStatements: ParsedBankStatement[],
  preparedBy: string = 'System',
  dealNumber: string | null = null
): FileControlSheet {
  const now = new Date().toISOString().split('T')[0]

  // ========================================================================
  // CALCULATE CONFIDENCE SCORES
  // ========================================================================

  const appConfidence = application?.confidence_score || 0
  const stmtConfidence =
    bankStatements.length > 0
      ? Math.round(
        bankStatements.reduce((sum, s) => sum + s.confidence_score, 0) / bankStatements.length
      )
      : 0
  const overallConfidence = Math.round((appConfidence + stmtConfidence) / 2)

  // ========================================================================
  // DETERMINE OVERALL RECOMMENDATION
  // ========================================================================

  let overallRecommendation: 'APPROVE' | 'DECLINE' | 'COUNTER' | 'REVIEW' = 'REVIEW'

  // Scoring logic for recommendation
  if (appConfidence >= 80 && stmtConfidence >= 75) {
    overallRecommendation = 'APPROVE'
  } else if (appConfidence < 50 || stmtConfidence < 40) {
    overallRecommendation = 'DECLINE'
  } else if (appConfidence >= 70 && stmtConfidence >= 60) {
    overallRecommendation = 'COUNTER'
  }

  // ========================================================================
  // MERCHANT SUMMARY
  // ========================================================================

  const merchantSummary = {
    legal_name: application?.business_legal_name || null,
    dba: application?.dba || null,
    entity_type: application?.entity_type || null,
    ein: application?.ein || null,
    date_established: application?.date_established || null,
    time_in_business_years: application?.time_in_business_years || null,
    industry: application?.industry || null,
    address: application
      ? [
        application.business_address,
        application.business_city,
        application.business_state,
        application.business_zip,
      ]
        .filter(Boolean)
        .join(', ')
      : null,
    phone: application?.business_phone || null,
    email: application?.business_email || null,
    owner_1_name: application?.owner_1_name || null,
    owner_1_ownership_pct: application?.owner_1_ownership_pct || null,
    owner_1_ssn_last4: application?.owner_1_ssn_last4 || null,
    owner_2_name: application?.owner_2_name || null,
    owner_2_ownership_pct: application?.owner_2_ownership_pct || null,
  }

  // ========================================================================
  // BANK ANALYSIS - MONTHLY BREAKDOWN
  // ========================================================================

  const bankAnalysisMonths = bankStatements.map(stmt => ({
    month_label: stmt.statement_month_label || 'Unknown',
    starting_balance: stmt.starting_balance,
    ending_balance: stmt.ending_balance,
    true_revenue: stmt.true_revenue_total,
    non_revenue: stmt.non_revenue_total,
    total_deposits: stmt.total_deposits || 0,
    avg_daily_balance: stmt.average_daily_balance,
    lowest_balance: stmt.lowest_daily_balance,
    nsf_count: stmt.nsf_count,
    mca_holdback: stmt.total_mca_holdback,
    holdback_pct: stmt.holdback_pct_of_true_revenue ? stmt.holdback_pct_of_true_revenue * 100 : null,
    net_cash_flow: stmt.net_cash_flow,
  }))

  // ========================================================================
  // TREND ANALYSIS
  // ========================================================================

  const revenueValues = bankAnalysisMonths.map(m => m.true_revenue)
  const adbValues = bankAnalysisMonths.map(m => m.avg_daily_balance)
  const nsfValues = bankAnalysisMonths.map(m => m.nsf_count)
  const mcaValues = bankAnalysisMonths.map(m => m.mca_holdback)

  const revenueTrend = calculateTrend(revenueValues)
  const adbTrend = calculateTrend(adbValues)
  const nsfTrend = calculateTrend(nsfValues)
  const mcaTrend = calculateTrend(mcaValues)

  // Overall trend determination
  const trends = [revenueTrend, adbTrend, nsfTrend, mcaTrend]
  let overallTrend: 'IMPROVING' | 'STABLE' | 'DECLINING' | 'VOLATILE' = 'STABLE'
  if (trends.includes('IMPROVING')) overallTrend = 'IMPROVING'
  else if (trends.filter(t => t === 'DECLINING').length >= 2) overallTrend = 'DECLINING'
  else if (trends.includes('VOLATILE')) overallTrend = 'VOLATILE'

  const revenueChange =
    revenueValues.length > 1
      ? revenueValues[revenueValues.length - 1] - revenueValues[0]
      : null

  // ========================================================================
  // MCA POSITION ANALYSIS
  // ========================================================================

  const mcaPositions = bankStatements.flatMap(stmt =>
    stmt.mca_positions.map(pos => ({
      funder: pos.funder_name,
      type: 'MCA',
      per_debit: pos.amount_per_debit,
      frequency: pos.frequency,
      monthly_total: pos.total_debited_this_month,
      months_active: 1,
      total_paid: pos.total_debited_this_month,
      status: 'Active',
    }))
  )

  // Calculate combined MCA obligations
  const combinedDailyObligation = mcaPositions.reduce((sum, p) => {
    if (p.frequency === 'Daily') return sum + p.per_debit
    if (p.frequency === 'Weekly') return sum + p.per_debit / 7
    if (p.frequency === 'Monthly') return sum + p.per_debit / 30
    return sum
  }, 0)

  const combinedMonthlyObligation = combinedDailyObligation * 30

  // Calculate MCA holdback percentages
  const totalRevenue = bankStatements.reduce((sum, s) => sum + s.true_revenue_total, 0)
  const totalMCAHoldback = bankStatements.reduce((sum, s) => sum + s.total_mca_holdback, 0)
  const combinedHoldbackPct = calculatePercent(totalMCAHoldback, totalRevenue)

  // ========================================================================
  // RISK FLAGS
  // ========================================================================

  const riskFlags: Array<{
    severity: 'HIGH' | 'MEDIUM' | 'LOW'
    flag: string
    description: string
  }> = []

  // Check application quality
  if (appConfidence && appConfidence < 60) {
    riskFlags.push({
      severity: 'HIGH',
      flag: 'Low Application Quality',
      description: `Application parse confidence only ${appConfidence}% - difficult to extract key information`,
    })
  }

  // Check bank statement quality
  bankStatements.forEach((stmt, idx) => {
    if (stmt.confidence_score < 60) {
      riskFlags.push({
        severity: 'HIGH',
        flag: 'Low Statement Quality',
        description: `Bank statement ${idx + 1} parse confidence only ${stmt.confidence_score}% - manual review required`,
      })
    }
  })

  // Check NSF frequency
  const totalNSFs = bankStatements.reduce((sum, s) => sum + s.nsf_count, 0)
  if (totalNSFs > 3) {
    riskFlags.push({
      severity: 'HIGH',
      flag: 'Frequent NSF Events',
      description: `${totalNSFs} NSF events detected across statement period - indicates cash flow instability`,
    })
  }

  // Check low balance days
  const totalLowBalanceDays = bankStatements.reduce((sum, s) => sum + s.days_below_500, 0)
  if (totalLowBalanceDays > 10) {
    riskFlags.push({
      severity: 'MEDIUM',
      flag: 'Frequent Low Balance Days',
      description: `Account fell below $500 on ${totalLowBalanceDays} days - weak liquidity position`,
    })
  }

  // Check MCA load
  if (combinedHoldbackPct && combinedHoldbackPct > 30) {
    riskFlags.push({
      severity: 'MEDIUM',
      flag: 'High Existing MCA Load',
      description: `Current MCA obligations consume ${combinedHoldbackPct.toFixed(1)}% of revenue - limited capacity for additional advance`,
    })
  }

  // Check declining revenue
  if (revenueTrend === 'DECLINING' && revenueChange && revenueChange < 0) {
    const declinePercent = ((revenueChange / (revenueValues[0] || 1)) * 100).toFixed(0)
    riskFlags.push({
      severity: 'MEDIUM',
      flag: 'Declining Revenue Trend',
      description: `Revenue declined ${declinePercent}% over statement period - business declining`,
    })
  }

  // Check volatile business
  if (revenueTrend === 'VOLATILE') {
    riskFlags.push({
      severity: 'LOW',
      flag: 'Volatile Revenue',
      description: `Monthly revenue fluctuates significantly - unpredictable cash flow`,
    })
  }

  // Check time in business
  if (application && application.time_in_business_years && application.time_in_business_years < 1) {
    riskFlags.push({
      severity: 'MEDIUM',
      flag: 'New Business',
      description: `Business operating less than 1 year - limited operating history`,
    })
  }

  // ========================================================================
  // UNDERWRITING SCORECARD
  // ========================================================================

  const statedMonthlyRevenue = application?.monthly_revenue || (totalRevenue > 0 ? totalRevenue : 0)

  // Revenue Quality Score (based on NSFs and consistency)
  const nsfPenalty = Math.min(100, totalNSFs * 10)
  const revenueQualityScore = Math.max(0, 100 - nsfPenalty)

  // Cash Flow Score (based on average daily balance)
  const avgADB = bankStatements.length > 0
    ? bankStatements.reduce((sum, s) => sum + (s.average_daily_balance || 0), 0) / bankStatements.length
    : 0
  const cashFlowScore = Math.min(100, Math.max(0, (avgADB / 5000) * 100))

  // Credit Score (estimated from business revenue and time in business)
  const creditScore = Math.min(100, Math.max(40, (statedMonthlyRevenue / 25000) * 100))

  // Time in Business Score
  const timeInBusiness = application?.time_in_business_years || 0
  const timeInBusinessScore = Math.min(100, Math.max(20, timeInBusiness * 15))

  // Debt Service Score (ability to service additional debt)
  const existingObligations = combinedMonthlyObligation
  const availableForDebtService = Math.max(0, statedMonthlyRevenue - existingObligations)
  const debtServiceScore = totalRevenue > 0
    ? Math.min(100, (availableForDebtService / statedMonthlyRevenue) * 100)
    : 0

  // Overall Score (average of component scores)
  const overallScore = Math.round(
    (revenueQualityScore + cashFlowScore + creditScore + timeInBusinessScore + debtServiceScore) / 5
  )

  // Grade assignment
  let grade = 'F'
  if (overallScore >= 90) grade = 'A'
  else if (overallScore >= 80) grade = 'B'
  else if (overallScore >= 70) grade = 'C'
  else if (overallScore >= 60) grade = 'D'

  // ========================================================================
  // UNDERWRITING RECOMMENDATION
  // ========================================================================

  // Calculate recommended advance
  const recommendedAdvance =
    overallScore >= 70 ? Math.round(statedMonthlyRevenue * 2) : Math.round(statedMonthlyRevenue * 1.5)

  // Factor rate based on score
  let factorLow = 1.2
  let factorHigh = 1.4
  if (overallScore >= 85) {
    factorLow = 1.15
    factorHigh = 1.30
  } else if (overallScore < 65) {
    factorLow = 1.30
    factorHigh = 1.50
  }

  const recommendedTermDays = 120
  const recommendedDailyDebit = Math.round((recommendedAdvance * factorLow) / recommendedTermDays)

  const recommendation = {
    advance_amount: recommendedAdvance,
    factor_rate_range_low: factorLow,
    factor_rate_range_high: factorHigh,
    recommended_term_days: recommendedTermDays,
    recommended_daily_debit: recommendedDailyDebit,
    rationale: `Based on stated monthly revenue of $${statedMonthlyRevenue.toLocaleString()} and underwriting score of ${overallScore}, recommend $${recommendedAdvance.toLocaleString()} advance with factor rate ${factorLow}-${factorHigh}x over ${recommendedTermDays} days ($${recommendedDailyDebit}/day). ${overallTrend === 'IMPROVING' ? 'Business shows positive trends.' : overallTrend === 'DECLINING' ? 'Note: declining revenue trend.' : ''}.`,
  }

  // ========================================================================
  // DETAIL DATA
  // ========================================================================

  const nonRevenueDeposits = bankStatements.flatMap(stmt =>
    stmt.non_revenue_deposits.map(dep => ({
      date: dep.date,
      amount: dep.amount,
      source: dep.source_name || 'Unknown',
      reason: 'Non-revenue deposit',
    }))
  )

  const dailyBalances = bankStatements.flatMap(stmt => stmt.daily_balances)

  const revenueSourceBreakdown = bankStatements
    .flatMap(stmt =>
      stmt.revenue_deposits.map(dep => ({
        source: dep.source_name || 'Unknown',
        total_amount: dep.amount,
        percentage_of_revenue: (dep.amount / stmt.true_revenue_total) * 100,
      }))
    )
    .reduce(
      (acc, item) => {
        const existing = acc.find(r => r.source === item.source)
        if (existing) {
          existing.total_amount += item.total_amount
        } else {
          acc.push(item)
        }
        return acc
      },
      [] as Array<{ source: string; total_amount: number; percentage_of_revenue: number }>
    )
    .map(item => ({
      ...item,
      percentage_of_revenue: (item.total_amount / totalRevenue) * 100,
    }))

  // ========================================================================
  // BUILD FINAL SHEET
  // ========================================================================

  return {
    // Header
    merchant_legal_name: application?.business_legal_name || null,
    merchant_dba: application?.dba || null,
    date_generated: now,
    prepared_by: preparedBy,
    deal_number: dealNumber,
    overall_recommendation: overallRecommendation,

    // Merchant Summary
    merchant_summary: merchantSummary,

    // Bank Analysis
    bank_analysis_months: bankAnalysisMonths,

    // Trend Analysis
    trend_analysis: {
      revenue_trend: revenueTrend,
      revenue_month_over_month_change: revenueChange,
      adb_trend: adbTrend,
      nsf_trend: nsfTrend,
      mca_load_trend: mcaTrend,
      overall_direction: overallTrend,
    },

    // MCA Positions
    mca_positions: mcaPositions,
    mca_summary: {
      combined_daily_obligation: Math.round(combinedDailyObligation),
      combined_monthly_obligation: Math.round(combinedMonthlyObligation),
      combined_holdback_pct: combinedHoldbackPct,
    },

    // Risk Flags
    risk_flags: riskFlags,

    // Scorecard
    scorecard: {
      overall_score: overallScore,
      grade,
      revenue_quality_score: Math.round(revenueQualityScore),
      cash_flow_score: Math.round(cashFlowScore),
      credit_score: Math.round(creditScore),
      time_in_business_score: Math.round(timeInBusinessScore),
      debt_service_score: Math.round(debtServiceScore),
    },

    // Recommendation
    underwriting_recommendation: recommendation,

    // Detail Data
    non_revenue_deposits: nonRevenueDeposits,
    daily_balances: dailyBalances,
    revenue_source_breakdown: revenueSourceBreakdown,

    // Confidence
    application_confidence_score: appConfidence,
    bank_statement_confidence_score: stmtConfidence,
    overall_confidence_score: overallConfidence,
  }
}
