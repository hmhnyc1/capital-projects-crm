/**
 * PDF TEXT EXTRACTOR
 *
 * Utility to extract text from PDF files using Claude's vision capabilities.
 * This allows the parsing libraries to work with PDF file objects.
 */

import Anthropic from '@anthropic-ai/sdk'

export async function extractTextFromPDF(file: File): Promise<string> {
  console.log(`[pdf-text-extractor] Extracting text from: ${file.name}`)

  // Read file as buffer
  const arrayBuffer = await file.arrayBuffer()
  const base64 = Buffer.from(arrayBuffer).toString('base64')
  console.log(`[pdf-text-extractor] Converted to base64 (${base64.length} chars)`)

  // Use Claude to extract text
  const client = new Anthropic()

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

  const extractedText =
    response.content[0]?.type === 'text' ? response.content[0].text : ''

  if (!extractedText) {
    throw new Error('Failed to extract text from PDF')
  }

  console.log(
    `[pdf-text-extractor] Successfully extracted text (${extractedText.length} chars)`
  )
  return extractedText
}
