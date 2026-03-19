import type { UploadedFile, ParsedBankStatement } from '@/types'

export function generateLabel(file: UploadedFile): string {
  if (file.type === 'application') {
    return 'Application'
  }

  if (file.type === 'bank_statement') {
    if (file.data && 'statement_month' in file.data) {
      const data = file.data as ParsedBankStatement
      try {
        const month = new Date(data.statement_year, data.statement_month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        return month
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
    if (aData.statement_year !== bData.statement_year) {
      return aData.statement_year - bData.statement_year
    }
    return aData.statement_month - bData.statement_month
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
    ? statements.reduce((sum, s) => sum + s.true_revenue_deposits, 0) / statements.length
    : 0

  const revenues = statements.map(s => s.true_revenue_deposits)
  const revenueTrend =
    revenues.length < 2 ? 'N/A' :
    revenues[revenues.length - 1] > revenues[0] ? 'Growing' :
    revenues[revenues.length - 1] < revenues[0] ? 'Declining' :
    'Flat'

  return { totalMonths, dateRange, avgMonthlyRevenue, revenueTrend }
}
