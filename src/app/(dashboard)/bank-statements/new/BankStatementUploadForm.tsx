'use client'

import { useState, useRef } from 'react'
import { createBankStatement } from '@/app/actions/bank-statements'
import {
  Upload, Loader2, AlertTriangle, CheckCircle, TrendingDown,
  ShieldAlert, DollarSign, FileText, AlertCircle, Info,
} from 'lucide-react'

interface ContactOption {
  id: string
  first_name: string
  last_name: string
  company: string | null
}

interface McaDebit {
  name: string
  amount_per_occurrence: number
  occurrences: number
  total_debited: number
  frequency: string
}

interface RiskFlag {
  level: 'high' | 'medium' | 'low'
  code: string
  message: string
}

interface DailyBalance {
  date: string
  balance: number
}

export interface ClaudeAnalysis {
  merchant_name: string | null
  account_number: string | null
  bank_name: string | null
  statement_period: string | null
  statement_month: number | null
  statement_year: number | null
  starting_balance: number | null
  ending_balance: number | null
  total_deposits: number
  deposit_count: number
  total_withdrawals: number
  withdrawal_count: number
  average_daily_balance: number | null
  lowest_daily_balance: number | null
  lowest_balance_date: string | null
  nsf_count: number
  nsf_dates: string[]
  mca_debits: McaDebit[]
  total_mca_holdback: number
  holdback_percentage: number
  true_revenue_deposits: number
  non_revenue_deposits: number
  non_revenue_deposit_details: string[]
  daily_ending_balances: DailyBalance[]
  largest_single_deposit: number
  largest_single_deposit_description: string | null
  risk_flags: RiskFlag[]
  recommended_advance: number
  position_recommendation: string
  underwriter_summary: string
}

interface Props {
  contacts: ContactOption[]
}

const fmt = (n: number | null | undefined) =>
  n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

const pct = (n: number | null | undefined) =>
  n != null ? `${n.toFixed(1)}%` : '—'

function RiskBadge({ level }: { level: string }) {
  const styles = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
  }[level] ?? 'bg-slate-100 text-slate-700 border-slate-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${styles} uppercase`}>
      {level}
    </span>
  )
}

function RiskFlagIcon({ level }: { level: string }) {
  if (level === 'high') return <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
  if (level === 'medium') return <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
  return <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
}

export default function BankStatementUploadForm({ contacts }: Props) {
  const [contactId, setContactId] = useState('')
  const [fileName, setFileName] = useState('')
  const [analysisNotes, setAnalysisNotes] = useState('')
  const [analysis, setAnalysis] = useState<ClaudeAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const highFlags = analysis?.risk_flags.filter(f => f.level === 'high') ?? []
  const mediumFlags = analysis?.risk_flags.filter(f => f.level === 'medium') ?? []
  const lowFlags = analysis?.risk_flags.filter(f => f.level === 'low') ?? []
  const overallRisk = highFlags.length > 0 ? 'high' : mediumFlags.length > 0 ? 'medium' : 'low'

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setAnalysis(null)
    setError('')
    setAnalyzing(true)

    try {
      const fd = new FormData()
      fd.append('pdf', file)

      const res = await fetch('/api/analyze-statement', { method: 'POST', body: fd })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error ?? 'Analysis failed. Please try again.')
        setAnalyzing(false)
        return
      }

      setAnalysis(data.analysis)
      // Auto-fill contact month/year if extracted
      if (data.analysis.statement_month) {
        // month/year come from analysis, exposed via hidden fields
      }
    } catch {
      setError('Failed to connect to analysis service. Check your API key.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleSave() {
    if (!analysis || !contactId) return
    setSaving(true)

    const fd = new FormData()
    fd.append('contact_id', contactId)
    fd.append('file_name', fileName)
    fd.append('statement_month', String(analysis.statement_month ?? ''))
    fd.append('statement_year', String(analysis.statement_year ?? ''))
    fd.append('analysis_notes', analysisNotes)
    fd.append('analysis_json', JSON.stringify(analysis))

    try {
      await createBankStatement(fd)
    } catch {
      setError('Failed to save. Please try again.')
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Merchant <span className="text-red-500">*</span>
          </label>
          <select
            value={contactId}
            onChange={e => setContactId(e.target.value)}
            required
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— Select merchant —</option>
            {contacts.map(c => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name}{c.company ? ` (${c.company})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* PDF drop zone */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Bank Statement PDF <span className="text-red-500">*</span>
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            {analyzing ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-blue-700">Claude is analyzing your statement…</p>
                <p className="text-xs text-slate-500">Extracting transactions, MCA debits, and risk indicators</p>
              </div>
            ) : fileName && analysis ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="w-10 h-10 text-green-500" />
                <p className="text-sm font-semibold text-slate-900">{fileName}</p>
                <p className="text-xs text-slate-500">Click to upload a different file</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Upload className="w-10 h-10 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Click to upload a PDF bank statement</p>
                  <p className="text-xs text-slate-500 mt-1">PDF files only · Analyzed by Claude AI</p>
                </div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {analysis && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Underwriter Notes</label>
            <textarea
              value={analysisNotes}
              onChange={e => setAnalysisNotes(e.target.value)}
              rows={2}
              placeholder="Additional notes or observations…"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={!analysis || !contactId || saving || analyzing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition flex items-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Saving…' : 'Save Statement'}
          </button>
          <a href="/bank-statements" className="text-sm text-slate-500 hover:text-slate-900 transition-colors px-4 py-2.5">
            Cancel
          </a>
        </div>
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4">

          {/* Header Summary */}
          <div className={`rounded-xl border-2 p-5 ${
            overallRisk === 'high' ? 'bg-red-50 border-red-300' :
            overallRisk === 'medium' ? 'bg-yellow-50 border-yellow-300' :
            'bg-green-50 border-green-300'
          }`}>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-bold text-slate-900">
                    {analysis.merchant_name ?? 'Statement Analysis'}
                  </h2>
                </div>
                <p className="text-sm text-slate-600">
                  {analysis.bank_name && `${analysis.bank_name} · `}
                  {analysis.account_number && `Acct ${analysis.account_number} · `}
                  {analysis.statement_period ?? 'Period not detected'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Overall Risk</p>
                <RiskBadge level={overallRisk} />
              </div>
            </div>
            {analysis.underwriter_summary && (
              <p className="mt-3 text-sm text-slate-700 border-t border-slate-200 pt-3">
                {analysis.underwriter_summary}
              </p>
            )}
          </div>

          {/* Key Metrics Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Account Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Starting Balance" value={fmt(analysis.starting_balance)} />
              <Metric label="Ending Balance" value={fmt(analysis.ending_balance)}
                highlight={analysis.ending_balance !== null && analysis.ending_balance < 1000 ? 'red' : undefined} />
              <Metric label="Avg Daily Balance" value={fmt(analysis.average_daily_balance)} />
              <Metric label="Lowest Balance" value={fmt(analysis.lowest_daily_balance)}
                sub={analysis.lowest_balance_date ?? undefined}
                highlight={analysis.lowest_daily_balance !== null && analysis.lowest_daily_balance < 1000 ? 'red' : undefined} />
            </div>
          </div>

          {/* Deposits & Withdrawals */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Cash Flow</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Total Deposits" value={fmt(analysis.total_deposits)} highlight="green" />
              <Metric label="Deposit Count" value={String(analysis.deposit_count)} />
              <Metric label="Total Withdrawals" value={fmt(analysis.total_withdrawals)} highlight="red" />
              <Metric label="Withdrawal Count" value={String(analysis.withdrawal_count)} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <Metric label="True Revenue" value={fmt(analysis.true_revenue_deposits)} highlight="green"
                sub="Actual business deposits" />
              <Metric label="Non-Revenue" value={fmt(analysis.non_revenue_deposits)}
                sub={analysis.non_revenue_deposit_details.slice(0, 2).join(', ') || undefined} />
              <Metric label="Largest Deposit" value={fmt(analysis.largest_single_deposit)}
                sub={analysis.largest_single_deposit_description ?? undefined} />
            </div>
          </div>

          {/* MCA Analysis */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">MCA / Holdback Analysis</h3>
            {analysis.mca_debits.length === 0 ? (
              <p className="text-sm text-slate-500 italic">No MCA debits detected in this statement.</p>
            ) : (
              <>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase">Lender / Description</th>
                        <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Per Payment</th>
                        <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Freq</th>
                        <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Count</th>
                        <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {analysis.mca_debits.map((d, i) => (
                        <tr key={i}>
                          <td className="py-2 font-medium text-slate-900">{d.name}</td>
                          <td className="py-2 text-right text-slate-700">{fmt(d.amount_per_occurrence)}</td>
                          <td className="py-2 text-right text-slate-500 capitalize">{d.frequency}</td>
                          <td className="py-2 text-right text-slate-700">{d.occurrences}×</td>
                          <td className="py-2 text-right font-semibold text-red-600">{fmt(d.total_debited)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Metric label="Total MCA Holdback" value={fmt(analysis.total_mca_holdback)} highlight="red" />
                  <Metric label="Holdback %" value={pct(analysis.holdback_percentage)}
                    highlight={analysis.holdback_percentage > 20 ? 'red' : analysis.holdback_percentage > 10 ? 'yellow' : undefined} />
                  <Metric label="Position Rec." value={analysis.position_recommendation ?? '—'}
                    highlight={analysis.position_recommendation === 'decline' ? 'red' : 'green'} />
                </div>
              </>
            )}
          </div>

          {/* NSF */}
          <div className={`rounded-xl border p-5 ${analysis.nsf_count > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200 shadow-sm'}`}>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">NSF / Returned Items</h3>
            {analysis.nsf_count === 0 ? (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">No NSF events detected</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-bold text-red-700">{analysis.nsf_count} NSF event{analysis.nsf_count !== 1 ? 's' : ''} detected</span>
                </div>
                {analysis.nsf_dates.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {analysis.nsf_dates.map((d, i) => (
                      <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-semibold">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Risk Flags */}
          {analysis.risk_flags.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Risk Flags</h3>
              <div className="space-y-2.5">
                {[...highFlags, ...mediumFlags, ...lowFlags].map((flag, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                    flag.level === 'high' ? 'bg-red-50 border-red-200' :
                    flag.level === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-blue-50 border-blue-200'
                  }`}>
                    <RiskFlagIcon level={flag.level} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <RiskBadge level={flag.level} />
                        <span className="text-xs font-semibold text-slate-600">{flag.code}</span>
                      </div>
                      <p className="text-sm text-slate-700">{flag.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Advance */}
          <div className="bg-blue-900 rounded-xl p-5 text-white">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-blue-300 text-xs font-semibold uppercase tracking-wide mb-1">Recommended Advance (10% of True Revenue)</p>
                <p className="text-3xl font-bold">{fmt(analysis.recommended_advance)}</p>
                <p className="text-blue-300 text-sm mt-1">
                  Based on {fmt(analysis.true_revenue_deposits)} true monthly revenue
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-blue-700" />
            </div>
          </div>

          {/* Daily Balances */}
          {analysis.daily_ending_balances.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                Daily Ending Balances ({analysis.daily_ending_balances.length} days)
              </h3>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-slate-200">
                      <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase">Date</th>
                      <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Ending Balance</th>
                      <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysis.daily_ending_balances.map((row, i) => (
                      <tr key={i} className={row.balance < 0 ? 'bg-red-50' : row.balance < 1000 ? 'bg-yellow-50' : ''}>
                        <td className="py-1.5 text-slate-700">{row.date}</td>
                        <td className={`py-1.5 text-right font-medium ${row.balance < 0 ? 'text-red-600' : row.balance < 1000 ? 'text-yellow-700' : 'text-slate-900'}`}>
                          {fmt(row.balance)}
                        </td>
                        <td className="py-1.5 text-right">
                          {row.balance < 0 ? <span className="text-xs font-bold text-red-600">NEGATIVE</span> :
                           row.balance < 1000 ? <span className="text-xs font-semibold text-yellow-600">LOW</span> :
                           <span className="text-xs text-slate-400">OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Metric({
  label, value, sub, highlight,
}: {
  label: string
  value: string
  sub?: string
  highlight?: 'green' | 'red' | 'yellow'
}) {
  const valueColor =
    highlight === 'green' ? 'text-green-700' :
    highlight === 'red' ? 'text-red-600' :
    highlight === 'yellow' ? 'text-yellow-700' :
    'text-slate-900'
  const bg =
    highlight === 'green' ? 'bg-green-50 border-green-100' :
    highlight === 'red' ? 'bg-red-50 border-red-100' :
    highlight === 'yellow' ? 'bg-yellow-50 border-yellow-100' :
    'bg-slate-50 border-slate-200'

  return (
    <div className={`rounded-lg border p-3 ${bg}`}>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={`text-base font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}
