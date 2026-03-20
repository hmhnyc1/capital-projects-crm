import type { UploadedFile, ParsedBankStatement } from '@/types'

export function generateLabel(file: UploadedFile): string {
  if (file.type === 'application') {
    return 'Application'
  }

  if (file.type === 'bank_statement') {
    if (file.data && 'statement_month' in file.data) {
      const data = file.data as ParsedBankStatement
      try {
        // Use statement_month_label if available, otherwise try to construct from period dates
        if (data.statement_month_label) {
          return data.statement_month_label
        }

        // Try to extract month/year from statement_period_start
        if (data.statement_period_start) {
          const date = new Date(data.statement_period_start)
          return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        }

        // Fallback to manually constructed month (if statement_month and statement_year are provided)
        if (data.statement_month && data.statement_year) {
          const month = new Date(data.statement_year, data.statement_month - 1).toLocaleDateString(
            'en-US',
            { month: 'long', year: 'numeric' }
          )
          return month
        }

        return 'Bank Statement'
      } catch {
        return 'Bank Statement'
      }
    }
    return 'Bank Statement'
  }

  // For unknown type, try to infer from filename
  const fileName = file.file.name.toLowerCase()
  if (/january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2}|\d{4}-\d{2}|\d{1,2}-\d{4}/i.test(fileName)) {
    return 'Bank Statement'
  }
  if (/app|application|form|merchant|underwriting/i.test(fileName)) {
    return 'Application'
  }

  return file.file.name
}

export function sortBankStatements(files: UploadedFile[]): UploadedFile[] {
  const statements = files.filter(f => f.type === 'bank_statement').sort((a, b) => {
    const aData = a.data as ParsedBankStatement | null
    const bData = b.data as ParsedBankStatement | null
    if (!aData || !bData) return 0
    const aYear = aData.statement_year ?? 0
    const bYear = bData.statement_year ?? 0
    if (aYear !== bYear) {
      return aYear - bYear
    }
    const aMonth = aData.statement_month ?? 0
    const bMonth = bData.statement_month ?? 0
    return aMonth - bMonth
  })
  const others = files.filter(f => f.type !== 'bank_statement')
  return [...others, ...statements]
}

export function detectDuplicateMonths(files: UploadedFile[]): Array<{ month: number; year: number; files: UploadedFile[] }> {
  const months: Record<string, UploadedFile[]> = {}
  files
    .filter(f => f.type === 'bank_statement' && f.data && 'statement_month' in f.data)
    .forEach(f => {
      const data = f.data as ParsedBankStatement
      const key = `${data.statement_year}-${data.statement_month}`
      if (!months[key]) months[key] = []
      months[key].push(f)
    })
  return Object.entries(months)
    .filter(([, files]) => files.length > 1)
    .map(([key, files]) => {
      const [year, month] = key.split('-').map(Number)
      return { month, year, files }
    })
}

export function calculateMonthlySummary(files: UploadedFile[]) {
  const statements = files
    .filter(f => f.type === 'bank_statement' && f.data)
    .map(f => f.data as ParsedBankStatement)

  const totalMonths = statements.length
  const months = statements.map(s => `${s.statement_year}-${String(s.statement_month).padStart(2, '0')}`)
  const dateRange = months.length > 0 ? `${months[0]} to ${months[months.length - 1]}` : 'N/A'
  const avgMonthlyRevenue = statements.length > 0
    ? statements.reduce((sum, s) => sum + s.true_revenue_total, 0) / statements.length
    : 0

  const revenues = statements.map(s => s.true_revenue_total)
  const revenueTrend =
    revenues.length < 2 ? 'N/A' :
    revenues[revenues.length - 1] > revenues[0] ? 'Growing' :
    revenues[revenues.length - 1] < revenues[0] ? 'Declining' :
    'Flat'

  return { totalMonths, dateRange, avgMonthlyRevenue, revenueTrend }
}

export interface PortfolioMetrics {
  avgMonthlyRevenue: number
  revenueTrend: string
  revenueTrendPercent: number
  avgAdb: number
  totalNsf: number
  totalMcaObligations: number
  avgHoldback: number
}

export function calculatePortfolioMetrics(statements: ParsedBankStatement[]): PortfolioMetrics {
  if (statements.length === 0) {
    return {
      avgMonthlyRevenue: 0,
      revenueTrend: 'N/A',
      revenueTrendPercent: 0,
      avgAdb: 0,
      totalNsf: 0,
      totalMcaObligations: 0,
      avgHoldback: 0,
    }
  }

  const revenues = statements.map(s => s.true_revenue_total)
  const avgMonthlyRevenue = revenues.reduce((sum, r) => sum + r, 0) / revenues.length

  let revenueTrend = 'Flat'
  let revenueTrendPercent = 0
  if (revenues.length > 1) {
    revenueTrendPercent = ((revenues[revenues.length - 1] - revenues[0]) / revenues[0]) * 100
    if (revenueTrendPercent > 5) {
      revenueTrend = 'Growing'
    } else if (revenueTrendPercent < -5) {
      revenueTrend = 'Declining'
    }
  }

  const avgAdb = statements.reduce((sum, s) => sum + (s.average_daily_balance || 0), 0) / statements.length

  const totalNsf = statements.reduce((sum, s) => sum + s.nsf_count, 0)

  const totalMcaObligations = statements.reduce((sum, s) => {
    return sum + (s.mca_positions?.reduce((mSum, d) => mSum + d.total_debited_this_month, 0) || 0)
  }, 0)

  const avgHoldback = statements.reduce((sum, s) => sum + (s.holdback_pct_of_true_revenue || 0), 0) / statements.length

  return {
    avgMonthlyRevenue,
    revenueTrend,
    revenueTrendPercent,
    avgAdb,
    totalNsf,
    totalMcaObligations,
    avgHoldback,
  }
}

export interface MCAPosition {
  funderName: string
  dailyDebit: number
  firstSeen: string
  lastSeen: string
}

export function extractMCAPositions(statements: ParsedBankStatement[]): MCAPosition[] {
  const positions: Record<string, { dailyDebit: number; months: Set<string> }> = {}

  statements.forEach(s => {
    const month = s.statement_month ?? 0
    const year = s.statement_year ?? 0
    const monthKey = `${year}-${String(month).padStart(2, '0')}`
    s.mca_positions?.forEach(d => {
      if (!positions[d.funder_name]) {
        positions[d.funder_name] = { dailyDebit: 0, months: new Set() }
      }
      positions[d.funder_name].dailyDebit = d.amount_per_debit || 0
      positions[d.funder_name].months.add(monthKey)
    })
  })

  return Object.entries(positions)
    .map(([funderName, data]) => {
      const months = Array.from(data.months).sort()
      return {
        funderName,
        dailyDebit: data.dailyDebit,
        firstSeen: months[0] || 'Unknown',
        lastSeen: months[months.length - 1] || 'Unknown',
      }
    })
    .sort((a, b) => b.dailyDebit - a.dailyDebit)
}

export function getMonthLabel(month: number | undefined, year: number | undefined): string {
  if (!month || !year) return 'Unknown Month'
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  return `${monthNames[month - 1]} ${year}`
}

export function getRevenueVariance(statedRevenue: number | null, analyzedRevenue: number): number {
  if (!statedRevenue || statedRevenue === 0) return 0
  return ((statedRevenue - analyzedRevenue) / analyzedRevenue) * 100
}

export interface StatementMetrics {
  month: string
  startBalance: number | null
  endBalance: number | null
  trueRevenue: number
  nonRevenueDeposits: number
  totalDeposits: number
  avgDailyBalance: number | null
  lowestBalance: number | null
  nsfCount: number
  mcaHoldback: number
  holdbackPercent: number
  netCashFlow: number
}

export function generateStatementMetrics(statements: ParsedBankStatement[]): StatementMetrics[] {
  return statements.map(s => ({
    month: getMonthLabel(s.statement_month, s.statement_year),
    startBalance: s.starting_balance,
    endBalance: s.ending_balance,
    trueRevenue: s.true_revenue_total,
    nonRevenueDeposits: s.non_revenue_total,
    totalDeposits: s.total_deposits || 0,
    avgDailyBalance: s.average_daily_balance,
    lowestBalance: s.lowest_daily_balance,
    nsfCount: s.nsf_count,
    mcaHoldback: s.total_mca_holdback,
    holdbackPercent: s.holdback_pct_of_true_revenue || 0,
    netCashFlow: s.net_cash_flow,
  }))
}

export function findLowestAndHighestMonth(statements: ParsedBankStatement[]): {
  lowestMonth: string
  lowestRevenue: number
  highestMonth: string
  highestRevenue: number
} {
  if (statements.length === 0) {
    return { lowestMonth: 'N/A', lowestRevenue: 0, highestMonth: 'N/A', highestRevenue: 0 }
  }

  let lowest = statements[0]
  let highest = statements[0]

  statements.forEach(s => {
    if (s.true_revenue_total < lowest.true_revenue_total) lowest = s
    if (s.true_revenue_total > highest.true_revenue_total) highest = s
  })

  return {
    lowestMonth: getMonthLabel(lowest.statement_month, lowest.statement_year),
    lowestRevenue: lowest.true_revenue_total,
    highestMonth: getMonthLabel(highest.statement_month, highest.statement_year),
    highestRevenue: highest.true_revenue_total,
  }
}
