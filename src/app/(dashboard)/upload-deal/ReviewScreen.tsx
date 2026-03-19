'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { createDealFromUpload } from '@/app/actions/upload-deal'
import { calculateRiskScore } from './RiskScorer'
import { calculateMonthlySummary } from './utils'
import type { UploadedFile, ParsedApplication, ParsedBankStatement } from '@/types'

export default function ReviewScreen({ files }: { files: UploadedFile[] }) {
  const [creating, setCreating] = useState(false)

  const app = files.find(f => f.type === 'application')?.data as ParsedApplication | null
  const statements = files
    .filter(f => f.type === 'bank_statement' && f.data)
    .map(f => f.data as ParsedBankStatement)

  const risk = calculateRiskScore(files)
  const summary = calculateMonthlySummary(files)

  const fmt = (n: number | null | undefined) =>
    n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'

  async function handleCreate() {
    setCreating(true)
    try {
      // Upload files to storage first
      const uploadFormData = new FormData()
      files.forEach(f => uploadFormData.append('files', f.file))

      const uploadResponse = await fetch('/api/upload-deal-files', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json()
        throw new Error(uploadError.error || 'File upload failed')
      }

      const { dealId, uploadedPaths } = await uploadResponse.json()

      // Now create deal with file paths (all data is now serializable)
      await createDealFromUpload(app!, statements, dealId, uploadedPaths)
    } catch (err) {
      alert('Error creating deal: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setCreating(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Progress */}
      <div className="flex items-center gap-4">
        <div><div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center">✓</div></div>
        <span className="text-sm font-medium">Upload</span>
        <div className="flex-1 border-t border-green-600"></div>
        <div><div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center">✓</div></div>
        <span className="text-sm font-medium">Parsing</span>
        <div className="flex-1 border-t border-slate-300"></div>
        <div><div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">3</div></div>
        <span className="text-sm font-medium">Review</span>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Application Info */}
        <div className="col-span-1 space-y-3">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-3">Merchant Info</h3>
            <div className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-slate-500">Legal Name</p>
                <p className="font-medium text-slate-900">{app?.business_legal_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Owner</p>
                <p className="font-medium text-slate-900">{app?.owner_name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">EIN</p>
                <p className="font-medium text-slate-900">{app?.ein || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Time in Business</p>
                <p className="font-medium text-slate-900">{app?.time_in_business_years ? `${app.time_in_business_years} years` : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Stated Revenue</p>
                <p className="font-medium text-slate-900">{fmt(app?.stated_monthly_revenue)}/mo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Bank Analysis */}
        <div className="col-span-2 space-y-3">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Statements Analyzed</p>
              <p className="text-2xl font-bold text-slate-900">{summary.totalMonths}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Date Range</p>
              <p className="text-lg font-bold text-slate-900">{summary.dateRange}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Avg Monthly Revenue</p>
              <p className="text-2xl font-bold text-green-700">{fmt(summary.avgMonthlyRevenue)}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500 mb-1">Revenue Trend</p>
              <p className="text-lg font-bold text-slate-900">{summary.revenueTrend}</p>
            </div>
          </div>

          {/* Bank Statement Cards */}
          <div className="space-y-2">
            {statements.map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex justify-between mb-2">
                  <p className="font-semibold text-slate-900">
                    {new Date(s.statement_year, s.statement_month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                  <span className="text-xs font-semibold text-slate-500">Month {i + 1}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div><p className="text-xs text-slate-500">Revenue</p><p className="font-medium text-green-700">{fmt(s.true_revenue_deposits)}</p></div>
                  <div><p className="text-xs text-slate-500">Avg Balance</p><p className="font-medium text-slate-900">{fmt(s.average_daily_balance)}</p></div>
                  <div><p className="text-xs text-slate-500">NSF</p><p className={`font-medium ${s.nsf_count > 0 ? 'text-red-600' : 'text-slate-900'}`}>{s.nsf_count}</p></div>
                  <div><p className="text-xs text-slate-500">MCA Hold</p><p className={`font-medium ${s.holdback_percentage > 15 ? 'text-red-600' : 'text-slate-900'}`}>{s.holdback_percentage.toFixed(1)}%</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className={`rounded-xl border-2 p-5 ${risk.level === 'high' ? 'bg-red-50 border-red-300' : risk.level === 'medium' ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 mb-1">Risk Assessment</h3>
            <p className="text-sm text-slate-600">Score: {risk.score}/100 — {risk.level.toUpperCase()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Recommended Advance</p>
            <p className="text-2xl font-bold text-blue-600">{fmt(risk.recommendedAdvance)}</p>
          </div>
        </div>
        {risk.flags.length > 0 && (
          <div className="space-y-2">
            {risk.flags.map((flag, i) => (
              <div key={i} className="flex gap-2 text-sm">
                <AlertTriangle className={`w-4 h-4 flex-shrink-0 mt-0.5 ${flag.severity === 'high' ? 'text-red-600' : 'text-yellow-600'}`} />
                <span className="text-slate-700">{flag.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleCreate}
          disabled={creating}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
        >
          {creating && <Loader2 className="w-5 h-5 animate-spin" />}
          {creating ? 'Creating Deal...' : 'Create Deal'}
        </button>
        <button className="flex-1 border border-slate-300 text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-slate-50 transition">
          Edit Before Creating
        </button>
      </div>
    </div>
  )
}
