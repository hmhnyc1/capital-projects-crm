import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import type { ParsedBankStatement } from '@/types'

const SYSTEM_PROMPT = `You are an expert MCA underwriter analyzing bank statements for merchant funding.
Extract all financial data from the provided bank statement PDF.
Return ONLY valid JSON — no markdown, no explanation.
Use null for fields that cannot be determined. Use 0 for counts/balances if unknown.`

const USER_PROMPT = `Extract financial data from this bank statement PDF. Return as JSON:

{
  "statement_month": number 1-12,
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
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })
    const formData = await request.formData()
    const file = formData.get('pdf') as File

    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json({ error: 'Invalid or missing PDF file' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const response = await client.messages.create({
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

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    const parsed: ParsedBankStatement = JSON.parse(jsonText)
    return NextResponse.json({ data: parsed })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
