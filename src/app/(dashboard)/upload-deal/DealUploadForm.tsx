'use client'

import { useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react'
import type { UploadedFile } from '@/types'
import ReviewScreenNew from './ReviewScreenNew'
import { sortBankStatements } from './utils'
import { parseFile as serverParseFile } from './parse-file'

export default function DealUploadForm() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [allParsed, setAllParsed] = useState(false)

  async function parseFile(file: File, index: number) {
    const uploadedFile: UploadedFile = {
      file,
      type: 'unknown',
      parsing: true,
      parsed: false,
      error: null,
      label: file.name,
      data: null,
    }

    // Update state to show parsing in progress
    setFiles(prev => {
      const updated = [...prev]
      updated[index] = uploadedFile
      return updated
    })

    try {
      console.log(`[DealUploadForm] ============ START PARSE ============`)
      console.log(`[DealUploadForm] File ${index + 1} of ${files.length + 1}`)
      console.log(`[DealUploadForm] Filename: ${file.name}`)
      console.log(`[DealUploadForm] File size: ${file.size} bytes`)
      console.log(`[DealUploadForm] File type: ${file.type}`)

      console.log(`[DealUploadForm] Calling serverParseFile...`)
      const result = await serverParseFile(file, file.name)

      console.log(`[DealUploadForm] Server response received`)
      console.log(`[DealUploadForm] Type: ${result.type}`)
      console.log(`[DealUploadForm] Error: ${result.error || 'none'}`)
      console.log(`[DealUploadForm] Label: ${result.label}`)
      console.log(`[DealUploadForm] Data exists: ${!!result.data}`)

      if (result.data && 'confidence_score' in result.data) {
        console.log(`[DealUploadForm] Confidence score: ${(result.data as any).confidence_score}`)
      }

      uploadedFile.type = result.type
      uploadedFile.data = result.data
      uploadedFile.error = result.error
      uploadedFile.label = result.label
      uploadedFile.parsing = false
      uploadedFile.parsed = result.type !== 'unknown' && !result.error

      console.log(`[DealUploadForm] Updated file state: parsed=${uploadedFile.parsed}, error=${uploadedFile.error}`)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error(`[DealUploadForm] EXCEPTION during parsing:`, errorMsg)
      console.error(`[DealUploadForm] Full error:`, err)

      uploadedFile.parsing = false
      uploadedFile.error = errorMsg
      uploadedFile.parsed = false
    }

    // Final update
    setFiles(prev => {
      const updated = [...prev]
      updated[index] = uploadedFile
      const allDone = updated.every(f => !f.parsing)

      console.log(`[DealUploadForm] All parsing done: ${allDone}`)
      console.log(`[DealUploadForm] Files status: ${updated.map((f, i) => `${i}: ${f.parsing ? 'parsing' : f.parsed ? 'parsed' : 'error'}`).join(', ')}`)

      if (allDone) {
        console.log(`[DealUploadForm] Setting allParsed=true`)
        setAllParsed(true)
      }
      console.log(`[DealUploadForm] ============ END PARSE ============`)
      return updated
    })
  }

  function handleDrop(e: React.DragEvent) {
    console.log(`[DealUploadForm] Files dropped`)
    e.preventDefault()
    setDragActive(false)
    const newFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
    console.log(`[DealUploadForm] Valid PDF files: ${newFiles.length}`)

    const startIndex = files.length
    setFiles(prev => [...prev, ...newFiles.map(f => ({
      file: f,
      type: 'unknown' as const,
      parsing: false,
      parsed: false,
      error: null,
      label: f.name,
      data: null,
    }))])

    console.log(`[DealUploadForm] Starting to parse ${newFiles.length} files`)
    newFiles.forEach((file, i) => parseFile(file, startIndex + i))
  }

  function removeFile(index: number) {
    console.log(`[DealUploadForm] Removing file at index ${index}`)
    setFiles(prev => prev.filter((_, i) => i !== index))
    setAllParsed(false)
  }

  const sorted = sortBankStatements(files)
  const hasApplication = files.some(f => f.type === 'application')
  const hasStatements = files.some(f => f.type === 'bank_statement')
  const hasErrors = files.some(f => f.error)

  console.log(`[DealUploadForm] Render: allParsed=${allParsed}, hasApp=${hasApplication}, hasStmt=${hasStatements}, hasErrors=${hasErrors}`)

  // If all parsed and has at least application OR bank statements, show review screen
  if (allParsed && (hasApplication || hasStatements)) {
    console.log(`[DealUploadForm] Showing ReviewScreenNew`)
    return <ReviewScreenNew files={sorted} />
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">1</div>
            <span className="text-sm font-medium text-slate-900">Upload</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${allParsed ? 'bg-green-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {allParsed ? '✓' : '2'}
            </div>
            <span className={`text-sm font-medium ${allParsed ? 'text-slate-900' : 'text-slate-500'}`}>Parsing</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold">3</div>
            <span className="text-sm font-medium text-slate-500">Review</span>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragActive(true) }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${dragActive ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400'}`}
      >
        <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-lg font-semibold text-slate-900 mb-1">Drag PDFs here</p>
        <p className="text-sm text-slate-500">Upload application, bank statements, or both. At least one is required.</p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-3">
          {sorted.map((f, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <FileText className="w-5 h-5 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{f.label}</p>
                  <p className="text-xs text-slate-500">{f.file.name}</p>
                </div>
                <div className="flex-shrink-0">
                  {f.parsing && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                  {f.parsed && !f.error && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {f.error && <AlertCircle className="w-5 h-5 text-red-500" />}
                </div>
                {!f.parsing && (
                  <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Error Message */}
              {f.error && (
                <div className="px-4 pb-4 bg-red-50 border-t border-red-200">
                  <p className="text-sm text-red-700 font-medium mb-1">❌ Parse Error</p>
                  <p className="text-xs text-red-600 break-words font-mono bg-red-100 p-2 rounded">
                    {f.error}
                  </p>
                </div>
              )}

              {/* Success Message */}
              {f.parsed && !f.error && f.data && (
                <div className="px-4 pb-4 bg-green-50 border-t border-green-200">
                  <p className="text-sm text-green-700 font-medium mb-1">✓ Parsed Successfully</p>
                  <p className="text-xs text-green-600">
                    Type: {f.type} | {f.data && 'confidence_score' in f.data ? `Confidence: ${(f.data as any).confidence_score}%` : 'No confidence score'}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
