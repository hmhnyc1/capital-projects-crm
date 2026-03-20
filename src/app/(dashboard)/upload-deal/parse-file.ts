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
 * Parse a file using the new parsing libraries
 * Handles PDF extraction and determines file type
 */
export async function parseFile(
  file: File,
  fileName: string
): Promise<ParseFileResult> {
  console.log(`[parse-file] Parsing file: ${fileName}`)

  try {
    // Step 1: Extract text from PDF
    console.log(`[parse-file] Extracting text from PDF...`)
    let pdfText: string
    try {
      pdfText = await extractTextFromPDF(file)
    } catch (extractErr) {
      const errorMsg =
        extractErr instanceof Error ? extractErr.message : 'PDF extraction failed'
      console.error(`[parse-file] PDF text extraction failed:`, errorMsg)
      throw new Error(`Failed to extract text from PDF: ${errorMsg}`)
    }

    // Step 2: Determine file type by trying both parsers
    console.log(`[parse-file] Attempting to parse as application...`)
    let appData: ParsedApplication | null = null
    let appError: Error | null = null

    try {
      appData = await parseApplication(pdfText, fileName)
      console.log(
        `[parse-file] Application parse successful, confidence: ${appData.confidence_score}`
      )
    } catch (err) {
      appError = err instanceof Error ? err : new Error('Unknown error')
      console.log(`[parse-file] Application parse failed: ${appError.message}`)
    }

    console.log(`[parse-file] Attempting to parse as bank statement...`)
    let stmtData: ParsedBankStatement | null = null
    let stmtError: Error | null = null

    try {
      stmtData = await parseBankStatement(pdfText, fileName)
      console.log(
        `[parse-file] Bank statement parse successful, confidence: ${stmtData.confidence_score}`
      )
    } catch (err) {
      stmtError = err instanceof Error ? err : new Error('Unknown error')
      console.log(`[parse-file] Bank statement parse failed: ${stmtError.message}`)
    }

    // Step 3: Determine type based on results
    const hasAppData = appData && appData.confidence_score > 0
    const hasStmtData = stmtData && stmtData.confidence_score > 0

    // Use filename hints to break ties
    const nameHasMonthKeyword = /january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec/i.test(
      fileName
    )
    const nameHasAppKeyword = /app|application|form|merchant|underwriting|principle|principal/i.test(
      fileName
    )

    let detectedType: 'application' | 'bank_statement' | 'unknown' = 'unknown'
    let detectedData: ParsedApplication | ParsedBankStatement | null = null
    let detectedLabel = fileName

    if (hasAppData && !hasStmtData) {
      detectedType = 'application'
      detectedData = appData
      detectedLabel = `📄 Application - ${fileName}`
    } else if (hasStmtData && !hasAppData) {
      detectedType = 'bank_statement'
      detectedData = stmtData
      detectedLabel =
        stmtData && stmtData.statement_month_label
          ? `🏦 Bank Statement - ${stmtData.statement_month_label}`
          : `🏦 Bank Statement - ${fileName}`
    } else if (hasAppData && hasStmtData && appData && stmtData) {
      // Both parsed - use confidence scores and filename hints
      const appConfidence = appData.confidence_score
      const stmtConfidence = stmtData.confidence_score

      if (appConfidence > stmtConfidence + 10) {
        detectedType = 'application'
        detectedData = appData
        detectedLabel = `📄 Application - ${fileName}`
      } else if (stmtConfidence > appConfidence + 10) {
        detectedType = 'bank_statement'
        detectedData = stmtData
        detectedLabel = stmtData.statement_month_label
          ? `🏦 Bank Statement - ${stmtData.statement_month_label}`
          : `🏦 Bank Statement - ${fileName}`
      } else if (nameHasAppKeyword && !nameHasMonthKeyword) {
        detectedType = 'application'
        detectedData = appData
        detectedLabel = `📄 Application - ${fileName}`
      } else if (nameHasMonthKeyword && !nameHasAppKeyword) {
        detectedType = 'bank_statement'
        detectedData = stmtData
        detectedLabel = stmtData.statement_month_label
          ? `🏦 Bank Statement - ${stmtData.statement_month_label}`
          : `🏦 Bank Statement - ${fileName}`
      } else {
        // Default to bank statement if truly ambiguous
        detectedType = 'bank_statement'
        detectedData = stmtData
        detectedLabel = stmtData.statement_month_label
          ? `🏦 Bank Statement - ${stmtData.statement_month_label}`
          : `🏦 Bank Statement - ${fileName}`
      }
    } else if (nameHasAppKeyword && !nameHasMonthKeyword) {
      // Use filename hint
      detectedType = 'application'
      detectedData = appData
      detectedLabel = `📄 Application - ${fileName}`
    } else if (nameHasMonthKeyword && !nameHasAppKeyword) {
      // Use filename hint
      detectedType = 'bank_statement'
      detectedData = stmtData
      detectedLabel = stmtData?.statement_month_label
        ? `🏦 Bank Statement - ${stmtData.statement_month_label}`
        : `🏦 Bank Statement - ${fileName}`
    }

    console.log(`[parse-file] Detected type: ${detectedType}`)

    // Add statement_month and statement_year for backwards compatibility
    if (detectedType === 'bank_statement' && detectedData && stmtData) {
      const startDate = stmtData.statement_period_start
        ? new Date(stmtData.statement_period_start)
        : null
      if (startDate) {
        ;(detectedData as any).statement_month = startDate.getMonth() + 1
        ;(detectedData as any).statement_year = startDate.getFullYear()
      }
    }

    return {
      type: detectedType,
      data: detectedData,
      error: null,
      label: detectedLabel,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[parse-file] Failed to parse file:`, errorMsg)
    return {
      type: 'unknown',
      data: null,
      error: errorMsg,
      label: fileName,
    }
  }
}
