import type { ParsedApplication, ParsedBankStatement, UploadedFile } from '@/types'

export interface RiskAssessment {
  score: number // 0-100, higher = riskier
  level: 'low' | 'medium' | 'high'
  flags: Array<{ severity: 'high' | 'medium' | 'low'; message: string }>
  recommendedAdvance: number
}

export function calculateRiskScore(files: UploadedFile[]): RiskAssessment {
  const flags: Array<{ severity: 'high' | 'medium' | 'low'; message: string }> = []
  let score = 0

  const app = files.find(f => f.type === 'application')?.data as ParsedApplication | null
  const statements = files
    .filter(f => f.type === 'bank_statement' && f.data)
    .map(f => f.data as ParsedBankStatement)

  // Revenue check
  if (app?.monthly_revenue && app.monthly_revenue < 10000) {
    flags.push({ severity: 'medium', message: 'Low monthly revenue' })
    score += 15
  }

  // Time in business
  if (!app?.time_in_business_years || app.time_in_business_years < 2) {
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
    ? statements.reduce((sum, s) => sum + (s.holdback_pct_of_true_revenue || 0), 0) / statements.length
    : 0
  if (avgHoldback > 15) {
    flags.push({ severity: 'high', message: `High MCA holdback (${avgHoldback.toFixed(1)}% of revenue)` })
    score += 20
  }

  // Stacking
  const lenders = new Set<string>()
  statements.forEach(s => {
    s.mca_positions?.forEach(d => lenders.add(d.funder_name))
  })
  if (lenders.size > 1) {
    flags.push({ severity: 'high', message: `Multiple MCA lenders detected (${lenders.size})` })
    score += 25
  }

  // Revenue trend
  if (statements.length > 1) {
    const revenues = statements.map(s => s.true_revenue_total)
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

  // Clamp score
  score = Math.min(score, 100)

  // Recommended advance: 10% of avg monthly revenue minus 20% haircut for each medium+ flag
  let baseAdvance = statements.length > 0
    ? (statements.reduce((sum, s) => sum + s.true_revenue_total, 0) / statements.length) * 0.1
    : 0

  const mediumFlags = flags.filter(f => f.severity === 'medium').length
  const highFlags = flags.filter(f => f.severity === 'high').length
  baseAdvance *= (1 - mediumFlags * 0.05 - highFlags * 0.15)
  baseAdvance = Math.max(baseAdvance, 0)

  return {
    score,
    level: score < 35 ? 'low' : score < 70 ? 'medium' : 'high',
    flags,
    recommendedAdvance: Math.round(baseAdvance / 500) * 500, // Round to nearest $500
  }
}
