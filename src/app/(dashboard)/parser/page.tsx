'use client'

import { useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader, Minus } from 'lucide-react'
import FileControlSheetDisplay from '@/app/(dashboard)/upload-deal/FileControlSheetDisplay'
import { parseFile } from '@/app/(dashboard)/upload-deal/parse-file'
import { generateFileControlSheet, type FileControlSheet } from '@/lib/file-control-sheet'
import type { ParsedApplication, ParsedBankStatement } from '@/types'

/**
 * PART 7: STANDALONE PARSER PAGE
 *
 * Independent parsing interface for uploading and parsing documents.
 * Users can upload merchant applications and/or bank statements,
 * get automatic parsing with confidence scores, and view comprehensive
 * file control sheets for underwriting.
 */

interface ParseResult {
  fileName: string
  fileType: 'application' | 'bank_statement' | 'unknown'
  data: ParsedApplication | ParsedBankStatement | null
  confidence: number
  error: string | null
}

export default function ParserPage() {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [parsing, setParsing] = useState(false)
  const [parseResults, setParseResults] = useState<ParseResult[]>([])
  const [fileControlSheet, setFileControlSheet] = useState<FileControlSheet | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf')
    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selectedFiles])
  }

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleParse = async () => {
    if (files.length === 0) {
      setError('Please select files to parse')
      return
    }

    setParsing(true)
    setError(null)
    setParseResults([])
    setFileControlSheet(null)

    const results: ParseResult[] = []
    let appData: ParsedApplication | null = null
    let stmtDataList: ParsedBankStatement[] = []

    try {
      for (const file of files) {
        try {
          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const result = await parseFile(buffer, file.name)
          results.push({
            fileName: file.name,
            fileType: result.type as 'application' | 'bank_statement' | 'unknown',
            data: result.data,
            confidence: result.data && 'confidence_score' in result.data ? result.data.confidence_score : 0,
            error: result.error,
          })

          if (result.type === 'application' && result.data) {
            appData = result.data as ParsedApplication
          } else if (result.type === 'bank_statement' && result.data) {
            stmtDataList.push(result.data as ParsedBankStatement)
          }
        } catch (err) {
          results.push({
            fileName: file.name,
            fileType: 'unknown',
            data: null,
            confidence: 0,
            error: err instanceof Error ? err.message : 'Unknown error',
          })
        }
      }

      setParseResults(results)

      // Generate FileControlSheet if we have data
      if (appData || stmtDataList.length > 0) {
        const sheet = generateFileControlSheet(appData, stmtDataList, 'Manual Parser', null)
        setFileControlSheet(sheet)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse files')
    } finally {
      setParsing(false)
    }
  }

  const handleClear = () => {
    setFiles([])
    setParseResults([])
    setFileControlSheet(null)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">Document Parser</h1>
          <p className="text-slate-400">Upload and parse merchant applications and bank statements independently</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Upload Section */}
        <div className="mb-8">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-all ${isDragging
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
              }`}
          >
            <div className="flex justify-center mb-4">
              <Upload className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Drop PDF files here</h2>
            <p className="text-slate-400 mb-6">or</p>
            <label className="inline-block">
              <input
                type="file"
                multiple
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              <span className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer font-medium transition">
                Select Files
              </span>
            </label>
            <p className="text-xs text-slate-500 mt-4">PDF files only</p>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-white mb-3">Selected Files ({files.length})</h3>
              <div className="space-y-2">
                {files.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded p-3">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-blue-400 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-slate-100">{file.name}</p>
                        <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(idx)}
                      className="text-slate-400 hover:text-red-400 transition"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleParse}
                  disabled={parsing || files.length === 0}
                  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  {parsing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Parse Documents
                    </>
                  )}
                </button>
                <button
                  onClick={handleClear}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-300">Error</p>
                <p className="text-sm text-red-200 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Parse Results */}
        {parseResults.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Parse Results</h2>
            <div className="space-y-3">
              {parseResults.map((result, idx) => (
                <div key={idx} className={`p-4 rounded-lg border ${
                  result.error
                    ? 'bg-red-900/20 border-red-700'
                    : 'bg-green-900/20 border-green-700'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {result.error ? (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        <p className="font-medium text-white">{result.fileName}</p>
                      </div>
                      {!result.error && (
                        <>
                          <p className={`text-sm mt-2 ${
                            result.fileType === 'application' ? 'text-blue-300' :
                            result.fileType === 'bank_statement' ? 'text-green-300' :
                            'text-yellow-300'
                          }`}>
                            Type: <span className="font-medium">{result.fileType}</span>
                          </p>
                          {result.confidence > 0 && (
                            <p className="text-sm text-slate-300 mt-1">
                              Confidence: <span className="font-medium">{result.confidence}%</span>
                            </p>
                          )}
                          {result.data && 'low_confidence_fields' in result.data && result.data.low_confidence_fields?.length > 0 && (
                            <p className="text-xs text-yellow-300 mt-2">
                              ⚠️ Low confidence on: {result.data.low_confidence_fields.join(', ')}
                            </p>
                          )}
                        </>
                      )}
                      {result.error && (
                        <p className="text-sm text-red-300 mt-2">{result.error}</p>
                      )}
                    </div>
                    <div className="text-right">
                      {!result.error && result.data && (
                        <div className="text-xs text-slate-400">
                          ✓ Parsed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Control Sheet */}
        {fileControlSheet && (
          <>
            <div className="mb-6 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
              <h2 className="text-lg font-semibold text-white">Underwriting Report Generated</h2>
              <p className="text-sm text-blue-300 mt-1">
                File control sheet has been generated from the parsed documents below.
              </p>
            </div>
            <FileControlSheetDisplay sheet={fileControlSheet} />
          </>
        )}

        {/* Empty State */}
        {parseResults.length === 0 && !fileControlSheet && files.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Upload PDF documents to get started</p>
          </div>
        )}
      </div>
    </div>
  )
}
