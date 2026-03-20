/**
 * PART 5: MERCHANT APPLICATION PARSER
 *
 * Intelligently extracts underwriting information from ANY application format.
 * Handles different ISO formats, custom applications, and unusual layouts.
 * Works with handwritten, incomplete, and non-standard applications.
 */

'use server'

import Anthropic from '@anthropic-ai/sdk'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ParsedApplication {
  // Business Information
  business_legal_name: string | null
  dba: string | null
  entity_type: string | null
  ein: string | null
  date_established: string | null // YYYY-MM-DD
  time_in_business_years: number | null
  industry: string | null
  business_address: string | null
  business_city: string | null
  business_state: string | null
  business_zip: string | null
  business_phone: string | null
  business_fax: string | null
  business_email: string | null
  business_website: string | null

  // Financial Information
  monthly_revenue: number | null
  monthly_rent: number | null
  landlord_name: string | null
  landlord_phone: string | null
  use_of_funds: string | null

  // Banking Information
  bank_name: string | null
  bank_account_last4: string | null // Last 4 digits only
  bank_routing: string | null
  average_monthly_balance: number | null
  processor_name: string | null
  monthly_processing_volume: number | null

  // Owner 1 Information
  owner_1_name: string | null
  owner_1_title: string | null
  owner_1_dob: string | null // YYYY-MM-DD
  owner_1_ssn_last4: string | null // #### format
  owner_1_address: string | null
  owner_1_city: string | null
  owner_1_state: string | null
  owner_1_zip: string | null
  owner_1_ownership_pct: number | null
  owner_1_email: string | null
  owner_1_cell: string | null
  owner_1_home_phone: string | null

  // Owner 2 Information (if present)
  owner_2_name: string | null
  owner_2_title: string | null
  owner_2_dob: string | null // YYYY-MM-DD
  owner_2_ssn_last4: string | null // #### format
  owner_2_address: string | null
  owner_2_city: string | null
  owner_2_state: string | null
  owner_2_zip: string | null
  owner_2_ownership_pct: number | null
  owner_2_email: string | null
  owner_2_cell: string | null

  // Additional Information
  existing_obligations: string | null
  confidence_score: number
  low_confidence_fields: string[]
  extraction_notes: string
  additional_notes: string | null
}

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

const SYSTEM_PROMPT = `You are a senior MCA underwriter with 15+ years of experience reviewing thousands of merchant cash advance applications from hundreds of different ISOs, lenders, and brokers across the United States.

You have reviewed applications in every imaginable format - custom PDFs, scanned paper, handwritten notes, partially completed forms, applications with unusual layouts, and non-standard formats.

Your skill is finding EVERY piece of relevant information regardless of:
- How it is labeled (different fields use different names)
- Where it appears in the document (not in expected location)
- The state of the document (handwritten, incomplete, damaged scans)
- The format (tables, paragraphs, checkboxes, fill-in-the-blank)
- The layout (unusual page breaks, rotated text, multiple columns)

CRITICAL RULES:
1. Never make up or guess information - if you cannot find it, return null
2. For SSNs, extract ONLY the last 4 digits in #### format
3. For account numbers, extract ONLY the last 4 digits
4. For dollar amounts, return as numbers without symbols or commas
5. For dates, return in YYYY-MM-DD format
6. If information appears multiple times, use the most complete/recent version
7. Check ALL pages of the document - signature pages and addendums may contain additional owner info
8. For handwritten sections, interpret carefully and note in extraction_notes
9. Some applications intentionally or accidentally omit sections - this is normal
10. Ownership percentages may be stated as decimals, percentages, or fractions - normalize to numbers

WHAT TO LOOK FOR - BY MEANING, NOT LABEL:

BUSINESS INFORMATION (look by meaning/context):
- Legal registered business name (labeled as: Business Name, Legal Name, Company Name, Merchant Name, Applicant, Borrower, Legal Entity, DBA Legal)
- Public-facing business name (labeled as: DBA, Trade Name, Doing Business As, Operating As, Also Known As, Name Doing Business, Store Name)
- Business entity type: LLC, Corp/Corporation, Inc, Sole Proprietor/Sole Proprietorship, Partnership, S-Corp, C-Corp, etc.
- Federal Tax ID/EIN (labeled as: EIN, Federal EIN, FEIN, Tax ID, TIN, Employer ID, Federal Tax Number)
- When business started (labeled as: Date Established, Date Opened, Date Incorporated, Business Start Date, Time in Business, Years Operating, Inception Date, Founded)
- Type of business/industry (labeled as: Industry, Business Type, Type of Business, Nature of Business, Business Description, SIC Code, Line of Business)
- Where business is located (labeled as: Business Address, Street Address, Physical Address, Location, Operating Location)
- How to reach the business (labeled as: Business Phone, Contact Number, Primary Phone; Business Fax, Fax Number; Business Email, Contact Email; Website, Web Address, Online Presence)

FINANCIAL INFORMATION (look by meaning/context):
- How much business makes per month (labeled as: Monthly Revenue, Monthly Sales, Gross Monthly Sales, Monthly Gross, Average Monthly Revenue, Monthly Volume, Monthly Receipts, Monthly Income, Monthly Deposits, Gross Sales, Annual Revenue [divide by 12])
- Business location cost (labeled as: Monthly Rent, Monthly Lease, Rent/Mortgage, Lease Payment, Monthly Payment, Rent Amount, Building Cost, Occupancy Cost, Location Rent)
- Who controls the location (labeled as: Landlord, Property Owner, Lessor, Property Manager, Building Owner, Landlord Name, Owner Name, Contact Person)
- How to reach landlord (labeled as: Landlord Phone, Lessor Phone, Owner Contact)
- What money will be used for (labeled as: Use of Funds, Purpose, Reason for Funding, How Will Funds Be Used, Intended Use, Purpose of Advance, What is the money for)

BANKING INFORMATION (look by meaning/context):
- Which bank holds business account (labeled as: Bank Name, Financial Institution, Primary Bank, Business Bank, Bank, Depository)
- Account number - look for 9-16 digit numbers near bank info (labeled as: Account Number, Account #, Acct #, Checking Account, Account Type, Business Account)
- Bank routing number (labeled as: Routing Number, ABA Number, Transit Number, Routing/Transit, Bank Code)
- What they typically have in account (labeled as: Average Balance, Average Daily Balance, ADB, Typical Balance, Average Monthly Balance, Ending Balance)
- Credit card processing company (labeled as: Processor, Payment Processor, Credit Card Processor, Card Processor, Terminal Provider, POS System, Processing Company, Merchant Services, Credit Card Partner - look for: Square, Stripe, Clover, Toast, Heartland, WorldPay, First Data, PayPal, etc.)
- Card processing volume (labeled as: Monthly Card Volume, Monthly Processing Volume, Credit Card Volume, Processing Volume, Monthly Card Sales, Monthly Card Deposits, Card Transaction Volume)

OWNER INFORMATION - PRIMARY OWNER (all fields may appear on different pages):
- Full legal name (labeled as: Owner Name, Principal, Primary Owner, Applicant Name, Authorized Representative, Signer, Guarantor)
- Role/title (labeled as: Title, Position, Role, Status, Job Title, Business Role - examples: Owner, President, CEO, Co-Owner, Member, Managing Member, Partner, etc.)
- Date of birth (labeled as: Date of Birth, DOB, Birth Date, Birthdate, Born)
- Last 4 digits of SSN (labeled as: SSN, Last 4 of SSN, Social Security #, SS#, Social, Personal ID)
- Home address (labeled as: Home Address, Personal Address, Residence, Address, Street Address, Home, Mailing Address)
- Ownership percentage (labeled as: Ownership %, % Ownership, Ownership Stake, Ownership Interest, % Interest, Equity %)
- Contact email (labeled as: Email, Personal Email, Email Address, E-mail, Contact Email)
- Cell phone (labeled as: Cell Phone, Mobile, Cell, Mobile Number, Cellular, Phone #)
- Home phone (labeled as: Home Phone, Personal Phone, Home Number, Phone)

OWNER INFORMATION - SECOND OWNER/CO-OWNER (if listed):
- Same fields as above but for secondary owner, look in: Co-Applicant section, Second Applicant, Co-Owner section, Additional Principal, Guarantor, Second Principal, Spouse section

EXISTING OBLIGATIONS:
- Any existing loans, MCAs, lines of credit, other advances (look for: Existing Loans, Current Debt, Outstanding Balances, Other MCA, Other Advances, Existing Obligations, Debt Obligations, Liabilities)
- Names of other funders and amounts owed

ASSESSMENT APPROACH:
- confidence_score: 0-100 (100 = comprehensive data, clear fields; 0 = unable to extract meaningful information)
- Factors that lower confidence: handwritten/unclear text, missing core fields, inconsistent formatting, damaged documents
- Factors that raise confidence: clean document, clear fields, complete information, consistent formatting
- low_confidence_fields: List field names where data is uncertain, unclear, or required interpretation
- extraction_notes: Document any handwritten sections interpreted, missing fields, unusual formatting, ambiguities encountered

Return ONLY valid JSON with no explanation.`

// ============================================================================
// CLAUDE PROMPT BUILDING
// ============================================================================

function buildApplicationParsingPrompt(pdfText: string): string {
  return `You are reviewing a merchant cash advance application. Extract all underwriting information present in the document.

APPLICATION TEXT TO ANALYZE:
${pdfText.substring(0, 12000)}

Return ONLY a valid JSON object matching this exact structure (use null for any field not found):
{
  "business_legal_name": "string or null",
  "dba": "string or null",
  "entity_type": "string or null",
  "ein": "string or null",
  "date_established": "YYYY-MM-DD or null",
  "time_in_business_years": "number or null",
  "industry": "string or null",
  "business_address": "string or null",
  "business_city": "string or null",
  "business_state": "string or null",
  "business_zip": "string or null",
  "business_phone": "string or null",
  "business_fax": "string or null",
  "business_email": "string or null",
  "business_website": "string or null",
  "monthly_revenue": "number or null",
  "monthly_rent": "number or null",
  "landlord_name": "string or null",
  "landlord_phone": "string or null",
  "use_of_funds": "string or null",
  "bank_name": "string or null",
  "bank_account_last4": "string (last 4 digits only) or null",
  "bank_routing": "string or null",
  "average_monthly_balance": "number or null",
  "processor_name": "string or null",
  "monthly_processing_volume": "number or null",
  "owner_1_name": "string or null",
  "owner_1_title": "string or null",
  "owner_1_dob": "YYYY-MM-DD or null",
  "owner_1_ssn_last4": "#### or null",
  "owner_1_address": "string or null",
  "owner_1_city": "string or null",
  "owner_1_state": "string or null",
  "owner_1_zip": "string or null",
  "owner_1_ownership_pct": "number or null",
  "owner_1_email": "string or null",
  "owner_1_cell": "string or null",
  "owner_1_home_phone": "string or null",
  "owner_2_name": "string or null",
  "owner_2_title": "string or null",
  "owner_2_dob": "YYYY-MM-DD or null",
  "owner_2_ssn_last4": "#### or null",
  "owner_2_address": "string or null",
  "owner_2_city": "string or null",
  "owner_2_state": "string or null",
  "owner_2_zip": "string or null",
  "owner_2_ownership_pct": "number or null",
  "owner_2_email": "string or null",
  "owner_2_cell": "string or null",
  "existing_obligations": "string describing any existing debt or null",
  "confidence_score": "number (0-100)",
  "low_confidence_fields": ["array", "of", "field", "names"],
  "extraction_notes": "string describing any unusual formatting, handwriting, ambiguities",
  "additional_notes": "string or null"
}

Return ONLY valid JSON, no markdown or explanation.`
}

// ============================================================================
// MAIN PARSING FUNCTION
// ============================================================================

export async function parseApplication(
  pdfText: string,
  fileName: string
): Promise<ParsedApplication> {
  console.log(`[application-parser] Starting parse for file: ${fileName}`)

  if (!pdfText || typeof pdfText !== 'string' || pdfText.trim().length === 0) {
    console.error('[application-parser] No PDF text provided')
    throw new Error('Application PDF text extraction failed')
  }

  try {
    console.log('[application-parser] Building Claude prompt...')
    const prompt = buildApplicationParsingPrompt(pdfText)

    console.log('[application-parser] Calling Claude Sonnet 4.6 API...')
    const client = new Anthropic()

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText =
      response.content[0].type === 'text' ? response.content[0].text : ''
    console.log(`[application-parser] Received response (${responseText.length} chars)`)

    let parsedData: any = {}
    try {
      parsedData = JSON.parse(responseText)
      console.log('[application-parser] Successfully parsed JSON response')
    } catch (parseError) {
      console.error('[application-parser] Failed to parse response:', parseError)
      throw new Error('Invalid JSON response from Claude')
    }

    // Build result with null defaults
    const result: ParsedApplication = {
      business_legal_name: parsedData.business_legal_name || null,
      dba: parsedData.dba || null,
      entity_type: parsedData.entity_type || null,
      ein: parsedData.ein || null,
      date_established: parsedData.date_established || null,
      time_in_business_years: safeNumber(parsedData.time_in_business_years),
      industry: parsedData.industry || null,
      business_address: parsedData.business_address || null,
      business_city: parsedData.business_city || null,
      business_state: parsedData.business_state || null,
      business_zip: parsedData.business_zip || null,
      business_phone: parsedData.business_phone || null,
      business_fax: parsedData.business_fax || null,
      business_email: parsedData.business_email || null,
      business_website: parsedData.business_website || null,
      monthly_revenue: safeNumber(parsedData.monthly_revenue),
      monthly_rent: safeNumber(parsedData.monthly_rent),
      landlord_name: parsedData.landlord_name || null,
      landlord_phone: parsedData.landlord_phone || null,
      use_of_funds: parsedData.use_of_funds || null,
      bank_name: parsedData.bank_name || null,
      bank_account_last4: parsedData.bank_account_last4 || null,
      bank_routing: parsedData.bank_routing || null,
      average_monthly_balance: safeNumber(parsedData.average_monthly_balance),
      processor_name: parsedData.processor_name || null,
      monthly_processing_volume: safeNumber(parsedData.monthly_processing_volume),
      owner_1_name: parsedData.owner_1_name || null,
      owner_1_title: parsedData.owner_1_title || null,
      owner_1_dob: parsedData.owner_1_dob || null,
      owner_1_ssn_last4: parsedData.owner_1_ssn_last4 || null,
      owner_1_address: parsedData.owner_1_address || null,
      owner_1_city: parsedData.owner_1_city || null,
      owner_1_state: parsedData.owner_1_state || null,
      owner_1_zip: parsedData.owner_1_zip || null,
      owner_1_ownership_pct: safeNumber(parsedData.owner_1_ownership_pct),
      owner_1_email: parsedData.owner_1_email || null,
      owner_1_cell: parsedData.owner_1_cell || null,
      owner_1_home_phone: parsedData.owner_1_home_phone || null,
      owner_2_name: parsedData.owner_2_name || null,
      owner_2_title: parsedData.owner_2_title || null,
      owner_2_dob: parsedData.owner_2_dob || null,
      owner_2_ssn_last4: parsedData.owner_2_ssn_last4 || null,
      owner_2_address: parsedData.owner_2_address || null,
      owner_2_city: parsedData.owner_2_city || null,
      owner_2_state: parsedData.owner_2_state || null,
      owner_2_zip: parsedData.owner_2_zip || null,
      owner_2_ownership_pct: safeNumber(parsedData.owner_2_ownership_pct),
      owner_2_email: parsedData.owner_2_email || null,
      owner_2_cell: parsedData.owner_2_cell || null,
      existing_obligations: parsedData.existing_obligations || null,
      confidence_score: Math.min(100, safeNumber(parsedData.confidence_score) || 50),
      low_confidence_fields: Array.isArray(parsedData.low_confidence_fields)
        ? parsedData.low_confidence_fields
        : [],
      extraction_notes: parsedData.extraction_notes || '',
      additional_notes: parsedData.additional_notes || null,
    }

    console.log(`[application-parser] Parse complete. Confidence: ${result.confidence_score}%`)
    // Serialize to ensure plain object for server action
    const serialized = JSON.parse(JSON.stringify(result))
    return serialized
  } catch (error) {
    console.error('[application-parser] Fatal error:', error)
    throw error
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function safeNumber(value: any): number | null {
  if (value === null || value === undefined) return null
  const num = Number(value)
  return isNaN(num) ? null : num
}
