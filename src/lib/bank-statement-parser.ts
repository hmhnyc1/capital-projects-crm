/**
 * PART 4: BANK STATEMENT PARSER - MASTER PARSER ENGINE
 *
 * This is THE most critical file in the entire parsing system.
 * Handles comprehensive extraction of all financial data from bank statements
 * across ALL bank formats, with special handling for MCA debits, revenue classification,
 * daily balance calculations, NSF events, and cash flow analysis.
 */

'use server'

import Anthropic from '@anthropic-ai/sdk'
import { detectBank } from './bank-detection'
import { MCA_FUNDERS, NON_MCA_PATTERNS } from './mca-funders'
import { extractStatementPeriod } from './date-extraction'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ParsedDeposit {
  date: string // YYYY-MM-DD
  description: string
  amount: number
  source_name?: string
}

export interface ParsedWithdrawal {
  date: string // YYYY-MM-DD
  description: string
  amount: number
}

export interface NSFEvent {
  date: string // YYYY-MM-DD
  amount: number
  description: string
  fee_charged: number
}

export interface MCAPosition {
  funder_name: string
  descriptor_matched: string
  amount_per_debit: number
  frequency: string // Daily, Weekly, Monthly
  total_debited_this_month: number
  debit_dates: string[] // YYYY-MM-DD
}

export interface DailyBalance {
  date: string // YYYY-MM-DD
  balance: number
  status: 'OK' | 'LOW' | 'CRITICAL'
}

export interface ParsedBankStatement {
  // Bank identification
  bank_name: string
  account_number_last4: string | null
  routing_number: string | null

  // Statement period
  statement_period_start: string | null // YYYY-MM-DD
  statement_period_end: string | null // YYYY-MM-DD
  statement_month_label: string | null // e.g., "January 2026"

  // Opening and closing balances
  starting_balance: number | null
  ending_balance: number | null

  // Deposit analysis
  total_deposits: number | null
  deposit_count: number | null
  revenue_deposits: ParsedDeposit[]
  non_revenue_deposits: ParsedDeposit[]
  true_revenue_total: number
  non_revenue_total: number

  // Daily balance analysis
  average_daily_balance: number | null
  lowest_daily_balance: number | null
  lowest_balance_date: string | null
  highest_daily_balance: number | null
  highest_balance_date: string | null

  // Days below various thresholds (for cash flow risk assessment)
  days_below_500: number
  days_below_1000: number
  days_below_2000: number

  // Withdrawal analysis
  total_withdrawals: number | null
  withdrawal_count: number | null

  // NSF and overdraft events
  nsf_events: NSFEvent[]
  nsf_count: number
  nsf_total_amount: number

  // MCA position analysis
  mca_positions: MCAPosition[]
  total_mca_holdback: number
  holdback_pct_of_true_revenue: number | null
  holdback_pct_of_total_deposits: number | null

  // Daily balance details
  daily_balances: DailyBalance[]

  // Notable transactions
  largest_single_deposit: ParsedDeposit | null
  largest_single_withdrawal: ParsedWithdrawal | null

  // Cash flow summary
  net_cash_flow: number

  // Quality metrics
  confidence_score: number
  low_confidence_fields: string[]
  parsing_notes: string[]
}

// ============================================================================
// CLAUDE PROMPT CONSTRUCTION
// ============================================================================

/**
 * Builds the comprehensive prompt for Claude API to parse bank statements
 * This prompt is multiple pages long and covers ALL edge cases
 */
function buildStatementParsingPrompt(
  pdfText: string,
  bankDetection: ReturnType<typeof detectBank>,
  dateExtraction: ReturnType<typeof extractStatementPeriod>
): string {
  // Build MCA funder reference list
  const mcaFundersList = Object.entries(MCA_FUNDERS)
    .map(([_, funder]) => {
      const descriptors = funder.descriptors.join(' | ')
      return `- ${funder.name} (${funder.type}): ${descriptors}`
    })
    .join('\n')

  // Build non-MCA pattern reference list
  const nonMCAPatternsList = NON_MCA_PATTERNS.map(pattern => {
    return `- ${pattern.category}: ${pattern.descriptors.join(', ')}`
  }).join('\n')

  return `You are an expert bank statement analyst and MCA underwriter. Your job is to extract EVERY piece of financial data from merchant bank statements with perfect accuracy.

CRITICAL REQUIREMENTS:
1. Extract ONLY data actually present in the statement - NEVER guess or assume
2. Return null for any field not found in the statement
3. Be especially careful with MCA identification - do not misclassify legitimate business expenses
4. Handle all date formats and edge cases (cross-month periods, unusual formatting)
5. Calculate true revenue (excluding inter-account transfers, loans, refunds, non-business deposits)
6. Identify NSF events even when labeled differently by each bank
7. Calculate daily balances even if not explicitly listed (use running balance method)
8. Handle statements with missing sections or incomplete data

STATEMENT INFORMATION:
- Detected Bank: ${bankDetection.bankName}
- Detected Routing Number: ${bankDetection.routingNumber || 'Not found'}
- Statement Period: ${dateExtraction.startDate} to ${dateExtraction.endDate}
- Expected Month Label: ${dateExtraction.monthLabel || 'Unknown'}

BANK-SPECIFIC FORMATTING NOTES:
${
  bankDetection.profile
    ? `Bank: ${bankDetection.profile.bankName}
  - Deposit Section Labels: ${bankDetection.profile.depositSectionLabels.join(', ')}
  - Withdrawal Section Labels: ${bankDetection.profile.withdrawalSectionLabels.join(', ')}
  - Daily Balance Labels: ${bankDetection.profile.dailyBalanceLabels.join(', ')}
  - NSF Labels: ${bankDetection.profile.nsfLabels.join(', ')}
  - Known Quirks: ${bankDetection.profile.quirks.join('; ')}`
    : 'Unknown bank - use general banking conventions'
}

MCA FUNDERS TO IDENTIFY (LOOK FOR THESE IN ACH DESCRIPTORS):
${mcaFundersList}

NON-MCA PATTERNS TO EXCLUDE FROM MCA DETECTION:
${nonMCAPatternsList}

KEY EXTRACTION RULES:

DEPOSITS AND REVENUE:
- Identify ALL deposit/credit transactions
- Classify each deposit as REVENUE or NON-REVENUE:
  * REVENUE deposits: ACH deposits from customers, credit card deposits, payment processor deposits
  * NON-REVENUE deposits: Inter-account transfers, loan deposits, refunds, supplier credits, loan proceeds
- For revenue deposits, try to identify the source (e.g., "PayPal", "Stripe", "Direct Customer", "Delivery Platform")
- Calculate true_revenue_total as sum of ALL revenue deposits
- Calculate non_revenue_total as sum of ALL non-revenue deposits
- total_deposits = true_revenue + non_revenue

WITHDRAWALS AND MCA DEBITS:
- Identify ALL withdrawal/debit transactions
- For each potential MCA debit:
  * Check if ACH descriptor matches any MCA funder in the list above
  * Record the funder name and descriptor matched
  * Note the amount, date, and frequency pattern
  * Calculate total MCA holdback for the period
- Calculate holdback_pct_of_true_revenue as (total_mca_holdback / true_revenue_total) * 100
- Calculate holdback_pct_of_total_deposits as (total_mca_holdback / total_deposits) * 100

DAILY BALANCES:
- Extract daily ending balances if explicitly listed in the statement
- If daily balances not explicitly shown:
  * Use running balance method: opening balance + deposits - withdrawals for each day
  * This will provide approximate daily balances
- Classify each day's balance:
  * CRITICAL: < $500
  * LOW: $500 - $2,000
  * OK: > $2,000
- Count days below: $500, $1,000, $2,000
- Calculate average_daily_balance as mean of all daily balances
- Identify lowest_daily_balance and highest_daily_balance with dates

NSF AND OVERDRAFT EVENTS:
- Look for transactions labeled: "Returned Item", "NSF", "Insufficient Funds", "Overdraft", "Returned Check", "Non-Sufficient Funds"
- Some banks show NSF as a separate fee line item (look for small fees like $25-$50)
- Each NSF represents an overdrawn account condition
- Record date, amount NSF'd, description, and fee charged (if any)

CASH FLOW CALCULATION:
- net_cash_flow = true_revenue_total - total_withdrawals
- This shows if the business is cash flow positive or negative

CONFIDENCE AND QUALITY:
- confidence_score: 0-100, where 100 = all fields found and clear, 0 = unable to extract
- low_confidence_fields: list any field names where data is uncertain, ambiguous, or required interpretation
- parsing_notes: observations about unusual formatting, missing sections, or data quality issues

BANK STATEMENT TEXT TO ANALYZE:
${pdfText.substring(0, 10000)}

Return ONLY a valid JSON object with this exact structure (use null for missing fields):
{
  "account_number_last4": "####" or null,
  "routing_number": "string" or null,
  "starting_balance": number or null,
  "ending_balance": number or null,
  "total_deposits": number or null,
  "deposit_count": number,
  "revenue_deposits": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number,
      "source_name": "string or null"
    }
  ],
  "non_revenue_deposits": [
    {
      "date": "YYYY-MM-DD",
      "description": "string",
      "amount": number
    }
  ],
  "true_revenue_total": number,
  "non_revenue_total": number,
  "average_daily_balance": number or null,
  "lowest_daily_balance": number or null,
  "lowest_balance_date": "YYYY-MM-DD" or null,
  "highest_daily_balance": number or null,
  "highest_balance_date": "YYYY-MM-DD" or null,
  "days_below_500": number,
  "days_below_1000": number,
  "days_below_2000": number,
  "total_withdrawals": number or null,
  "withdrawal_count": number,
  "nsf_events": [
    {
      "date": "YYYY-MM-DD",
      "amount": number,
      "description": "string",
      "fee_charged": number
    }
  ],
  "nsf_count": number,
  "nsf_total_amount": number,
  "mca_positions": [
    {
      "funder_name": "string",
      "descriptor_matched": "string",
      "amount_per_debit": number,
      "frequency": "Daily|Weekly|Monthly",
      "total_debited_this_month": number,
      "debit_dates": ["YYYY-MM-DD", ...]
    }
  ],
  "total_mca_holdback": number,
  "holdback_pct_of_true_revenue": number or null,
  "holdback_pct_of_total_deposits": number or null,
  "daily_balances": [
    {
      "date": "YYYY-MM-DD",
      "balance": number,
      "status": "OK|LOW|CRITICAL"
    }
  ],
  "largest_single_deposit": {
    "date": "YYYY-MM-DD",
    "description": "string",
    "amount": number,
    "source_name": "string or null"
  } or null,
  "largest_single_withdrawal": {
    "date": "YYYY-MM-DD",
    "description": "string",
    "amount": number
  } or null,
  "net_cash_flow": number,
  "confidence_score": number (0-100),
  "low_confidence_fields": ["field_name", ...],
  "parsing_notes": ["observation1", "observation2", ...]
}

Important:
- Return ONLY valid JSON, no markdown or explanation
- All amounts as numbers without symbols or commas
- All dates in YYYY-MM-DD format
- Thoroughly analyze the entire statement, not just first page
- Be conservative with MCA identification - only flag if descriptor clearly matches a known funder`
}

// ============================================================================
// MAIN PARSING FUNCTION
// ============================================================================

export async function parseBankStatement(
  pdfText: string,
  fileName: string
): Promise<ParsedBankStatement> {
  console.log(`[bank-statement-parser] Starting parse for file: ${fileName}`)

  // Input validation
  if (!pdfText || typeof pdfText !== 'string' || pdfText.trim().length === 0) {
    console.error('[bank-statement-parser] No PDF text provided')
    throw new Error('PDF text extraction failed - no text content available')
  }

  try {
    // Step 1: Bank detection
    console.log('[bank-statement-parser] Running bank detection...')
    const bankDetection = detectBank(pdfText)
    if (bankDetection.confidence < 70) {
      console.warn('[bank-statement-parser] Low confidence bank detection, continuing with unknown bank')
    }

    // Step 2: Date extraction
    console.log('[bank-statement-parser] Extracting statement period...')
    const dateExtraction = extractStatementPeriod(pdfText)
    if (!dateExtraction.startDate || !dateExtraction.endDate) {
      console.warn('[bank-statement-parser] Could not extract statement period - flagging for manual review')
    }

    // Step 3: Build comprehensive prompt
    console.log('[bank-statement-parser] Building Claude prompt...')
    const prompt = buildStatementParsingPrompt(pdfText, bankDetection, dateExtraction)

    // Step 4: Call Claude API
    console.log('[bank-statement-parser] Calling Claude Sonnet 4.6 API...')
    const client = new Anthropic()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Step 5: Parse Claude response
    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : ''
    console.log(`[bank-statement-parser] Received response (${responseText.length} chars)`)

    let parsedData: any = {}
    try {
      parsedData = JSON.parse(responseText)
      console.log('[bank-statement-parser] Successfully parsed Claude JSON response')
    } catch (parseError) {
      console.error('[bank-statement-parser] Failed to parse Claude response as JSON:', parseError)
      console.error('[bank-statement-parser] Response text:', responseText.substring(0, 500))
      throw new Error('Claude returned invalid JSON')
    }

    // Step 6: Build result object with defaults
    const result: ParsedBankStatement = {
      bank_name: bankDetection.bankName,
      account_number_last4: parsedData.account_number_last4 || null,
      routing_number: bankDetection.routingNumber || parsedData.routing_number || null,

      statement_period_start: dateExtraction.startDate,
      statement_period_end: dateExtraction.endDate,
      statement_month_label: dateExtraction.monthLabel,

      starting_balance: safeNumber(parsedData.starting_balance),
      ending_balance: safeNumber(parsedData.ending_balance),

      total_deposits: safeNumber(parsedData.total_deposits),
      deposit_count: safeNumber(parsedData.deposit_count) || 0,
      revenue_deposits: Array.isArray(parsedData.revenue_deposits) ? parsedData.revenue_deposits : [],
      non_revenue_deposits: Array.isArray(parsedData.non_revenue_deposits) ? parsedData.non_revenue_deposits : [],
      true_revenue_total: safeNumber(parsedData.true_revenue_total) || 0,
      non_revenue_total: safeNumber(parsedData.non_revenue_total) || 0,

      average_daily_balance: safeNumber(parsedData.average_daily_balance),
      lowest_daily_balance: safeNumber(parsedData.lowest_daily_balance),
      lowest_balance_date: parsedData.lowest_balance_date || null,
      highest_daily_balance: safeNumber(parsedData.highest_daily_balance),
      highest_balance_date: parsedData.highest_balance_date || null,

      days_below_500: safeNumber(parsedData.days_below_500) || 0,
      days_below_1000: safeNumber(parsedData.days_below_1000) || 0,
      days_below_2000: safeNumber(parsedData.days_below_2000) || 0,

      total_withdrawals: safeNumber(parsedData.total_withdrawals),
      withdrawal_count: safeNumber(parsedData.withdrawal_count) || 0,

      nsf_events: Array.isArray(parsedData.nsf_events) ? parsedData.nsf_events : [],
      nsf_count: safeNumber(parsedData.nsf_count) || 0,
      nsf_total_amount: safeNumber(parsedData.nsf_total_amount) || 0,

      mca_positions: Array.isArray(parsedData.mca_positions) ? parsedData.mca_positions : [],
      total_mca_holdback: safeNumber(parsedData.total_mca_holdback) || 0,
      holdback_pct_of_true_revenue: safeNumber(parsedData.holdback_pct_of_true_revenue),
      holdback_pct_of_total_deposits: safeNumber(parsedData.holdback_pct_of_total_deposits),

      daily_balances: Array.isArray(parsedData.daily_balances) ? parsedData.daily_balances : [],

      largest_single_deposit: parsedData.largest_single_deposit || null,
      largest_single_withdrawal: parsedData.largest_single_withdrawal || null,

      net_cash_flow: safeNumber(parsedData.net_cash_flow) || 0,

      confidence_score: Math.min(100, safeNumber(parsedData.confidence_score) || 50),
      low_confidence_fields: Array.isArray(parsedData.low_confidence_fields)
        ? parsedData.low_confidence_fields
        : [],
      parsing_notes: Array.isArray(parsedData.parsing_notes) ? parsedData.parsing_notes : [],
    }

    console.log(`[bank-statement-parser] Parse complete. Bank: ${result.bank_name}, Confidence: ${result.confidence_score}%`)

    // Ensure result is fully serializable for server actions
    console.log(`[bank-statement-parser] Serializing result...`)
    try {
      const serialized = JSON.parse(JSON.stringify(result))
      console.log(`[bank-statement-parser] ✓ Serialization successful`)
      return serialized as ParsedBankStatement
    } catch (serializationError) {
      console.error(`[bank-statement-parser] Serialization failed:`, serializationError)
      throw new Error(`Result serialization failed: ${serializationError instanceof Error ? serializationError.message : String(serializationError)}`)
    }
  } catch (error) {
    console.error('[bank-statement-parser] Fatal error:', error)
    throw error
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely converts value to number, returns null if not valid
 */
function safeNumber(value: any): number | null {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return isNaN(num) ? null : num
}
