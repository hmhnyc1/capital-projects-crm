'use client'

import { useState } from 'react'
import { AlertTriangle, Loader2, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import { createDealFromUpload } from '@/app/actions/upload-deal'
import { calculateRiskScore } from './RiskScorer'
import { calculateMonthlySummary, calculatePortfolioMetrics, extractMCAPositions } from './utils'
import type { UploadedFile, ParsedApplication, ParsedBankStatement } from '@/types'

export default function ReviewScreen({ files }: { files: UploadedFile[] }) {
  const [creating, setCreating] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    merchant: true,
    bankAnalysis: true,
    portfolio: true,
    mca: true,
    scorecard: true,
    flags: true,
    documents: true,
  })

  const app = files.find(f => f.type === 'application')?.data as ParsedApplication | null
  const statements = files
    .filter(f => f.type === 'bank_statement' && f.data)
    .map(f => f.data as ParsedBankStatement)

  const risk = calculateRiskScore(files)
  const summary = calculateMonthlySummary(files)
  const portfolio = calculatePortfolioMetrics(statements)
  const mcaPositions = extractMCAPositions(statements)

  const fmt = (n: number | null | undefined) =>
    n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'

  const toggle = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }))
  }

  async function handleCreate() {
    setCreating(true)
    try {
      console.log('[ReviewScreen] Starting Create Deal flow')
      console.log('[ReviewScreen] Files to upload:', files.length)
      console.log('[ReviewScreen] Application data:', app)
      console.log('[ReviewScreen] Statements:', statements.length)

      // Upload files to storage first
      const uploadFormData = new FormData()
      files.forEach(f => uploadFormData.append('files', f.file))

      console.log('[ReviewScreen] Uploading files...')
      const uploadResponse = await fetch('/api/upload-deal-files', {
        method: 'POST',
        body: uploadFormData,
      })

      console.log('[ReviewScreen] Upload response status:', uploadResponse.status, uploadResponse.statusText)
      console.log('[ReviewScreen] Upload response headers:', {
        contentType: uploadResponse.headers.get('content-type'),
        contentLength: uploadResponse.headers.get('content-length'),
      })

      if (!uploadResponse.ok) {
        let errorMessage = 'File upload failed'
        try {
          const responseText = await uploadResponse.text()
          console.log('[ReviewScreen] Upload error response text:', responseText)
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
        } catch (parseErr) {
          console.error('[ReviewScreen] Failed to parse upload error response:', parseErr)
          errorMessage = `Upload failed (${uploadResponse.status}): ${uploadResponse.statusText}`
        }
        throw new Error(errorMessage)
      }

      let uploadData
      try {
        const responseText = await uploadResponse.text()
        console.log('[ReviewScreen] Upload response text:', responseText)
        uploadData = JSON.parse(responseText)
        console.log('[ReviewScreen] Upload response data:', uploadData)
      } catch (parseErr) {
        console.error('[ReviewScreen] Failed to parse upload response:', parseErr)
        throw new Error('Invalid response from file upload API')
      }

      const { dealId, uploadedPaths } = uploadData
      console.log('[ReviewScreen] Deal ID:', dealId)
      console.log('[ReviewScreen] Uploaded paths:', uploadedPaths)

      // Now create deal with file paths (all data is now serializable)
      console.log('[ReviewScreen] Calling createDealFromUpload...')
      await createDealFromUpload(app!, statements, dealId, uploadedPaths)
      console.log('[ReviewScreen] Deal created successfully')
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[ReviewScreen] Error creating deal:', errorMsg, err)
      alert('Error creating deal: ' + errorMsg)
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Progress */}
        <div className="flex items-center gap-4 mb-8">
          <div><div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">✓</div></div>
          <span className="text-sm font-medium text-slate-200">Upload</span>
          <div className="flex-1 border-t border-green-600"></div>
          <div><div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">✓</div></div>
          <span className="text-sm font-medium text-slate-200">Parsing</span>
          <div className="flex-1 border-t border-slate-700"></div>
          <div><div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">3</div></div>
          <span className="text-sm font-medium text-slate-200">Review</span>
        </div>

        {/* Merchant Summary */}
        <CollapsibleSection title="Merchant Summary" section="merchant" expanded={expanded} toggle={toggle}>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>Legal Name</Label>
              <p className="text-slate-100 font-medium">{app?.business_legal_name || '—'}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>DBA / Doing Business As</Label>
              <p className="text-slate-100 font-medium">{app?.dba || '—'}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>Entity Type</Label>
              <p className="text-slate-100 font-medium">{app?.entity_type || '—'}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>Owner Name</Label>
              <p className="text-slate-100 font-medium">{app?.owner_1_name || '—'}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>Ownership %</Label>
              <p className="text-slate-100 font-medium">{app?.owner_1_ownership_pct ? `${app.owner_1_ownership_pct}%` : '—'}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>EIN</Label>
              <p className="text-slate-100 font-medium">{app?.ein || '—'}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>Industry</Label>
              <p className="text-slate-100 font-medium">{app?.industry || '—'}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>Time in Business</Label>
              <p className="text-slate-100 font-medium">{app?.time_in_business_years ? `${app.time_in_business_years} years` : '—'}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>Monthly Revenue</Label>
              <p className="text-green-400 font-medium text-lg">{fmt(app?.monthly_revenue)}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>Business Address</Label>
              <p className="text-slate-100 font-medium text-sm">{app?.business_address || '—'}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>Phone</Label>
              <p className="text-slate-100 font-medium">{app?.business_phone || '—'}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>Email</Label>
              <p className="text-slate-100 font-medium text-sm">{app?.business_email || '—'}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>Bank Name</Label>
              <p className="text-slate-100 font-medium">{app?.bank_name || '—'}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>Landlord Name</Label>
              <p className="text-slate-100 font-medium">{app?.landlord_name || '—'}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>Monthly Rent</Label>
              <p className="text-slate-100 font-medium">{fmt(app?.monthly_rent)}</p>
            </div>
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
              <Label>Use of Funds</Label>
              <p className="text-slate-100 font-medium">{app?.use_of_funds || '—'}</p>
            </div>
          </div>
        </CollapsibleSection>

        {/* Bank Analysis */}
        <CollapsibleSection title="Bank Analysis by Month" section="bankAnalysis" expanded={expanded} toggle={toggle}>
          <div className="space-y-4">
            {statements.map((s, i) => (
              <BankAnalysisCard key={i} statement={s} month={i + 1} fmt={fmt} />
            ))}
          </div>
        </CollapsibleSection>

        {/* Portfolio Summary */}
        <CollapsibleSection title="Combined Portfolio Summary" section="portfolio" expanded={expanded} toggle={toggle}>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Statements Analyzed" value={summary.totalMonths.toString()} />
            <StatCard label="Date Range" value={summary.dateRange} />
            <StatCard label="Average Monthly Revenue" value={fmt(portfolio.avgMonthlyRevenue)} valueColor="text-green-400" />
            <StatCard label="Revenue Trend" value={portfolio.revenueTrend} />
            <StatCard label="Average Daily Balance" value={fmt(portfolio.avgAdb)} />
            <StatCard label="Total NSF Events" value={portfolio.totalNsf.toString()} valueColor={portfolio.totalNsf > 3 ? 'text-red-400' : 'text-slate-100'} />
            <StatCard label="Total MCA Obligations" value={fmt(portfolio.totalMcaObligations)} valueColor="text-yellow-400" />
            <StatCard label="Average Holdback %" value={`${portfolio.avgHoldback.toFixed(1)}%`} valueColor={portfolio.avgHoldback > 15 ? 'text-red-400' : 'text-slate-100'} />
          </div>
        </CollapsibleSection>

        {/* MCA Positions */}
        {mcaPositions.length > 0 && (
          <CollapsibleSection title="Identified MCA Positions" section="mca" expanded={expanded} toggle={toggle}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Funder</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-semibold">Daily Debit</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-semibold">Weekly</th>
                    <th className="text-right py-3 px-4 text-slate-300 font-semibold">Monthly Total</th>
                    <th className="text-left py-3 px-4 text-slate-300 font-semibold">Period</th>
                  </tr>
                </thead>
                <tbody>
                  {mcaPositions.map((pos, i) => (
                    <tr key={i} className="border-b border-slate-800 hover:bg-slate-900/50">
                      <td className="py-3 px-4 text-slate-100 font-medium">{pos.funderName}</td>
                      <td className="text-right py-3 px-4 text-yellow-400">{fmt(pos.dailyDebit)}</td>
                      <td className="text-right py-3 px-4 text-slate-100">{fmt(pos.dailyDebit * 7)}</td>
                      <td className="text-right py-3 px-4 text-yellow-400 font-medium">{fmt(pos.dailyDebit * 30)}</td>
                      <td className="py-3 px-4 text-slate-400">{pos.firstSeen} to {pos.lastSeen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CollapsibleSection>
        )}

        {/* Underwriting Scorecard */}
        <CollapsibleSection title="Underwriting Scorecard" section="scorecard" expanded={expanded} toggle={toggle}>
          <div className="bg-slate-900 rounded-lg p-6 border border-slate-800 mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-slate-300 font-semibold">Overall Risk Score</h3>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold text-slate-100">{risk.score}</span>
                <span className="text-slate-400 mb-2">/100</span>
              </div>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${risk.score < 35 ? 'bg-green-500' : risk.score < 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${risk.score}%` }}
              />
            </div>
            <p className={`text-sm mt-2 font-semibold ${risk.score < 35 ? 'text-green-400' : risk.score < 70 ? 'text-yellow-400' : 'text-red-400'}`}>
              Risk Level: {risk.level.toUpperCase()}
            </p>
          </div>

          <div className="space-y-3">
            <ScoreRow label="Average Daily Balance" score={Math.max(0, Math.min(100, (portfolio.avgAdb / 10000) * 100))} />
            <ScoreRow label="Revenue Consistency" score={100 - Math.abs(portfolio.revenueTrendPercent || 0)} />
            <ScoreRow label="NSF Risk" score={Math.max(0, 100 - portfolio.totalNsf * 20)} />
            <ScoreRow label="MCA Stack Risk" score={Math.max(0, 100 - mcaPositions.length * 25)} />
            <ScoreRow label="Revenue Trend" score={portfolio.revenueTrendPercent ? (portfolio.revenueTrendPercent > 0 ? 100 : 50) : 75} />
            <ScoreRow label="Time in Business" score={app?.time_in_business_years ? Math.min(100, app.time_in_business_years * 25) : 0} />
          </div>

          <div className="mt-6 bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h4 className="font-semibold text-slate-200 mb-3">Recommendations</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Max Advance Amount</p>
                <p className="text-lg font-bold text-green-400">{fmt(risk.recommendedAdvance)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Factor Rate Range</p>
                <p className="text-lg font-bold text-slate-100">1.20 - 1.45</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Recommended Term</p>
                <p className="text-lg font-bold text-slate-100">4-6 months</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Daily Debit Range</p>
                <p className="text-lg font-bold text-slate-100">${Math.round((risk.recommendedAdvance / 150) / 30).toLocaleString()} - ${Math.round((risk.recommendedAdvance / 120) / 30).toLocaleString()}</p>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Risk Flags */}
        {risk.flags.length > 0 && (
          <CollapsibleSection title={`Risk Flags (${risk.flags.length})`} section="flags" expanded={expanded} toggle={toggle}>
            <div className="space-y-3">
              {risk.flags.map((flag, i) => (
                <div key={i} className="flex gap-3 p-4 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="flex-shrink-0">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 ${flag.severity === 'high' ? 'text-red-400' : flag.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'}`} />
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold ${flag.severity === 'high' ? 'text-red-300' : flag.severity === 'medium' ? 'text-yellow-300' : 'text-blue-300'}`}>
                      {flag.severity.toUpperCase()}
                    </p>
                    <p className="text-slate-300">{flag.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Documents */}
        <CollapsibleSection title={`Documents Attached (${files.length})`} section="documents" expanded={expanded} toggle={toggle}>
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 font-medium truncate">{f.label}</p>
                  <p className="text-xs text-slate-400">{f.file.name} ({(f.file.size / 1024 / 1024).toFixed(2)} MB)</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ${f.type === 'application' ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300'}`}>
                  {f.type === 'application' ? 'Application' : 'Bank Statement'}
                </span>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8 pt-4 border-t border-slate-800">
          <button
            onClick={handleCreate}
            disabled={creating}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-bold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
          >
            {creating && <Loader2 className="w-5 h-5 animate-spin" />}
            {creating ? 'Creating Deal...' : 'Create Deal'}
          </button>
          <button className="flex-1 border border-slate-700 text-slate-200 font-bold py-3 px-6 rounded-lg hover:bg-slate-900 transition">
            Edit Before Creating
          </button>
        </div>
      </div>
    </div>
  )
}

function CollapsibleSection({
  title,
  section,
  expanded,
  toggle,
  children,
}: {
  title: string
  section: string
  expanded: Record<string, boolean>
  toggle: (section: string) => void
  children: React.ReactNode
}) {
  return (
    <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
      <button
        onClick={() => toggle(section)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition"
      >
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        {expanded[section] ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>
      {expanded[section] && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-800 space-y-4">
          {children}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, valueColor = 'text-slate-100' }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      <p className={`text-2xl font-bold ${valueColor}`}>{value}</p>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-400 mb-1">{children}</p>
}

function BankAnalysisCard({ statement: s, month, fmt }: { statement: ParsedBankStatement; month: number; fmt: (n: number | null | undefined) => string }) {
  const mcaTotal = s.total_mca_holdback || 0
  const avgMcaDaily = s.mca_positions?.reduce((sum, d) => sum + d.amount_per_debit, 0) || 0
  const holdbackPct = s.holdback_pct_of_true_revenue || 0

  return (
    <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">
            {s.statement_month_label || 'Unknown Month'}
          </h3>
          <p className="text-sm text-slate-400">Month {month}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-800 rounded p-3">
          <p className="text-xs text-slate-400 mb-1">Revenue</p>
          <p className="text-lg font-bold text-green-400">{fmt(s.true_revenue_total)}</p>
        </div>
        <div className="bg-slate-800 rounded p-3">
          <p className="text-xs text-slate-400 mb-1">Avg Daily Balance</p>
          <p className="text-lg font-bold text-slate-100">{fmt(s.average_daily_balance)}</p>
        </div>
        <div className="bg-slate-800 rounded p-3">
          <p className="text-xs text-slate-400 mb-1">NSF Events</p>
          <p className={`text-lg font-bold ${s.nsf_count > 0 ? 'text-red-400' : 'text-slate-100'}`}>{s.nsf_count}</p>
        </div>
        <div className="bg-slate-800 rounded p-3">
          <p className="text-xs text-slate-400 mb-1">MCA Holdback</p>
          <p className={`text-lg font-bold ${holdbackPct > 15 ? 'text-red-400' : 'text-yellow-400'}`}>{holdbackPct.toFixed(1)}%</p>
        </div>
      </div>

      {s.mca_positions && s.mca_positions.length > 0 && (
        <div className="bg-slate-800/50 rounded p-3">
          <p className="text-xs text-slate-400 mb-2 font-semibold">MCA Positions</p>
          <div className="space-y-1 text-sm">
            {s.mca_positions.map((d, i) => (
              <div key={i} className="flex justify-between">
                <span className="text-slate-300">{d.funder_name}</span>
                <span className="text-yellow-400 font-medium">{fmt(d.amount_per_debit)}/day</span>
              </div>
            ))}
            {mcaTotal > 0 && (
              <div className="flex justify-between pt-1 border-t border-slate-700 mt-1 font-semibold">
                <span className="text-slate-200">Total MCA</span>
                <span className="text-yellow-400">{fmt(mcaTotal)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ScoreRow({ label, score }: { label: string; score: number }) {
  return (
    <div className="bg-slate-800 rounded p-3">
      <div className="flex justify-between mb-2">
        <p className="text-sm text-slate-300">{label}</p>
        <p className="text-sm font-bold text-slate-100">{Math.round(score)}/100</p>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${score >= 75 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  )
}
