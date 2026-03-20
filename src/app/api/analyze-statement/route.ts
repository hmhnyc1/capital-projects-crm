import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are an expert MCA (Merchant Cash Advance) underwriter and bank statement analyst.
You analyze bank statements to extract financial data and assess risk for MCA funding decisions.
Always respond with valid JSON only — no markdown, no explanation, just the JSON object.`

const USER_PROMPT = `Analyze this bank statement PDF and extract all financial data. Return a JSON object with exactly this structure:

{
  "merchant_name": "string or null",
  "account_number": "last 4 digits only, e.g. ****1234, or null",
  "bank_name": "string or null",
  "statement_period": "e.g. January 1, 2024 - January 31, 2024, or null",
  "statement_month": number or null,
  "statement_year": number or null,
  "starting_balance": number or null,
  "ending_balance": number or null,
  "total_deposits": number,
  "deposit_count": number,
  "total_withdrawals": number,
  "withdrawal_count": number,
  "average_daily_balance": number or null,
  "lowest_daily_balance": number or null,
  "lowest_balance_date": "YYYY-MM-DD or null",
  "nsf_count": number,
  "nsf_dates": ["YYYY-MM-DD"],
  "mca_debits": [
    {
      "name": "exact ACH/debit description",
      "amount_per_occurrence": number,
      "occurrences": number,
      "total_debited": number,
      "frequency": "daily | weekly | monthly | other"
    }
  ],
  "total_mca_holdback": number,
  "holdback_percentage": number,
  "true_revenue_deposits": number,
  "non_revenue_deposits": number,
  "non_revenue_deposit_details": ["description of non-revenue items"],
  "daily_ending_balances": [
    { "date": "YYYY-MM-DD", "balance": number }
  ],
  "largest_single_deposit": number,
  "largest_single_deposit_description": "string or null",
  "risk_flags": [
    {
      "level": "high | medium | low",
      "code": "NSF | STACKING | HIGH_HOLDBACK | DECLINING_BALANCE | LOW_BALANCE | NEGATIVE_BALANCE | LARGE_CASH_DEPOSITS | ROUND_NUMBER_DEPOSITS | IRREGULAR_ACTIVITY",
      "message": "human-readable description"
    }
  ],
  "recommended_advance": number,
  "position_recommendation": "1st | 2nd | decline",
  "underwriter_summary": "2-3 sentence summary of the account health and fundability"
}

MCA debit identification rules:
- Look for recurring ACH debits with consistent amounts (daily/weekly) — these are MCA payments
- Common MCA lender names: Bizfi, Greenbox, CAN Capital, OnDeck, Kabbage, PayPal Working Capital, Square Capital, Shopify Capital, Libertas, Expansion Capital, Credibly, Fundbox, BlueVine, Fora Financial, Rapid Finance, National Funding
- Also flag any ACH debit that appears daily or weekly with the same amount as likely MCA
- total_mca_holdback = sum of all MCA debits for the month
- holdback_percentage = (total_mca_holdback / total_deposits) * 100

Revenue classification:
- true_revenue_deposits: actual business revenue (sales, customer payments, POS deposits, ACH credits from customers)
- non_revenue_deposits: transfers from personal accounts, loan proceeds, refunds, owner contributions

Risk flag rules:
- NSF: flag HIGH if nsf_count > 0
- STACKING: flag HIGH if more than 1 MCA lender detected
- HIGH_HOLDBACK: flag HIGH if holdback_percentage > 20%, MEDIUM if 10-20%
- DECLINING_BALANCE: flag MEDIUM if ending_balance < starting_balance by more than 20%
- LOW_BALANCE: flag MEDIUM if lowest_daily_balance < 1000
- NEGATIVE_BALANCE: flag HIGH if any daily balance is negative
- LARGE_CASH_DEPOSITS: flag LOW if any single deposit > 50% of monthly total
- ROUND_NUMBER_DEPOSITS: flag LOW if many deposits are round numbers (may indicate cash)

recommended_advance = true_revenue_deposits * 0.10 (10% of true monthly revenue, rounded to nearest 500)

Return ONLY the JSON. No markdown code blocks. No explanation.`

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  return NextResponse.json({
    configured: !!apiKey,
    preview: apiKey ? `${apiKey.slice(0, 10)}...` : null,
    length: apiKey?.length ?? 0,
    env: process.env.NODE_ENV,
  })
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY

    // Debug: log key info server-side
    console.log('[analyze-statement] ANTHROPIC_API_KEY configured:', !!apiKey)
    console.log('[analyze-statement] Key preview:', apiKey ? `${apiKey.slice(0, 10)}...` : 'NOT SET')
    console.log('[analyze-statement] Key length:', apiKey?.length ?? 0)

    if (!apiKey) {
      return NextResponse.json({
        error: 'ANTHROPIC_API_KEY is not set in server environment variables.',
        debug: { configured: false, env: process.env.NODE_ENV },
      }, { status: 500 })
    }

    if (!apiKey.startsWith('sk-ant-')) {
      return NextResponse.json({
        error: 'ANTHROPIC_API_KEY appears malformed (should start with sk-ant-).',
        debug: { configured: true, preview: `${apiKey.slice(0, 10)}...`, length: apiKey.length },
      }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })

    const formData = await request.formData()
    const file = formData.get('pdf') as File

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    // Convert PDF to base64
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: USER_PROMPT,
            },
          ],
        },
      ],
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Strip markdown code fences if present
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    let analysis
    try {
      analysis = JSON.parse(jsonText)
    } catch {
      return NextResponse.json({ error: 'Failed to parse Claude response', raw: rawText }, { status: 500 })
    }

    return NextResponse.json({ analysis })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
