import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import type { ParsedApplication } from '@/types'

// Configure timeout for this API route (5 minutes for PDF analysis)
export const maxDuration = 300

const SYSTEM_PROMPT = `You are an expert MCA underwriter who has reviewed thousands of merchant cash advance applications from hundreds of different ISOs and lenders. Each application looks different but contains similar information. Your job is to find and extract every piece of relevant underwriting information regardless of how it is labeled or formatted.

Look for these types of information by their MEANING and CONTEXT, not their specific label:
- The legal name of the business entity (may be labeled: Business Name, Legal Name, Company Name, DBA Legal, Merchant Name, Applicant)
- What the business calls itself publicly (may be labeled: DBA, Trade Name, Doing Business As, Store Name)
- Business tax ID (may be labeled: EIN, FEIN, Federal Tax ID, Tax ID Number, TIN)
- How long the business has been operating (may be labeled: Time in Business, Years in Business, Date Established, Business Start Date, Date Opened)
- What kind of business it is (may be labeled: Industry, Business Type, Type of Business, Nature of Business, SIC Code)
- The business location (may be labeled: Address, Business Address, Location, Street Address)
- How to reach the business (may be labeled: Phone, Business Phone, Contact Number, Tel)
- Business email address
- Business website
- How much money the business makes (may be labeled: Monthly Revenue, Gross Monthly Sales, Monthly Deposits, Average Monthly Revenue, Gross Sales, Monthly Volume, Annual Revenue - divide by 12 if annual)
- What they pay for their location (may be labeled: Monthly Rent, Rent, Lease Payment, Monthly Mortgage)
- Who owns their building (may be labeled: Landlord, Property Owner, Lessor, Landlord Name)
- What they want the money for (may be labeled: Use of Funds, Purpose, Reason for Funding, How will funds be used)
- Owner full name (look for the person signing or listed as owner/principal)
- Owner date of birth
- Owner social security number - extract ONLY last 4 digits for security
- Owner home address
- Owner ownership percentage (as percentage or as decimal)
- Owner email and phone
- Bank where they have their business account (may be labeled: Bank Name, Financial Institution, Bank)
- Bank account number - extract ONLY last 4 digits
- Bank routing number
- Average balance they keep in their account
- Credit card processor they use (Square, Clover, Toast, Stripe, PayPal, Authorize.net, etc)
- Monthly credit card processing volume
- Any existing loans or MCAs mentioned with balances
- Any co-owners or additional principals listed
- Document signature date or application date

EXTRACTION RULES:
- If you find information that seems relevant but does not fit a standard field, include it in 'additional_notes'
- For monetary values always return as a number without symbols or commas
- For dates always return in YYYY-MM-DD format
- For SSN and account numbers ONLY return last 4 digits
- If a field genuinely does not exist in the document, return null - NEVER guess
- If the same information appears multiple times, use the most complete version
- Some applications have multiple pages - scan all of them
- Some fields may be handwritten - do your best to interpret
- Assess extraction quality: confidence_score should be 0-100 (100 = all critical fields found and clear, 0 = unable to extract meaningful data)
- List any fields that were difficult to find, ambiguous, or required interpretation in extraction_notes

Return ONLY valid JSON with no explanation.`

const USER_PROMPT = `Extract all available underwriting information from this merchant application. Return ONLY a valid JSON object with these fields (use null if not found, NEVER guess):

{
  "business_legal_name": "exact legal business name or null",
  "dba": "doing business as name or null",
  "entity_type": "LLC, Corporation, Sole Proprietor, Partnership, S-Corp, etc or null",
  "ein": "employer identification number in any format or null",
  "date_established": "YYYY-MM-DD or null",
  "time_in_business_years": "as decimal number (e.g. 2.5) or null",
  "industry": "type of business or null",
  "business_address": "full street address or null",
  "business_city": "city or null",
  "business_state": "state code or full name or null",
  "business_zip": "zip code or null",
  "business_phone": "phone number in any format or null",
  "business_fax": "fax number or null",
  "business_email": "email address or null",
  "business_website": "website URL or null",
  "stated_monthly_revenue": "number only, no symbols or commas, or null",
  "monthly_rent": "number only or null",
  "average_monthly_balance": "number only or null",
  "monthly_processing_volume": "number only or null",
  "landlord_name": "name or null",
  "landlord_phone": "phone or null",
  "use_of_funds": "description of intended use or null",
  "owner_name": "primary owner name or null",
  "owner_dob": "YYYY-MM-DD or null",
  "owner_ssn_last4": "last 4 digits only, no dashes, or null",
  "owner_address": "home address or null",
  "ownership_percentage": "as number 0-100 or null",
  "owner_email": "email or null",
  "owner_cell_phone": "phone or null",
  "owner_home_phone": "phone or null",
  "co_owners": [{"name": "...", "title": "...", "dob": "YYYY-MM-DD", "ssn_last4": "1234", "ownership_percentage": 50, "email": "...", "phone": "..."}] or null,
  "bank_name": "name or null",
  "bank_account_number_last4": "last 4 digits only or null",
  "bank_routing_number": "routing number or null",
  "account_type": "checking, savings, etc or null",
  "processor_name": "Square, Clover, Stripe, etc or null",
  "existing_advances": "description of other MCAs/loans or null",
  "signature_date": "YYYY-MM-DD or null",
  "confidence_score": "0-100 integer indicating how complete extraction was",
  "extraction_notes": ["list", "of", "fields", "that", "were", "difficult", "or", "ambiguous"],
  "additional_notes": "any other relevant information that doesn't fit standard fields or null"
}`

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
        max_tokens: 4096,
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
