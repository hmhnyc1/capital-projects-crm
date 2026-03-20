/**
 * PDF TEXT EXTRACTOR
 *
 * Utility to extract text from PDF files using pdfjs-dist library.
 * Extracts raw text directly from PDFs without using Claude Vision API.
 * More reliable and cheaper than Vision API approach.
 */

import * as pdfjsLib from 'pdfjs-dist'

// Configure the worker for Node.js environment
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  console.log(`[pdf-text-extractor] ========================================`)
  console.log(`[pdf-text-extractor] Starting PDF text extraction using pdfjs-dist`)
  console.log(`[pdf-text-extractor] File size: ${fileBuffer.byteLength} bytes`)

  try {
    console.log(`[pdf-text-extractor] Loading PDF document...`)
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(fileBuffer) }).promise

    console.log(`[pdf-text-extractor] ✓ PDF loaded successfully`)
    console.log(`[pdf-text-extractor] Number of pages: ${pdf.numPages}`)

    let extractedText = ''

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        const pageText = textContent.items.map((item: any) => item.str).join(' ')
        extractedText += pageText + '\n'
      } catch (pageErr) {
        console.warn(`[pdf-text-extractor] Warning: Failed to extract text from page ${pageNum}`)
      }
    }

    console.log(`[pdf-text-extractor] Extracted text length: ${extractedText.length} chars`)

    if (!extractedText || extractedText.trim().length === 0) {
      console.error(`[pdf-text-extractor] ✗ No text extracted from PDF`)
      throw new Error('Failed to extract text from PDF - no text content found')
    }

    console.log(`[pdf-text-extractor] ✓ Successfully extracted text`)
    console.log(`[pdf-text-extractor] First 300 chars: ${extractedText.substring(0, 300)}`)
    console.log(`[pdf-text-extractor] ========================================`)
    return extractedText
  } catch (err) {
    console.error(`[pdf-text-extractor] ✗ PDF extraction failed`)
    console.error(`[pdf-text-extractor] Error message: ${err instanceof Error ? err.message : String(err)}`)
    console.error(`[pdf-text-extractor] Full error:`, err)
    console.error(`[pdf-text-extractor] ========================================`)
    throw err
  }
}
