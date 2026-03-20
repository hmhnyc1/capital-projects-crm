'use client'

import { useState } from 'react'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X, Download, Save, RotateCcw } from 'lucide-react'

/**
 * PART 7: STANDALONE PARSER PAGE
 *
 * Independent parsing interface that works standalone or integrated with CRM.
 * Users can upload application + bank statements, see live parsing progress,
 * edit data as it comes in, view file control sheet, and save to CRM or export.
 */

interface UploadedFile {
  id: string
  file: File
  type: 'application' | 'bank_statement' | 'unknown'
  parsing: boolean
  parsed: boolean
  error: string | null
  label: string
  data: any
}

export default function ParserPage() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [allParsed, setAllParsed] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<any>(null)

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const droppedFiles = Array.from(e.dataTransfer.files).filter(
      f => f.type === 'application/pdf'
    )

    const newFiles: UploadedFile[] = droppedFiles.map((file, idx) => {
      const hasMonthName = /january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec/i.test(file.name)
      const hasAppKeyword = /app|application|form|merchant|underwriting/i.test(file.name)

      return {
        id: `${Date.now()}-${idx}`,
        file,
        type: hasAppKeyword ? 'application' : hasMonthName ? 'bank_statement' : 'unknown',
        parsing: true,
        parsed: false,
        error: null,
        label: file.name,
        data: null,
      }
    })

    setFiles(prev => [...prev, ...newFiles])

    // Simulate parsing (in real implementation, this calls API)
    newFiles.forEach((f, idx) => {
      setTimeout(() => {
        setFiles(prev => {
          const updated = [...prev]
          const fileIdx = updated.findIndex(uf => uf.id === f.id)
          if (fileIdx >= 0) {
            updated[fileIdx] = {
              ...updated[fileIdx],
              parsing: false,
              parsed: true,
              label: `${f.type === 'application' ? '📄 Application' : '🏦 Bank Statement'} - ${f.file.name}`,
            }
          }
          return updated
        })

        setAllParsed(
          files.length > 0 &&
          files.every(
            file => !file.parsing && (file.parsed || file.error)
          )
        )
      }, 1500 + Math.random() * 500)
    })
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id))
    setAllParsed(false)
  }

  function handleStartOver() {
    setFiles([])
    setAllParsed(false)
    setShowResults(false)
    setResults(null)
  }

  async function handleExportPDF() {
    // In real implementation, generate PDF from results
    alert('PDF export functionality would be implemented here')
  }

  async function handleSaveToCRM() {
    // In real implementation, save to CRM database
    alert('Save to CRM functionality would be implemented here')
  }

  if (showResults && results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-slate-900 mb-2">File Control Sheet</h1>
            <p className="text-slate-600">{results.merchant_legal_name || 'Unknown Merchant'}</p>
          </div>

          {/* Results Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <p className="text-sm text-slate-600 mb-1">Recommendation</p>
              <p className="text-2xl font-bold text-blue-600">{results.overall_recommendation}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <p className="text-sm text-slate-600 mb-1">Underwriting Score</p>
              <p className="text-2xl font-bold text-green-600">{results.scorecard?.overall_score || 'N/A'}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <p className="text-sm text-slate-600 mb-1">Revenue (Monthly)</p>
              <p className="text-2xl font-bold text-purple-600">
                ${(results.merchant_summary?.monthly_revenue || 0).toLocaleString()}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
              <p className="text-sm text-slate-600 mb-1">Confidence</p>
              <p className="text-2xl font-bold text-orange-600">{results.overall_confidence_score}%</p>
            </div>
          </div>

          {/* Bank Analysis Table */}
          {results.bank_analysis_months && results.bank_analysis_months.length > 0 && (
            <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">Monthly Bank Analysis</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600">Month</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600">Revenue</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600">ADB</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600">NSFs</th>
                      <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600">MCA Holdback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {results.bank_analysis_months.map((month: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{month.month_label}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 text-right">
                          ${month.true_revenue.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 text-right">
                          ${(month.avg_daily_balance || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 text-right">{month.nsf_count}</td>
                        <td className="px-6 py-4 text-sm text-slate-600 text-right">
                          ${month.mca_holdback.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Risk Flags */}
          {results.risk_flags && results.risk_flags.length > 0 && (
            <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-semibold text-slate-900">Risk Flags</h2>
              </div>
              <div className="divide-y divide-slate-200">
                {results.risk_flags.map((flag: any, idx: number) => (
                  <div key={idx} className="p-6 flex gap-4">
                    <div className="flex-shrink-0">
                      {flag.severity === 'HIGH' && <div className="w-4 h-4 rounded-full bg-red-500 mt-1" />}
                      {flag.severity === 'MEDIUM' && <div className="w-4 h-4 rounded-full bg-yellow-500 mt-1" />}
                      {flag.severity === 'LOW' && <div className="w-4 h-4 rounded-full bg-blue-500 mt-1" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{flag.flag}</p>
                      <p className="text-sm text-slate-600 mt-1">{flag.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
            >
              <Download className="w-5 h-5" />
              Export PDF
            </button>
            <button
              onClick={handleSaveToCRM}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition"
            >
              <Save className="w-5 h-5" />
              Save to CRM
            </button>
            <button
              onClick={handleStartOver}
              className="flex items-center gap-2 px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition"
            >
              <RotateCcw className="w-5 h-5" />
              Start Over
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Document Parser</h1>
          <p className="text-slate-600 text-lg mt-2">Upload merchant application and bank statements. We&apos;ll extract everything automatically.</p>
        </div>

        {/* Progress Steps */}
        <div className="flex gap-8 justify-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold mb-2">1</div>
            <span className="text-sm font-medium text-slate-700">Upload</span>
          </div>
          <div className="flex flex-col items-center opacity-50">
            <div className="w-12 h-12 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center font-bold mb-2">2</div>
            <span className="text-sm font-medium text-slate-700">Parse</span>
          </div>
          <div className="flex flex-col items-center opacity-50">
            <div className="w-12 h-12 rounded-full bg-slate-300 text-slate-600 flex items-center justify-center font-bold mb-2">3</div>
            <span className="text-sm font-medium text-slate-700">Review</span>
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-slate-300 hover:border-blue-400 bg-white'
          }`}
        >
          <Upload className="w-16 h-16 text-slate-400 mx-auto mb-4" />
          <p className="text-xl font-semibold text-slate-900 mb-2">Drag PDFs here</p>
          <p className="text-slate-600 mb-4">Upload application, bank statements, or both</p>
          <label className="inline-block">
            <input
              type="file"
              multiple
              accept=".pdf"
              onChange={e => {
                if (e.target.files) {
                  const newFiles = Array.from(e.target.files).map((file, idx) => ({
                    id: `${Date.now()}-${idx}`,
                    file: file as File,
                    type: 'unknown' as const,
                    parsing: false,
                    parsed: false,
                    error: null,
                    label: file.name,
                    data: null,
                  }))
                  setFiles(prev => [...prev, ...newFiles])
                }
              }}
              className="hidden"
            />
            <span className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg inline-block transition">
              Or click to select
            </span>
          </label>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition">
                <FileText className="w-6 h-6 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{f.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{f.file.size.toLocaleString()} bytes</p>
                </div>
                <div className="flex-shrink-0">
                  {f.parsing && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                  {f.parsed && !f.error && <CheckCircle className="w-5 h-5 text-green-500" />}
                  {f.error && <AlertCircle className="w-5 h-5 text-red-500" />}
                </div>
                <button
                  onClick={() => removeFile(f.id)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {files.length > 0 && (
          <div className="flex gap-4">
            <button
              onClick={() => setShowResults(true)}
              disabled={!allParsed}
              className={`flex-1 py-3 rounded-lg font-semibold transition ${
                allParsed
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-slate-200 text-slate-500 cursor-not-allowed'
              }`}
            >
              {allParsed ? 'View Results' : 'Parsing...'}
            </button>
            <button
              onClick={() => setFiles([])}
              className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold rounded-lg transition"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
