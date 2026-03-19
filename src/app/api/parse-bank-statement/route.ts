import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import type { ParsedBankStatement } from '@/types'

// Configure timeout for this API route (5 minutes for PDF analysis)
export const maxDuration = 300

// Helper function to calculate statement month/year based on period text
function calculateStatementMonthAndYear(periodText: string | null) {
  const monthNames: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  }

  const monthLabels = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

  if (!periodText || periodText.trim().length === 0) {
    console.log('[parse-bank-statement] ❌ No period text provided - returning "Unknown - check manually"')
    return { label: 'Unknown - check manually', month: 0, year: 0, startDate: null, endDate: null }
  }

  console.log('[parse-bank-statement] 📋 Parsing period text:', periodText)

  // Extract dates from various formats:
  // "January 01, 2026 through January 30, 2026"
  // "November 24, 2025 through December 23, 2025"
  // "December 1, 2025 - December 31, 2025"
  // "Statement Period: 12/01/2025 - 12/31/2025"

  let startMonth: number | null = null
  let startDay: number | null = null
  let startYear: number | null = null
  let endMonth: number | null = null
  let endDay: number | null = null
  let endYear: number | null = null

  // Try pattern 1: "Month DD, YYYY"
  const fullTextMatch = periodText.match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/g)
  if (fullTextMatch && fullTextMatch.length >= 2) {
    // Parse first date
    const firstMatch = fullTextMatch[0].match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/)
    if (firstMatch) {
      const monthName = firstMatch[1].toLowerCase()
      startMonth = monthNames[monthName]
      startDay = parseInt(firstMatch[2])
      startYear = parseInt(firstMatch[3])
    }

    // Parse second date
    const secondMatch = fullTextMatch[fullTextMatch.length - 1].match(/(\w+)\s+(\d{1,2}),\s+(\d{4})/)
    if (secondMatch) {
      const monthName = secondMatch[1].toLowerCase()
      endMonth = monthNames[monthName]
      endDay = parseInt(secondMatch[2])
      endYear = parseInt(secondMatch[3])
    }
  }

  // Try pattern 2: "MM/DD/YYYY" format
  if (!startMonth) {
    const slashMatch = periodText.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)
    if (slashMatch && slashMatch.length >= 2) {
      const firstDate = slashMatch[0].split('/')
      startMonth = parseInt(firstDate[0])
      startDay = parseInt(firstDate[1])
      startYear = parseInt(firstDate[2])

      const secondDate = slashMatch[slashMatch.length - 1].split('/')
      endMonth = parseInt(secondDate[0])
      endDay = parseInt(secondDate[1])
      endYear = parseInt(secondDate[2])
    }
  }

  // If we couldn't extract both dates, return unknown
  if (!startMonth || !startDay || !startYear || !endMonth || !endDay || !endYear) {
    console.log('[parse-bank-statement] ❌ Could not extract complete date range from period text')
    console.log('[parse-bank-statement] ❌ Extracted: start=' + (startMonth ? `${startMonth}/${startDay}/${startYear}` : 'null') +
      ', end=' + (endMonth ? `${endMonth}/${endDay}/${endYear}` : 'null'))
    return { label: 'Unknown - check manually', month: 0, year: 0, startDate: null, endDate: null }
  }

  console.log(`[parse-bank-statement] 📅 Start date found: ${startMonth}/${startDay}/${startYear}`)
  console.log(`[parse-bank-statement] 📅 End date found: ${endMonth}/${endDay}/${endYear}`)

  // Create date objects
  const startDate = new Date(startYear, startMonth - 1, startDay)
  const endDate = new Date(endYear, endMonth - 1, endDay)

  console.log(`[parse-bank-statement] 📊 Start date object: ${startDate.toISOString()}`)
  console.log(`[parse-bank-statement] 📊 End date object: ${endDate.toISOString()}`)

  // Determine which month to label based on day count
  let labelMonth: number
  let labelYear: number

  if (startMonth === endMonth && startYear === endYear) {
    // Entire statement within one calendar month
    labelMonth = startMonth
    labelYear = startYear
    console.log(`[parse-bank-statement] ✅ Statement entirely within one month: ${monthLabels[labelMonth]} ${labelYear}`)
  } else {
    // Statement spans two months - count days in each
    const daysInFirstMonth = getDaysInMonth(startDay, startMonth, startYear, endDay, endMonth, endYear)
    const daysInSecondMonth = getDaysInMonth(startDay, startMonth, startYear, endDay, endMonth, endYear, false)

    console.log(`[parse-bank-statement] 📊 Days in first month (${monthLabels[startMonth]} ${startYear}): ${daysInFirstMonth}`)
    console.log(`[parse-bank-statement] 📊 Days in second month (${monthLabels[endMonth]} ${endYear}): ${daysInSecondMonth}`)

    if (daysInFirstMonth > daysInSecondMonth) {
      labelMonth = startMonth
      labelYear = startYear
      console.log(`[parse-bank-statement] ✅ More days in first month - using: ${monthLabels[labelMonth]} ${labelYear}`)
    } else {
      // Equal or more days in end month
      labelMonth = endMonth
      labelYear = endYear
      console.log(`[parse-bank-statement] ✅ More days (or equal) in second month - using: ${monthLabels[labelMonth]} ${labelYear}`)
    }
  }

  const label = `${monthLabels[labelMonth]} ${labelYear}`
  console.log(`[parse-bank-statement] 🎯 FINAL LABEL: "${label}"`)

  return {
    label,
    month: labelMonth,
    year: labelYear,
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  }
}

function getDaysInMonth(
  startDay: number, startMonth: number, startYear: number,
  endDay: number, endMonth: number, endYear: number,
  isFirstMonth: boolean = true
): number {
  if (isFirstMonth) {
    // Count days from startDay to end of startMonth
    const lastDayOfMonth = new Date(startYear, startMonth, 0).getDate()
    return lastDayOfMonth - startDay + 1
  } else {
    // Count days from beginning of endMonth to endDay
    return endDay
  }
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

    console.log('[parse-bank-statement] ═══════════════════════════════════════')
    console.log('[parse-bank-statement] 📄 STATEMENT LABELING COMPLETE')
    console.log('[parse-bank-statement] ───────────────────────────────────────')
    console.log(`[parse-bank-statement] Period Text: "${parsed.statement_period_text}"`)
    console.log(`[parse-bank-statement] Start Date: ${periodAnalysis.startDate}`)
    console.log(`[parse-bank-statement] End Date: ${periodAnalysis.endDate}`)
    console.log(`[parse-bank-statement] ✅ LABEL ASSIGNED: "${periodAnalysis.label}"`)
    console.log('[parse-bank-statement] ═══════════════════════════════════════')

    const responseData = { data: parsed }
    console.log('[parse-bank-statement] Returning response with data keys:', Object.keys(parsed || {}))
    return NextResponse.json(responseData)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[parse-bank-statement] Unhandled error:', message)
    return NextResponse.json({ error: `Internal server error: ${message}` }, { status: 500 })
  }
}
