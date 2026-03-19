import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import type { ParsedApplication } from '@/types'

const SYSTEM_PROMPT = `You are an expert MCA underwriter reviewing merchant loan applications.
Extract all requested fields from the provided application PDF.
Return ONLY valid JSON — no markdown, no explanation.
Use null for any fields that cannot be determined from the document.`

const USER_PROMPT = `Extract the following fields from this merchant application PDF and return as JSON:

{
  "business_legal_name": "string or null - official legal business name",
  "dba": "string or null - doing business as name if different",
  "owner_name": "string or null",
  "owner_dob": "YYYY-MM-DD or null",
  "owner_ssn_last4": "last 4 digits only, no dashes, or null",
  "business_address": "string or null - full address",
  "business_phone": "string or null",
  "business_email": "string or null",
  "ein": "string or null - 9 digits with hyphen format",
  "time_in_business_years": "number or null - years as decimal",
  "stated_monthly_revenue": "number or null - average monthly revenue",
  "bank_name": "string or null - primary operating bank",
  "landlord_name": "string or null",
  "monthly_rent": "number or null",
  "use_of_funds": "string or null - stated purpose",
  "co_owners": "array of {name: string, percentage: number} or null"
}

Return ONLY the JSON object. No markdown code blocks.`

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
      max_tokens: 1024,
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

    const parsed: ParsedApplication = JSON.parse(jsonText)
    return NextResponse.json({ data: parsed })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
