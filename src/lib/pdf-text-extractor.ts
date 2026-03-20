/**
 * PDF TEXT EXTRACTOR
 *
 * Utility to extract text from PDF files using Claude's vision capabilities.
 * Accepts Buffer instead of File object because File objects cannot be passed to Server Actions
 */

import Anthropic from '@anthropic-ai/sdk'

export async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  console.log(`[pdf-text-extractor] ========================================`)
  console.log(`[pdf-text-extractor] Starting PDF extraction`)
  console.log(`[pdf-text-extractor] File size: ${fileBuffer.byteLength} bytes`)

  try {
    console.log(`[pdf-text-extractor] Converting Buffer to base64...`)
    const base64 = fileBuffer.toString('base64')
    console.log(`[pdf-text-extractor] ✓ Base64 conversion complete (${base64.length} chars)`)

    // Use Claude to extract text
    console.log(`[pdf-text-extractor] Initializing Anthropic client...`)
    const client = new Anthropic()
    console.log(`[pdf-text-extractor] ✓ Client initialized`)

    console.log(`[pdf-text-extractor] Calling Claude Sonnet 4.6 for PDF extraction...`)
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
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
              text: 'Extract ALL text content from this PDF document. Preserve the layout, formatting, and structure. Return ONLY the extracted text, no other commentary or explanation.',
            },
          ],
        },
      ],
    })

    console.log(`[pdf-text-extractor] ✓ API response received`)
    console.log(`[pdf-text-extractor] Response content blocks: ${response.content.length}`)

    const extractedText =
      response.content[0]?.type === 'text' ? response.content[0].text : ''

    console.log(`[pdf-text-extractor] Extracted text length: ${extractedText.length} chars`)

    if (!extractedText) {
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
