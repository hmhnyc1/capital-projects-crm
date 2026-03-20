import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import type { ParsedApplication } from '@/types'

// Configure timeout for this API route (5 minutes for PDF analysis)
export const maxDuration = 300

const SYSTEM_PROMPT = `You are an expert at extracting information from Merchant Cash Advance applications. Extract EVERY piece of information you can find in this document. Look through the entire document carefully including all pages, fine print, signature sections, and any handwritten notes.

Return ONLY a valid JSON object. No explanation, no markdown, just the JSON.
If a field is not found, return null, never guess.`

const USER_PROMPT = `Extract these fields from the merchant application - if a field is not found, return null, never guess:
- business_legal_name: exact legal business name
- dba: doing business as name if different
- entity_type: LLC, Corporation, Sole Proprietor, Partnership
- ein: employer identification number (XX-XXXXXXX format)
- date_established: when business was founded
- time_in_business: years and months in business as a decimal number like 2.5
- business_address: full street address
- business_city, business_state, business_zip
- business_phone, business_fax
- business_email, business_website
- industry: type of business
- monthly_revenue: stated gross monthly revenue as a number
- monthly_rent: monthly rent or mortgage payment as a number
- landlord_name: name of landlord or property owner
- landlord_phone
- use_of_funds: what the merchant wants the money for
- owner_1_name: first and last name
- owner_1_title: title or role
- owner_1_dob: date of birth MM/DD/YYYY
- owner_1_ssn: last 4 digits only formatted as XXXX
- owner_1_address: home address
- owner_1_ownership_pct: ownership percentage as integer
- owner_1_email, owner_1_cell_phone, owner_1_home_phone
- owner_2_name, owner_2_title, owner_2_dob, owner_2_ssn, owner_2_ownership_pct (if exists)
- bank_name: name of the bank
- bank_account_number: last 4 digits only
- bank_routing_number
- average_monthly_balance: stated average monthly balance
- processor_name: credit card processor name
- monthly_processing_volume: monthly card processing volume
- existing_advances: any existing MCA or loan balances mentioned
- signature_date: date the application was signed

Return ONLY a valid JSON object with these exact field names. No explanation, no markdown, just the JSON.`

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
        model: 'claude-sonnet-4-6',
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
