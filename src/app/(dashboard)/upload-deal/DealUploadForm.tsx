'use client'

import { useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react'
import type { UploadedFile } from '@/types'
import ReviewScreenNew from './ReviewScreenNew'
import { generateLabel, sortBankStatements } from './utils'

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

    setFiles(prev => {
      const updated = [...prev]
      updated[index] = uploadedFile
      return updated
    })

    try {
      const fileName = file.name.toLowerCase()

      // Filename heuristics to determine likely type
      const hasMonthName = /january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2}|\d{4}-\d{2}/i.test(fileName)
      const hasDatePattern = /\d{1,2}-\d{1,2}|\d{4}-\d{2}-\d{2}|202[0-9]/.test(fileName)
      const hasAppKeyword = /app|application|form|merchant|underwriting/i.test(fileName)
      const likelyBankStatement = hasMonthName || (hasDatePattern && !hasAppKeyword)
      const likelyApplication = hasAppKeyword

      // Determine which parser to try first
      let appResult = null
      let stmtResult = null

      const appFormData = new FormData()
      appFormData.append('pdf', file)

      const stmtFormData = new FormData()
      stmtFormData.append('pdf', file)

      // Try parsers and collect results
      try {
        console.log(`[DealUploadForm] Parsing file ${index + 1}: ${file.name}`)
        const appResponse = await fetch('/api/parse-application', { method: 'POST', body: appFormData })
        console.log(`[DealUploadForm] Application parse response: ${appResponse.status} ${appResponse.statusText}`)
        if (appResponse.ok) {
          try {
            const responseText = await appResponse.text()
            console.log(`[DealUploadForm] Application response text: ${responseText.substring(0, 200)}...`)
            appResult = JSON.parse(responseText)
            console.log(`[DealUploadForm] Application parsed successfully:`, appResult?.data ? 'has data' : 'no data')
          } catch (parseErr) {
            console.error('Failed to parse application response JSON:', parseErr)
            appResult = null
          }
        } else {
          console.log(`[DealUploadForm] Application parse failed with status ${appResponse.status}`)
        }
      } catch (err) {
        console.error('Application parse request failed:', err)
        appResult = null
      }

      try {
        const stmtResponse = await fetch('/api/parse-bank-statement', { method: 'POST', body: stmtFormData })
        console.log(`[DealUploadForm] Bank statement parse response: ${stmtResponse.status} ${stmtResponse.statusText}`)
        if (stmtResponse.ok) {
          try {
            const responseText = await stmtResponse.text()
            console.log(`[DealUploadForm] Bank statement response text: ${responseText.substring(0, 200)}...`)
            stmtResult = JSON.parse(responseText)
            console.log(`[DealUploadForm] Bank statement parsed successfully:`, stmtResult?.data ? 'has data' : 'no data')
          } catch (parseErr) {
            console.error('Failed to parse bank statement response JSON:', parseErr)
            stmtResult = null
          }
        } else {
          console.log(`[DealUploadForm] Bank statement parse failed with status ${stmtResponse.status}`)
        }
      } catch (err) {
        console.error('Bank statement parse request failed:', err)
        stmtResult = null
      }

      // Determine type based on what was actually extracted
      const hasAppData = appResult?.data && (appResult.data.business_legal_name || appResult.data.owner_name || appResult.data.ein)
      const hasStmtData = stmtResult?.data && (stmtResult.data.statement_month || stmtResult.data.total_deposits)

      if (hasAppData && !hasStmtData) {
        uploadedFile.type = 'application'
        uploadedFile.data = appResult.data
      } else if (hasStmtData && !hasAppData) {
        uploadedFile.type = 'bank_statement'
        uploadedFile.data = stmtResult.data
      } else if (hasAppData && hasStmtData) {
        // Both have data, use filename hint
        uploadedFile.type = likelyBankStatement ? 'bank_statement' : 'application'
        uploadedFile.data = uploadedFile.type === 'application' ? appResult.data : stmtResult.data
      } else if (likelyBankStatement) {
        // Filename suggests bank statement
        uploadedFile.type = 'bank_statement'
        uploadedFile.data = stmtResult?.data || null
      } else if (likelyApplication) {
        // Filename suggests application
        uploadedFile.type = 'application'
        uploadedFile.data = appResult?.data || null
      } else {
        // Default to whichever had data, prefer bank statement if ambiguous
        uploadedFile.type = hasStmtData ? 'bank_statement' : hasAppData ? 'application' : 'unknown'
        uploadedFile.data = uploadedFile.type === 'application' ? appResult?.data : uploadedFile.type === 'bank_statement' ? stmtResult?.data : null
      }

      uploadedFile.parsing = false
      uploadedFile.parsed = uploadedFile.type !== 'unknown'
      uploadedFile.label = generateLabel(uploadedFile)
    } catch (err) {
      uploadedFile.parsing = false
      uploadedFile.error = err instanceof Error ? err.message : 'Parse failed'
    }

    setFiles(prev => {
      const updated = [...prev]
      updated[index] = uploadedFile
      const allDone = updated.every(f => !f.parsing)
      if (allDone) setAllParsed(true)
      return updated
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragActive(false)
    const newFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
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

    newFiles.forEach((file, i) => parseFile(file, startIndex + i))
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setAllParsed(false)
  }

  const sorted = sortBankStatements(files)
  const hasApplication = files.some(f => f.type === 'application')
  const hasStatements = files.some(f => f.type === 'bank_statement')

  // If all parsed and has at least application OR bank statements, show review screen
  if (allParsed && (hasApplication || hasStatements)) {
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
        <div className="space-y-2">
          {sorted.map((f, i) => (
            <div key={i} className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg">
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
          ))}
        </div>
      )}
    </div>
  )
}
