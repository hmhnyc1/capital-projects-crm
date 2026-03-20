'use server'

import { extractTextFromPDF } from '@/lib/pdf-text-extractor'
import { parseApplication, type ParsedApplication } from '@/lib/application-parser'
import {
  parseBankStatement,
  type ParsedBankStatement,
} from '@/lib/bank-statement-parser'

export interface ParseFileResult {
  type: 'application' | 'bank_statement' | 'unknown'
  data: ParsedApplication | ParsedBankStatement | null
  error: string | null
  label: string
}

/**
 * Converts any object to a plain serializable object by doing a deep JSON round-trip
 * This removes any Date objects, class instances, or circular references
 */
function makeSerializable(obj: any): any {
  try {
    if (obj === null || obj === undefined) {
      return obj
    }
    // Deep serialize and deserialize to ensure all objects are plain
    return JSON.parse(JSON.stringify(obj))
  } catch (err) {
    console.error('[parse-file] Failed to serialize object:', err)
    console.error('[parse-file] Object:', obj)
    throw new Error(`Serialization failed: ${err instanceof Error ? err.message : String(err)}`)
  }
}

/**
 * Parse a file using the new parsing libraries
 * Handles PDF extraction and determines file type
 * Note: Accepts Buffer instead of File object because File objects cannot be passed to Server Actions
 */
export async function parseFile(
  fileBuffer: Buffer,
  fileName: string
): Promise<ParseFileResult> {
  console.log(`[parse-file] ========================================`)
  console.log(`[parse-file] START PARSING: ${fileName}`)
  console.log(`[parse-file] File size: ${fileBuffer.byteLength} bytes`)
  console.log(`[parse-file] ========================================`)

  try {
    // Step 1: Extract text from PDF
    console.log(`[parse-file] STEP 1: Extracting text from PDF...`)
    let pdfText: string
    try {
      console.log(`[parse-file] Calling extractTextFromPDF...`)
      pdfText = await extractTextFromPDF(fileBuffer)
      console.log(`[parse-file] ✓ PDF extraction successful`)
      console.log(`[parse-file] Extracted text length: ${pdfText.length} characters`)
      if (pdfText.length === 0) {
        throw new Error('PDF extraction returned empty string')
      }
      console.log(`[parse-file] First 200 chars: ${pdfText.substring(0, 200)}`)
    } catch (extractErr) {
      const errorMsg =
        extractErr instanceof Error ? extractErr.message : 'PDF extraction failed'
      console.error(`[parse-file] ✗ PDF text extraction failed:`, errorMsg)
      console.error(`[parse-file] Full error:`, extractErr)
      throw new Error(`Failed to extract text from PDF: ${errorMsg}`)
    }

    // Step 2: Determine file type by trying both parsers
    console.log(`[parse-file] STEP 2: Attempting to parse as application...`)
    let appData: ParsedApplication | null = null
    let appError: Error | null = null

    try {
      console.log(`[parse-file] Calling parseApplication...`)
      appData = await parseApplication(pdfText, fileName)
      console.log(`[parse-file] ✓ Application parse successful`)
      console.log(`[parse-file] Confidence score: ${appData.confidence_score}`)
      console.log(`[parse-file] Business name: ${appData.business_legal_name || 'N/A'}`)
    } catch (err) {
      appError = err instanceof Error ? err : new Error('Unknown error')
      console.warn(`[parse-file] ✗ Application parse failed: ${appError.message}`)
      console.warn(`[parse-file] Full error:`, err)
    }

    console.log(`[parse-file] STEP 3: Attempting to parse as bank statement...`)
    let stmtData: ParsedBankStatement | null = null
    let stmtError: Error | null = null

    try {
      console.log(`[parse-file] Calling parseBankStatement...`)
      stmtData = await parseBankStatement(pdfText, fileName)
      console.log(`[parse-file] ✓ Bank statement parse successful`)
      console.log(`[parse-file] Confidence score: ${stmtData.confidence_score}`)
      console.log(`[parse-file] Statement month: ${stmtData.statement_month_label || 'N/A'}`)
      console.log(`[parse-file] Bank: ${stmtData.bank_name || 'N/A'}`)
    } catch (err) {
      stmtError = err instanceof Error ? err : new Error('Unknown error')
      console.warn(`[parse-file] ✗ Bank statement parse failed: ${stmtError.message}`)
      console.warn(`[parse-file] Full error:`, err)
    }

    // Step 4: Determine type based on results
    console.log(`[parse-file] STEP 4: Determining file type...`)
    const hasAppData = appData && appData.confidence_score > 0
    const hasStmtData = stmtData && stmtData.confidence_score > 0

    console.log(`[parse-file] Parse results:`)
    console.log(`[parse-file]   hasAppData: ${hasAppData} (confidence: ${appData?.confidence_score || 'N/A'})`)
    console.log(`[parse-file]   hasStmtData: ${hasStmtData} (confidence: ${stmtData?.confidence_score || 'N/A'})`)

    // Use filename hints to break ties
    const nameHasMonthKeyword = /january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec/i.test(
      fileName
    )
    const nameHasAppKeyword = /app|application|form|merchant|underwriting|principle|principal/i.test(
      fileName
    )

    console.log(`[parse-file] Filename analysis:`)
    console.log(`[parse-file]   nameHasMonthKeyword: ${nameHasMonthKeyword}`)
    console.log(`[parse-file]   nameHasAppKeyword: ${nameHasAppKeyword}`)

    let detectedType: 'application' | 'bank_statement' | 'unknown' = 'unknown'
    let detectedData: ParsedApplication | ParsedBankStatement | null = null
    let detectedLabel = fileName

    if (hasAppData && !hasStmtData) {
      console.log(`[parse-file] → Decision: Only app data, selecting APPLICATION`)
      detectedType = 'application'
      detectedData = appData
      detectedLabel = `📄 Application - ${fileName}`
    } else if (hasStmtData && !hasAppData) {
      console.log(`[parse-file] → Decision: Only statement data, selecting BANK_STATEMENT`)
      detectedType = 'bank_statement'
      detectedData = stmtData
      detectedLabel =
        stmtData && stmtData.statement_month_label
          ? `🏦 Bank Statement - ${stmtData.statement_month_label}`
          : `🏦 Bank Statement - ${fileName}`
    } else if (hasAppData && hasStmtData && appData && stmtData) {
      console.log(`[parse-file] → Decision: Both parsed, using confidence scores and filename hints`)
      // Both parsed - use confidence scores and filename hints
      const appConfidence = appData.confidence_score
      const stmtConfidence = stmtData.confidence_score

      if (appConfidence > stmtConfidence + 10) {
        console.log(`[parse-file]   → App confidence higher (${appConfidence} > ${stmtConfidence} + 10), selecting APPLICATION`)
        detectedType = 'application'
        detectedData = appData
        detectedLabel = `📄 Application - ${fileName}`
      } else if (stmtConfidence > appConfidence + 10) {
        console.log(`[parse-file]   → Stmt confidence higher (${stmtConfidence} > ${appConfidence} + 10), selecting BANK_STATEMENT`)
        detectedType = 'bank_statement'
        detectedData = stmtData
        detectedLabel = stmtData.statement_month_label
          ? `🏦 Bank Statement - ${stmtData.statement_month_label}`
          : `🏦 Bank Statement - ${fileName}`
      } else if (nameHasAppKeyword && !nameHasMonthKeyword) {
        console.log(`[parse-file]   → Filename suggests APPLICATION`)
        detectedType = 'application'
        detectedData = appData
        detectedLabel = `📄 Application - ${fileName}`
      } else if (nameHasMonthKeyword && !nameHasAppKeyword) {
        console.log(`[parse-file]   → Filename suggests BANK_STATEMENT`)
        detectedType = 'bank_statement'
        detectedData = stmtData
        detectedLabel = stmtData.statement_month_label
          ? `🏦 Bank Statement - ${stmtData.statement_month_label}`
          : `🏦 Bank Statement - ${fileName}`
      } else {
        console.log(`[parse-file]   → Truly ambiguous, defaulting to BANK_STATEMENT`)
        // Default to bank statement if truly ambiguous
        detectedType = 'bank_statement'
        detectedData = stmtData
        detectedLabel = stmtData.statement_month_label
          ? `🏦 Bank Statement - ${stmtData.statement_month_label}`
          : `🏦 Bank Statement - ${fileName}`
      }
    } else if (nameHasAppKeyword && !nameHasMonthKeyword) {
      console.log(`[parse-file] → Decision: No parse data but filename suggests APPLICATION`)
      // Use filename hint
      detectedType = 'application'
      detectedData = appData
      detectedLabel = `📄 Application - ${fileName}`
    } else if (nameHasMonthKeyword && !nameHasAppKeyword) {
      console.log(`[parse-file] → Decision: No parse data but filename suggests BANK_STATEMENT`)
      // Use filename hint
      detectedType = 'bank_statement'
      detectedData = stmtData
      detectedLabel = stmtData?.statement_month_label
        ? `🏦 Bank Statement - ${stmtData.statement_month_label}`
        : `🏦 Bank Statement - ${fileName}`
    } else {
      console.log(`[parse-file] → Decision: No parse data and filename unclear, marking as UNKNOWN`)
    }

    console.log(`[parse-file] ✓ Detected type: ${detectedType}`)
    console.log(`[parse-file] ✓ Label: ${detectedLabel}`)

    // Add statement_month and statement_year for backwards compatibility
    if (detectedType === 'bank_statement' && detectedData && stmtData) {
      const startDate = stmtData.statement_period_start
        ? new Date(stmtData.statement_period_start)
        : null
      if (startDate) {
        ;(detectedData as any).statement_month = startDate.getMonth() + 1
        ;(detectedData as any).statement_year = startDate.getFullYear()
        console.log(`[parse-file] Added backwards compatibility fields: month=${(detectedData as any).statement_month}, year=${(detectedData as any).statement_year}`)
      }
    }

    console.log(`[parse-file] ========================================`)
    console.log(`[parse-file] ✓ PARSING COMPLETE - SUCCESS`)
    console.log(`[parse-file] Type: ${detectedType}`)
    console.log(`[parse-file] Data present: ${!!detectedData}`)
    console.log(`[parse-file] Label: ${detectedLabel}`)
    console.log(`[parse-file] Serializing result for client...`)

    const result = {
      type: detectedType,
      data: detectedData,
      error: null,
      label: detectedLabel,
    }

    // Ensure result is fully serializable
    console.log(`[parse-file] Applying JSON serialization...`)
    const serialized = makeSerializable(result)
    console.log(`[parse-file] ✓ Serialization successful`)
    console.log(`[parse-file] ========================================`)

    return serialized
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[parse-file] ========================================`)
    console.error(`[parse-file] ✗ PARSING FAILED - ERROR`)
    console.error(`[parse-file] Error message: ${errorMsg}`)
    console.error(`[parse-file] Full error object:`, err)
    console.error(`[parse-file] Serializing error result...`)

    const result = {
      type: 'unknown' as const,
      data: null,
      error: errorMsg,
      label: fileName,
    }

    // Ensure result is fully serializable even in error case
    console.error(`[parse-file] Applying JSON serialization to error...`)
    const serialized = makeSerializable(result)
    console.error(`[parse-file] ✓ Error result serialized`)
    console.error(`[parse-file] ========================================`)

    return serialized
  }
}
