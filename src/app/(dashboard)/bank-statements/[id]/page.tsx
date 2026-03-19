import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert, AlertTriangle, CheckCircle, Info, DollarSign, TrendingDown } from 'lucide-react'
import DeleteStatementButton from './DeleteStatementButton'
import type { ClaudeAnalysis } from '../new/BankStatementUploadForm'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const fmt = (n: number | null | undefined) =>
  n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'

const pct = (n: number | null | undefined) =>
  n != null ? `${Number(n).toFixed(1)}%` : '—'

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

function Metric({ label, value, sub, highlight }: {
  label: string; value: string; sub?: string; highlight?: 'green' | 'red' | 'yellow'
}) {
  const valueColor = highlight === 'green' ? 'text-green-700' : highlight === 'red' ? 'text-red-600' : highlight === 'yellow' ? 'text-yellow-700' : 'text-slate-900'
  const bg = highlight === 'green' ? 'bg-green-50 border-green-100' : highlight === 'red' ? 'bg-red-50 border-red-100' : highlight === 'yellow' ? 'bg-yellow-50 border-yellow-100' : 'bg-slate-50 border-slate-200'
  return (
    <div className={`rounded-lg border p-3 ${bg}`}>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <p className={`text-base font-bold ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
    </div>
  )
}

export default async function BankStatementDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const { data: statement } = await supabase
    .from('bank_statements')
    .select('*, contacts(id, first_name, last_name, company)')
    .eq('id', params.id)
    .single()

  if (!statement) notFound()

  const analysis = statement.raw_data as ClaudeAnalysis | null
  const hasRichAnalysis = analysis && typeof analysis === 'object' && 'risk_flags' in analysis

  const highFlags = hasRichAnalysis ? analysis.risk_flags.filter((f) => f.level === 'high') : []
  const mediumFlags = hasRichAnalysis ? analysis.risk_flags.filter((f) => f.level === 'medium') : []
  const lowFlags = hasRichAnalysis ? analysis.risk_flags.filter((f) => f.level === 'low') : []
  const overallRisk = highFlags.length > 0 ? 'high' : mediumFlags.length > 0 ? 'medium' : 'low'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <Link href="/bank-statements" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Bank Statements
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{statement.file_name}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {statement.contacts && (
                <Link href={`/contacts/${(statement.contacts as { id: string }).id}`} className="text-sm text-blue-600 hover:underline">
                  {(statement.contacts as { first_name: string; last_name: string; company: string | null }).first_name}{' '}
                  {(statement.contacts as { first_name: string; last_name: string; company: string | null }).last_name}
                  {(statement.contacts as { first_name: string; last_name: string; company: string | null }).company ? ` · ${(statement.contacts as { first_name: string; last_name: string; company: string | null }).company}` : ''}
                </Link>
              )}
              {statement.statement_month && statement.statement_year && (
                <span className="text-sm text-slate-500">
                  {MONTHS[statement.statement_month - 1]} {statement.statement_year}
                </span>
              )}
              {hasRichAnalysis && <RiskBadge level={overallRisk} />}
            </div>
          </div>
          <DeleteStatementButton id={statement.id} fileName={statement.file_name} />
        </div>
      </div>

      {hasRichAnalysis ? (
        <>
          {/* AI Summary */}
          <div className={`rounded-xl border-2 p-5 ${overallRisk === 'high' ? 'bg-red-50 border-red-300' : overallRisk === 'medium' ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
            <div className="flex items-start justify-between flex-wrap gap-3 mb-2">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">Merchant</p>
                <p className="font-bold text-slate-900 text-lg">{analysis.merchant_name ?? '—'}</p>
                <p className="text-sm text-slate-600 mt-0.5">
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
              <p className="text-sm text-slate-700 border-t border-slate-200 pt-3 mt-3">{analysis.underwriter_summary}</p>
            )}
          </div>

          {/* Account Summary */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Account Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Starting Balance" value={fmt(analysis.starting_balance)} />
              <Metric label="Ending Balance" value={fmt(analysis.ending_balance)} highlight={analysis.ending_balance != null && analysis.ending_balance < 1000 ? 'red' : undefined} />
              <Metric label="Avg Daily Balance" value={fmt(analysis.average_daily_balance)} />
              <Metric label="Lowest Balance" value={fmt(analysis.lowest_daily_balance)} sub={analysis.lowest_balance_date ?? undefined} highlight={analysis.lowest_daily_balance != null && analysis.lowest_daily_balance < 1000 ? 'red' : undefined} />
            </div>
          </div>

          {/* Cash Flow */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Cash Flow</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Metric label="Total Deposits" value={fmt(analysis.total_deposits)} highlight="green" />
              <Metric label="Deposit Count" value={String(analysis.deposit_count)} />
              <Metric label="Total Withdrawals" value={fmt(analysis.total_withdrawals)} highlight="red" />
              <Metric label="Withdrawal Count" value={String(analysis.withdrawal_count)} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
              <Metric label="True Revenue" value={fmt(analysis.true_revenue_deposits)} highlight="green" sub="Actual business deposits" />
              <Metric label="Non-Revenue Deposits" value={fmt(analysis.non_revenue_deposits)} sub={analysis.non_revenue_deposit_details?.slice(0, 2).join(', ') || undefined} />
              <Metric label="Largest Deposit" value={fmt(analysis.largest_single_deposit)} sub={analysis.largest_single_deposit_description ?? undefined} />
            </div>
          </div>

          {/* MCA Holdback */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">MCA / Holdback Analysis</h3>
            {!analysis.mca_debits || analysis.mca_debits.length === 0 ? (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">No MCA debits detected</span>
              </div>
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
                  <Metric label="Holdback %" value={pct(analysis.holdback_percentage)} highlight={analysis.holdback_percentage > 20 ? 'red' : analysis.holdback_percentage > 10 ? 'yellow' : undefined} />
                  <Metric label="Position Rec." value={analysis.position_recommendation ?? '—'} highlight={analysis.position_recommendation === 'decline' ? 'red' : 'green'} />
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
                {analysis.nsf_dates?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {analysis.nsf_dates.map((d, i) => (
                      <span key={i} className="inline-flex px-2.5 py-1 rounded-lg bg-red-100 text-red-700 text-xs font-semibold">{d}</span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Risk Flags */}
          {analysis.risk_flags?.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Risk Flags</h3>
              <div className="space-y-2.5">
                {[...highFlags, ...mediumFlags, ...lowFlags].map((flag, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${flag.level === 'high' ? 'bg-red-50 border-red-200' : flag.level === 'medium' ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                    {flag.level === 'high' ? <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" /> : flag.level === 'medium' ? <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" /> : <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />}
                    <div>
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
                <p className="text-blue-300 text-sm mt-1">Based on {fmt(analysis.true_revenue_deposits)} true monthly revenue</p>
              </div>
              <DollarSign className="w-12 h-12 text-blue-700" />
            </div>
          </div>

          {/* Daily Balances */}
          {analysis.daily_ending_balances?.length > 0 && (
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
                      <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Balance</th>
                      <th className="text-right pb-2 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analysis.daily_ending_balances.map((row, i) => (
                      <tr key={i} className={row.balance < 0 ? 'bg-red-50' : row.balance < 1000 ? 'bg-yellow-50' : ''}>
                        <td className="py-1.5 text-slate-700">{row.date}</td>
                        <td className={`py-1.5 text-right font-medium ${row.balance < 0 ? 'text-red-600' : row.balance < 1000 ? 'text-yellow-700' : 'text-slate-900'}`}>{fmt(row.balance)}</td>
                        <td className="py-1.5 text-right">
                          {row.balance < 0 ? <span className="text-xs font-bold text-red-600">NEGATIVE</span> : row.balance < 1000 ? <span className="text-xs font-semibold text-yellow-600">LOW</span> : <span className="text-xs text-slate-400">OK</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {statement.analysis_notes && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Underwriter Notes</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{statement.analysis_notes}</p>
            </div>
          )}
        </>
      ) : (
        /* Fallback for older CSV-parsed statements */
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Deposits</p>
            <p className="text-xl font-bold text-green-700">{fmt(statement.total_deposits as number)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Withdrawals</p>
            <p className="text-xl font-bold text-red-600">{fmt(statement.total_withdrawals as number)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Avg Daily Balance</p>
            <p className="text-xl font-bold text-slate-900">{fmt(statement.average_daily_balance as number)}</p>
          </div>
          <div className={`rounded-xl border shadow-sm p-5 ${Number(statement.nsf_count) > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">NSF Count</p>
            <p className={`text-xl font-bold ${Number(statement.nsf_count) > 0 ? 'text-red-700' : 'text-slate-900'}`}>{statement.nsf_count}</p>
          </div>
        </div>
      )}
    </div>
  )
}
