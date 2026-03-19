import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import type { ParsedBankStatement } from '@/types'

// Configure timeout for this API route (5 minutes for PDF analysis)
export const maxDuration = 300

// Helper function to calculate statement month/year based on period text
function calculateStatementMonthAndYear(periodText: string | null) {
  if (!periodText) {
    console.log('[parse-bank-statement] No period text provided')
    return { month: 1, year: 2024, startDate: null, endDate: null }
  }

  console.log('[parse-bank-statement] Parsing period text:', periodText)

  // Extract dates from various formats:
  // "January 01, 2026 through January 30, 2026"
  // "November 24, 2025 through December 23, 2025"
  // "December 1, 2025 - December 31, 2025"
  // "01/01/2026 - 01/31/2026"

  const monthNames: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  }

  // Try to match pattern: "Month DD, YYYY through Month DD, YYYY"
  let startMatch = periodText.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/)
  let endMatch = periodText.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})(?!.*\w+\s+\d{1,2})/g)

  if (!startMatch) {
    // Try MM/DD/YYYY format
    startMatch = periodText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
    if (startMatch) {
      const month = parseInt(startMatch[1])
      const day = parseInt(startMatch[2])
      const year = parseInt(startMatch[3])
      startMatch = [startMatch[0], month.toString(), day.toString(), year.toString()]
    }
  }

  if (!startMatch) {
    console.log('[parse-bank-statement] Could not parse start date from period text')
    return { month: 1, year: 2024, startDate: null, endDate: null }
  }

  // Parse start date
  let startMonth: number, startDay: number, startYear: number
  if (isNaN(parseInt(startMatch[1]))) {
    // Month name format
    startMonth = monthNames[startMatch[1].toLowerCase()] || 1
    startDay = parseInt(startMatch[2])
    startYear = parseInt(startMatch[3])
  } else {
    // Numeric format
    startMonth = parseInt(startMatch[1])
    startDay = parseInt(startMatch[2])
    startYear = parseInt(startMatch[3])
  }

  console.log(`[parse-bank-statement] Start date: ${startMonth}/${startDay}/${startYear}`)

  // Extract end date - look for second occurrence
  const parts = periodText.split(/through|to|-/)
  let endMonth: number = startMonth, endDay: number = startDay, endYear: number = startYear

  if (parts.length > 1) {
    const endPart = parts[parts.length - 1].trim()
    let endDateMatch = endPart.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/)

    if (!endDateMatch) {
      // Try MM/DD/YYYY format
      endDateMatch = endPart.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/)
      if (endDateMatch) {
        endMonth = parseInt(endDateMatch[1])
        endDay = parseInt(endDateMatch[2])
        endYear = parseInt(endDateMatch[3])
      }
    } else if (!isNaN(parseInt(endDateMatch[1]))) {
      // Numeric month
      endMonth = parseInt(endDateMatch[1])
      endDay = parseInt(endDateMatch[2])
      endYear = parseInt(endDateMatch[3])
    } else {
      // Month name
      endMonth = monthNames[endDateMatch[1].toLowerCase()] || startMonth
      endDay = parseInt(endDateMatch[2])
      endYear = parseInt(endDateMatch[3])
    }
  }

  console.log(`[parse-bank-statement] End date: ${endMonth}/${endDay}/${endYear}`)

  const startDate = new Date(startYear, startMonth - 1, startDay)
  const endDate = new Date(endYear, endMonth - 1, endDay)

  // Determine which month to label
  let labelMonth: number, labelYear: number

  if (startMonth === endMonth && startYear === endYear) {
    // Single month - use that month
    labelMonth = startMonth
    labelYear = startYear
    console.log(`[parse-bank-statement] Single calendar month - using ${labelMonth}/${labelYear}`)
  } else {
    // Spans two months - count days in each month
    const daysInStartMonth = countDaysInMonth(startDay, startMonth, startYear, endDate)
    const daysInEndMonth = countDaysInMonth(1, endMonth, endYear, endDate)

    console.log(`[parse-bank-statement] Cross-month statement: ${daysInStartMonth} days in month ${startMonth}, ${daysInEndMonth} days in month ${endMonth}`)

    if (daysInStartMonth > daysInEndMonth) {
      labelMonth = startMonth
      labelYear = startYear
      console.log(`[parse-bank-statement] More days in start month - using ${labelMonth}/${labelYear}`)
    } else {
      // End month has more days, or equal (use end month)
      labelMonth = endMonth
      labelYear = endYear
      console.log(`[parse-bank-statement] More days (or equal) in end month - using ${labelMonth}/${labelYear}`)
    }
  }

  return {
    month: labelMonth,
    year: labelYear,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  }
}

function countDaysInMonth(startDay: number, month: number, year: number, endDate: Date): number {
  const periodStart = new Date(year, month - 1, startDay)
  const periodEnd = new Date(year, month - 1 + 1, 0) // Last day of month

  // If the period extends beyond this month, count only to month end or period end
  const actualEnd = periodEnd < endDate ? periodEnd : endDate
  if (periodStart > endDate) return 0

  const daysDiff = Math.floor((actualEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1
  return Math.max(0, daysDiff)
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const SYSTEM_PROMPT = `You are an expert MCA underwriter analyzing bank statements for merchant funding.
Extract all financial data from the provided bank statement PDF.
Return ONLY valid JSON — no markdown, no explanation.
Use null for fields that cannot be determined. Use 0 for counts/balances if unknown.`

const USER_PROMPT = `Extract financial data from this bank statement PDF. Return as JSON:

{
  "statement_period_text": "string - the exact statement period text as it appears on the PDF, like 'January 01, 2026 through January 30, 2026'",
  "statement_month": number 1-12 (for now, will be recalculated based on period_text),
  "statement_year": number 4-digit year,
  "starting_balance": number or null,
  "ending_balance": number or null,
  "total_deposits": number total amount of all deposits,
  "deposit_count": number count of deposit transactions,
  "true_revenue_deposits": number amount of actual business revenue (POS, ACH customer payments, etc),
  "non_revenue_deposits": number transfers, loans, personal contributions, refunds,
  "average_daily_balance": number or null,
  "lowest_daily_balance": number or null,
  "nsf_count": number of NSF/returned item events,
  "nsf_dates": array of YYYY-MM-DD dates when NSF occurred,
  "nsf_amounts": array of dollar amounts for each NSF,
  "mca_debits": array of {
    "funder_name": "string - name of MCA lender or ACH operator",
    "daily_amount": number or null - if daily frequency,
    "weekly_amount": number or null - if weekly frequency,
    "frequency": "daily" or "weekly",
    "total_monthly": number total debited this month
  } or null if no MCA detected,
  "total_mca_holdback": number sum of all MCA debits,
  "holdback_percentage": number (holdback / true_revenue * 100),
  "net_cash_flow_after_mca": number (total_deposits - total_withdrawals - mca_holdback),
  "days_below_500": number of days ending balance was below 500,
  "days_below_1000": number of days ending balance was below 1000
}

Common MCA lenders: Bizfi, Greenbox, CAN Capital, OnDeck, Kabbage, PayPal Working Capital, Square Capital, Shopify Capital.
Look for recurring daily/weekly ACH debits with consistent amounts — those are MCA payments.
Return ONLY the JSON object. No markdown.`

export async function POST(request: NextRequest) {
  try {
    console.log('[parse-bank-statement] Received request')
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('[parse-bank-statement] ANTHROPIC_API_KEY not configured')
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })

    let formData
    try {
      console.log('[parse-bank-statement] Parsing form data...')
      formData = await request.formData()
      console.log('[parse-bank-statement] Form data parsed')
    } catch (err) {
      console.error('[parse-bank-statement] Failed to parse form data:', err)
      return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 })
    }

    const file = formData.get('pdf') as File
    console.log('[parse-bank-statement] File:', file?.name, `(${file?.size} bytes)`)

    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      console.log('[parse-bank-statement] Invalid or missing PDF file')
      return NextResponse.json({ error: 'Invalid or missing PDF file' }, { status: 400 })
    }

    let arrayBuffer
    try {
      console.log('[parse-bank-statement] Reading file buffer...')
      arrayBuffer = await file.arrayBuffer()
      console.log('[parse-bank-statement] File buffer read, size:', arrayBuffer.byteLength)
    } catch (err) {
      console.error('[parse-bank-statement] Failed to read file:', err)
      return NextResponse.json({ error: 'Failed to read file' }, { status: 400 })
    }

    console.log('[parse-bank-statement] Converting to base64...')
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    console.log('[parse-bank-statement] Base64 size:', base64.length)

    let response
    try {
      console.log('[parse-bank-statement] Calling Anthropic API...')
      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
              { type: 'text', text: USER_PROMPT },
            ],
          },
        ],
      })
      console.log('[parse-bank-statement] API call successful')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'API call failed'
      console.error('[parse-bank-statement] API call failed:', errorMsg)
      return NextResponse.json({ error: `Failed to analyze PDF: ${errorMsg}` }, { status: 500 })
    }

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''
    console.log('[parse-bank-statement] Raw response text length:', rawText.length)
    console.log('[parse-bank-statement] Raw response text preview:', rawText.substring(0, 300))

    if (!rawText) {
      console.log('[parse-bank-statement] No text response from AI model')
      return NextResponse.json({ error: 'No text response from AI model' }, { status: 500 })
    }

    let jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    console.log('[parse-bank-statement] Cleaned JSON text length:', jsonText.length)

    // Try to extract JSON if it's embedded in text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      console.log('[parse-bank-statement] Extracted JSON from text')
      jsonText = jsonMatch[0]
    }

    let parsed: ParsedBankStatement
    try {
      console.log('[parse-bank-statement] Parsing JSON...')
      parsed = JSON.parse(jsonText)
      console.log('[parse-bank-statement] JSON parsed successfully')
    } catch (err) {
      const parseErr = err instanceof Error ? err.message : 'Invalid JSON'
      console.error('[parse-bank-statement] JSON parse failed:', parseErr)
      console.error('[parse-bank-statement] JSON text that failed to parse:', jsonText.substring(0, 500))
      return NextResponse.json({ error: `Failed to parse extracted data: ${parseErr}` }, { status: 500 })
    }

    // Recalculate statement month/year based on period text
    const periodAnalysis = calculateStatementMonthAndYear(parsed.statement_period_text)
    parsed.statement_month = periodAnalysis.month
    parsed.statement_year = periodAnalysis.year
    parsed.statement_start_date = periodAnalysis.startDate
    parsed.statement_end_date = periodAnalysis.endDate

    console.log('[parse-bank-statement] Statement labeling result:', {
      periodText: parsed.statement_period_text,
      startDate: periodAnalysis.startDate,
      endDate: periodAnalysis.endDate,
      label: `${periodAnalysis.month}/${periodAnalysis.year}`,
    })

    const responseData = { data: parsed }
    console.log('[parse-bank-statement] Returning response with data keys:', Object.keys(parsed || {}))
    return NextResponse.json(responseData)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[parse-bank-statement] Unhandled error:', message)
    return NextResponse.json({ error: `Internal server error: ${message}` }, { status: 500 })
  }
}
