import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import type { ParsedApplication } from '@/types'

// Configure timeout for this API route (5 minutes for PDF analysis)
export const maxDuration = 300

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
    console.log('[parse-application] Received request')
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      console.error('[parse-application] ANTHROPIC_API_KEY not configured')
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    const client = new Anthropic({ apiKey })

    let formData
    try {
      console.log('[parse-application] Parsing form data...')
      formData = await request.formData()
      console.log('[parse-application] Form data parsed')
    } catch (err) {
      console.error('[parse-application] Failed to parse form data:', err)
      return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 })
    }

    const file = formData.get('pdf') as File
    console.log('[parse-application] File:', file?.name, `(${file?.size} bytes)`)

    if (!file || !file.name.toLowerCase().endsWith('.pdf')) {
      console.log('[parse-application] Invalid or missing PDF file')
      return NextResponse.json({ error: 'Invalid or missing PDF file' }, { status: 400 })
    }

    let arrayBuffer
    try {
      console.log('[parse-application] Reading file buffer...')
      arrayBuffer = await file.arrayBuffer()
      console.log('[parse-application] File buffer read, size:', arrayBuffer.byteLength)
    } catch (err) {
      console.error('[parse-application] Failed to read file:', err)
      return NextResponse.json({ error: 'Failed to read file' }, { status: 400 })
    }

    console.log('[parse-application] Converting to base64...')
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    console.log('[parse-application] Base64 size:', base64.length)

    let response
    try {
      console.log('[parse-application] Calling Anthropic API...')
      response = await client.messages.create({
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
      console.log('[parse-application] API call successful')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'API call failed'
      console.error('[parse-application] API call failed:', errorMsg)
      return NextResponse.json({ error: `Failed to analyze PDF: ${errorMsg}` }, { status: 500 })
    }

    const rawText = response.content[0]?.type === 'text' ? response.content[0].text : ''
    console.log('[parse-application] Raw response text length:', rawText.length)
    console.log('[parse-application] Raw response text preview:', rawText.substring(0, 300))

    if (!rawText) {
      console.log('[parse-application] No text response from AI model')
      return NextResponse.json({ error: 'No text response from AI model' }, { status: 500 })
    }

    let jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    console.log('[parse-application] Cleaned JSON text length:', jsonText.length)

    // Try to extract JSON if it's embedded in text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      console.log('[parse-application] Extracted JSON from text')
      jsonText = jsonMatch[0]
    }

    let parsed: ParsedApplication
    try {
      console.log('[parse-application] Parsing JSON...')
      parsed = JSON.parse(jsonText)
      console.log('[parse-application] JSON parsed successfully')
    } catch (err) {
      const parseErr = err instanceof Error ? err.message : 'Invalid JSON'
      console.error('[parse-application] JSON parse failed:', parseErr)
      console.error('[parse-application] JSON text that failed to parse:', jsonText.substring(0, 500))
      return NextResponse.json({ error: `Failed to parse extracted data: ${parseErr}` }, { status: 500 })
    }

    const responseData = { data: parsed }
    console.log('[parse-application] Returning response with data keys:', Object.keys(parsed || {}))
    return NextResponse.json(responseData)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[parse-application] Unhandled error:', message)
    return NextResponse.json({ error: `Internal server error: ${message}` }, { status: 500 })
  }
}
