'use client'

import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp, FileText, Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { createDealComprehensive } from '@/app/actions/create-deal-comprehensive'
import { saveParsedData } from '@/app/actions/save-parsed-data'
import { calculateRiskScore } from './RiskScorer'
import { calculateMonthlySummary, calculatePortfolioMetrics, extractMCAPositions, generateStatementMetrics, findLowestAndHighestMonth, getMonthLabel, getRevenueVariance } from './utils'
import type { UploadedFile, ParsedApplication, ParsedBankStatement } from '@/types'

interface DealTerms {
  advanceAmount: number
  factorRate: number
  termDays: number
}

export default function ReviewScreenNew({ files, readOnly = false }: { files: UploadedFile[]; readOnly?: boolean }) {
  const [creating, setCreating] = useState(false)
  const [dealTerms, setDealTerms] = useState<DealTerms>({
    advanceAmount: 0,
    factorRate: 1.3,
    termDays: 150,
  })
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    header: true,
    summary: true,
    merchant: true,
    analysis: true,
    months: true,
    mca: true,
    scorecard: true,
    flags: true,
    calculator: !readOnly,
    documents: true,
  })

  const app = files.find(f => f.type === 'application')?.data as ParsedApplication | null
  const statements = files
    .filter(f => f.type === 'bank_statement' && f.data)
    .map(f => f.data as ParsedBankStatement)

  const risk = calculateRiskScore(files)
  const portfolio = calculatePortfolioMetrics(statements)
  const mcaPositions = extractMCAPositions(statements)
  const metrics = generateStatementMetrics(statements)
  const extremes = findLowestAndHighestMonth(statements)

  const fmt = (n: number | null | undefined) =>
    n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : '—'

  const toggle = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }))
  }

  // Calculate deal terms
  const paybackAmount = dealTerms.advanceAmount * dealTerms.factorRate
  const dailyDebit = paybackAmount / dealTerms.termDays
  const weeklyDebit = dailyDebit * 7
  const grossProfit = paybackAmount - dealTerms.advanceAmount
  const revenuePercent = portfolio.avgMonthlyRevenue > 0 ? (dailyDebit * 30) / portfolio.avgMonthlyRevenue * 100 : 0

  if (!app && statements.length === 0) {
    return <div className="text-slate-200">Error: At least an application or bank statements are required</div>
  }

  // Determine if documents are incomplete
  const missingApp = !app
  const missingStatements = statements.length === 0

  async function handleCreate(status: 'approved' | 'declined' | 'counter' | 'review') {
    setCreating(true)
    try {
      console.log('[ReviewScreen] 🚀 Creating deal with status:', status)

      if (!app) {
        throw new Error('Application data is missing')
      }

      // STEP 1: Upload files to storage
      console.log('[ReviewScreen] Step 1/4: Uploading files...')
      const uploadFormData = new FormData()
      files.forEach(f => uploadFormData.append('files', f.file))

      const uploadResponse = await fetch('/api/upload-deal-files', {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json()
        throw new Error(errorData.error || 'File upload failed')
      }

      const { dealId, uploadedPaths } = await uploadResponse.json()
      console.log('[ReviewScreen] ✅ Files uploaded, dealId:', dealId)

      // STEP 2: Save all parsed data to temp table (single record, tiny payload!)
      console.log('[ReviewScreen] Step 2/3: Saving parsed data to Supabase...')
      const { jobId } = await saveParsedData(app, statements)
      console.log('[ReviewScreen] ✅ Parsed data saved, jobId:', jobId)

      // STEP 3: Create deal with just the job ID (TINY PAYLOAD!)
      console.log('[ReviewScreen] Step 3/3: Creating deal from parsed data...')
      const fileInfos = files.map(f => ({ name: f.label, size: f.file.size }))

      // THIS IS THE KEY FIX: Only send jobId string, not the actual parsed data!
      // Set status based on document completeness
      const finalStatus = (missingApp || missingStatements) ? 'review' : (status as 'approved' | 'declined' | 'counter' | 'review')
      const needsDocuments = missingApp || missingStatements

      await createDealComprehensive(
        jobId,  // ← ONLY THIS - just a string!
        dealId,
        uploadedPaths,
        finalStatus,
        {
          advanceAmount: dealTerms.advanceAmount,
          factorRate: dealTerms.factorRate,
          termDays: dealTerms.termDays,
        },
        fileInfos,
        needsDocuments
      )
      console.log('[ReviewScreen] ✅ Deal creation complete!')
    } catch (err) {
      alert('Error creating deal: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setCreating(false)
    }
  }

  const riskColorClass = risk.score < 35 ? 'text-green-400' : risk.score < 70 ? 'text-yellow-400' : 'text-red-400'
  const riskBgClass = risk.score < 35 ? 'bg-green-900/20' : risk.score < 70 ? 'bg-yellow-900/20' : 'bg-red-900/20'

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* STICKY HEADER */}
        <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800 -mx-6 px-6 py-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-100">{app?.business_legal_name || 'New Deal'}</h1>
              <p className="text-sm text-slate-400 mt-1">{app?.owner_1_name || 'Pending application'} • {app?.ein || '—'}</p>
            </div>
            <div className={`text-right ${riskColorClass}`}>
              <p className="text-5xl font-bold">{risk.level.toUpperCase()[0]}</p>
              <p className="text-xs text-slate-400">Score: {risk.score}/100</p>
            </div>
          </div>
          {app && (
            <div className="flex gap-4 flex-wrap">
              <StatBadge label="Time in Business" value={`${app.time_in_business_years} yrs`} />
              <StatBadge label="Stated Revenue" value={fmt(app.monthly_revenue)} />
              <StatBadge label="Avg True Revenue" value={fmt(portfolio.avgMonthlyRevenue)} />
              <StatBadge label="Holdback %" value={`${portfolio.avgHoldback.toFixed(1)}%`} />
              <StatBadge label="NSFs" value={portfolio.totalNsf.toString()} />
            </div>
          )}
        </div>

        {/* DEAL HEADER SECTION - Only show if application exists */}
        {app && (
          <Section title="Deal Information" section="header" expanded={expanded} toggle={toggle}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <InfoField label="Business Name" value={app.business_legal_name} />
              <InfoField label="DBA" value={app.dba || '—'} />
              <InfoField label="Entity Type" value={app.entity_type || '—'} />
              <InfoField label="Owner Name" value={app.owner_1_name} />
              <InfoField label="Ownership %" value={`${app.owner_1_ownership_pct || 0}%`} />
              <InfoField label="Time in Business" value={`${app.time_in_business_years} years`} />
              <InfoField label="Industry" value={app.industry || '—'} />
              <InfoField label="EIN" value={app.ein} />
              <InfoField label="Address" value={app.business_address || '—'} />
              <InfoField label="Phone" value={app.business_phone || '—'} />
              <InfoField label="Email" value={app.business_email || '—'} />
              <InfoField label="Bank" value={app.bank_name || '—'} />
            </div>
          </Section>
        )}

        {/* EXECUTIVE SUMMARY - Only show if both app and statements exist */}
        {app && statements.length > 0 && (
          <Section title="Executive Summary" section="summary" expanded={expanded} toggle={toggle}>
          <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700">
            <p className="text-slate-200 leading-relaxed">
              {app.business_legal_name} is a {app.entity_type?.toLowerCase() || 'business'} in the {app.industry || 'retail'} industry,
              owned by {app.owner_1_name} with {app.time_in_business_years} years in business. The merchant reports {fmt(app.monthly_revenue)}
              in monthly revenue, though bank analysis shows {fmt(portfolio.avgMonthlyRevenue)} average true revenue across {metrics.length} months analyzed
              from {metrics[0]?.month} to {metrics[metrics.length - 1]?.month}.
            </p>
            <p className="text-slate-200 leading-relaxed mt-4">
              {mcaPositions.length > 0 ? (
                <>The merchant has {mcaPositions.length} active MCA position{mcaPositions.length > 1 ? 's' : ''} with combined
                monthly obligations of {fmt(mcaPositions.reduce((sum, p) => sum + (p.dailyDebit * 30), 0))}
                ({portfolio.avgHoldback.toFixed(1)}% of true revenue holdback). </>
              ) : (
                <>There are no identified MCA positions on these statements. </>
              )}
              {portfolio.totalNsf > 0 ? (
                <>The account shows {portfolio.totalNsf} NSF events indicating occasional liquidity stress. </>
              ) : (
                <>The account maintains clean payment history with no NSF events. </>
              )}
            </p>
            <p className="text-slate-200 leading-relaxed mt-4">
              {risk.level === 'high' ? (
                <span className="text-red-300">Risk Assessment: HIGH - Multiple concerning factors identified. Recommend DECLINE or significant restructuring.</span>
              ) : risk.level === 'medium' ? (
                <span className="text-yellow-300">Risk Assessment: MODERATE - Review carefully. Counter-offer with favorable terms recommended.</span>
              ) : (
                <span className="text-green-300">Risk Assessment: LOW - Strong approval candidate. Recommended max advance {fmt(risk.recommendedAdvance)}.</span>
              )}
            </p>
          </div>
          </Section>
        )}

        {/* MERCHANT INFORMATION - Only show if application exists */}
        {app && (
          <Section title="Merchant Information" section="merchant" expanded={expanded} toggle={toggle}>
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailField label="Legal Name" value={app.business_legal_name} />
              <DetailField label="DBA" value={app.dba || '—'} />
              <DetailField label="Entity Type" value={app.entity_type || '—'} />
              <DetailField label="Owner Name" value={app.owner_1_name} />
              <DetailField label="Ownership %" value={`${app.owner_1_ownership_pct || 0}%`} />
              <DetailField label="Owner DOB" value={app.owner_1_dob || '—'} />
              <DetailField label="SSN Last 4" value={app.owner_1_ssn_last4 ? `***-**-${app.owner_1_ssn_last4}` : '—'} />
              <DetailField label="EIN" value={app.ein || '—'} />
              <DetailField label="Time in Business" value={`${app.time_in_business_years} years`} />
              <DetailField label="Industry" value={app.industry || '—'} />
              <DetailField label="Business Address" value={app.business_address || '—'} />
              <DetailField label="Phone" value={app.business_phone || '—'} />
              <DetailField label="Email" value={app.business_email || '—'} />
              <DetailField label="Bank Name" value={app.bank_name || '—'} />
              <DetailField label="Landlord Name" value={app.landlord_name || '—'} />
              <DetailField label="Monthly Rent" value={fmt(app.monthly_rent)} />
              <DetailField label="Use of Funds" value={app.use_of_funds || '—'} />
            </div>

            {/* Revenue Comparison */}
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h4 className="text-slate-200 font-semibold mb-4">Stated vs Analyzed Revenue</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-xs text-slate-400 mb-1">Stated Monthly</p>
                  <p className="text-lg font-bold text-slate-100">{fmt(app.monthly_revenue)}</p>
                </div>
                <div className="bg-slate-900 rounded p-3">
                  <p className="text-xs text-slate-400 mb-1">Analyzed Avg</p>
                  <p className="text-lg font-bold text-slate-100">{fmt(portfolio.avgMonthlyRevenue)}</p>
                </div>
                <div className={`bg-slate-900 rounded p-3 border ${getRevenueVariance(app.monthly_revenue, portfolio.avgMonthlyRevenue) > 20 ? 'border-red-700' : 'border-slate-700'}`}>
                  <p className="text-xs text-slate-400 mb-1">Variance</p>
                  <p className={`text-lg font-bold ${getRevenueVariance(app.monthly_revenue, portfolio.avgMonthlyRevenue) > 20 ? 'text-red-400' : 'text-slate-100'}`}>
                    {getRevenueVariance(app.monthly_revenue, portfolio.avgMonthlyRevenue) > 0 ? '+' : ''}
                    {getRevenueVariance(app.monthly_revenue, portfolio.avgMonthlyRevenue).toFixed(1)}%
                  </p>
                </div>
              </div>
              {getRevenueVariance(app.monthly_revenue, portfolio.avgMonthlyRevenue) > 20 && (
                <p className="text-xs text-red-300 mt-3">⚠️ Stated revenue is significantly higher than analyzed revenue. Underwriter should investigate.</p>
              )}
            </div>
          </div>
          </Section>
        )}

        {/* COMBINED BANK ANALYSIS */}
        <Section title="Combined Bank Analysis Summary" section="analysis" expanded={expanded} toggle={toggle}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MetricCard label="Total Months" value={metrics.length.toString()} />
            <MetricCard label="Date Range" value={`${metrics[0]?.month} to ${metrics[metrics.length - 1]?.month}`} />
            <MetricCard label="Avg Monthly Revenue" value={fmt(portfolio.avgMonthlyRevenue)} highlight="green" />
            <MetricCard label="Highest Monthly" value={`${fmt(extremes.highestRevenue)} (${extremes.highestMonth})`} />
            <MetricCard label="Lowest Monthly" value={`${fmt(extremes.lowestRevenue)} (${extremes.lowestMonth})`} />
            <MetricCard label="Revenue Trend" value={portfolio.revenueTrend} highlight={portfolio.revenueTrendPercent > 0 ? 'green' : 'red'} />
            <MetricCard label="Avg Daily Balance" value={fmt(portfolio.avgAdb)} />
            <MetricCard label="Total NSF Events" value={portfolio.totalNsf.toString()} highlight={portfolio.totalNsf > 3 ? 'red' : 'green'} />
            <MetricCard label="Avg Holdback %" value={`${portfolio.avgHoldback.toFixed(1)}%`} highlight={portfolio.avgHoldback > 15 ? 'red' : 'green'} />
          </div>
        </Section>

        {/* MONTH BY MONTH TABLE */}
        <Section title={`Month by Month Breakdown (${metrics.length} months)`} section="months" expanded={expanded} toggle={toggle}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-3 text-slate-300 font-semibold">Month</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Start Bal</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">End Bal</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">True Revenue</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Non-Rev</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Total Deps</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Avg Daily</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Low Bal</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">NSFs</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">MCA Hold</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Hold %</th>
                  <th className="text-right py-3 px-3 text-slate-300 font-semibold">Net CF</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m, i) => (
                  <tr key={i} className="border-b border-slate-800 hover:bg-slate-900/50">
                    <td className="py-2 px-3 text-slate-300">{m.month}</td>
                    <td className="text-right py-2 px-3">{fmt(m.startBalance)}</td>
                    <td className="text-right py-2 px-3">{fmt(m.endBalance)}</td>
                    <td className="text-right py-2 px-3 text-green-400 font-medium">{fmt(m.trueRevenue)}</td>
                    <td className="text-right py-2 px-3 text-blue-400">{fmt(m.nonRevenueDeposits)}</td>
                    <td className="text-right py-2 px-3">{fmt(m.totalDeposits)}</td>
                    <td className={`text-right py-2 px-3 ${!m.avgDailyBalance || m.avgDailyBalance < 1000 ? 'text-red-400' : m.avgDailyBalance < 2500 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {fmt(m.avgDailyBalance)}
                    </td>
                    <td className={`text-right py-2 px-3 ${!m.lowestBalance || m.lowestBalance < 500 ? 'text-red-400' : 'text-slate-300'}`}>
                      {fmt(m.lowestBalance)}
                    </td>
                    <td className={`text-right py-2 px-3 ${m.nsfCount > 0 ? 'text-red-400 font-medium' : 'text-slate-300'}`}>{m.nsfCount}</td>
                    <td className="text-right py-2 px-3 text-yellow-400">{fmt(m.mcaHoldback)}</td>
                    <td className={`text-right py-2 px-3 ${m.holdbackPercent > 15 ? 'text-red-400' : m.holdbackPercent > 10 ? 'text-yellow-400' : 'text-slate-300'}`}>
                      {m.holdbackPercent.toFixed(1)}%
                    </td>
                    <td className={`text-right py-2 px-3 ${m.netCashFlow < 0 ? 'text-red-400' : 'text-green-400'}`}>{fmt(m.netCashFlow)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-600 bg-slate-900/50 font-semibold">
                  <td className="py-3 px-3 text-slate-200">Total / Avg</td>
                  <td className="text-right py-3 px-3 text-slate-300">—</td>
                  <td className="text-right py-3 px-3 text-slate-300">—</td>
                  <td className="text-right py-3 px-3 text-green-400">{fmt(metrics.reduce((sum, m) => sum + m.trueRevenue, 0))}</td>
                  <td className="text-right py-3 px-3 text-blue-400">{fmt(metrics.reduce((sum, m) => sum + m.nonRevenueDeposits, 0))}</td>
                  <td className="text-right py-3 px-3">{fmt(metrics.reduce((sum, m) => sum + m.totalDeposits, 0))}</td>
                  <td className="text-right py-3 px-3">{fmt(metrics.reduce((sum, m) => sum + (m.avgDailyBalance || 0), 0) / metrics.length)}</td>
                  <td className="text-right py-3 px-3">—</td>
                  <td className="text-right py-3 px-3 text-red-400">{metrics.reduce((sum, m) => sum + m.nsfCount, 0)}</td>
                  <td className="text-right py-3 px-3 text-yellow-400">{fmt(metrics.reduce((sum, m) => sum + m.mcaHoldback, 0))}</td>
                  <td className="text-right py-3 px-3">{portfolio.avgHoldback.toFixed(1)}%</td>
                  <td className="text-right py-3 px-3">{fmt(metrics.reduce((sum, m) => sum + m.netCashFlow, 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* MCA/HOLDBACK ANALYSIS */}
        {mcaPositions.length > 0 && (
          <Section title="MCA / Holdback Analysis" section="mca" expanded={expanded} toggle={toggle}>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-3 text-slate-300 font-semibold">Funder Name</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Daily</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Weekly</th>
                    <th className="text-right py-3 px-3 text-slate-300 font-semibold">Monthly</th>
                    <th className="text-left py-3 px-3 text-slate-300 font-semibold">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {mcaPositions.map((pos, i) => (
                    <tr key={i} className="border-b border-slate-800 hover:bg-slate-900/50">
                      <td className="py-2 px-3 text-slate-200 font-medium">{pos.funderName}</td>
                      <td className="text-right py-2 px-3 text-yellow-400">{fmt(pos.dailyDebit)}</td>
                      <td className="text-right py-2 px-3">{fmt(pos.dailyDebit * 7)}</td>
                      <td className="text-right py-2 px-3 text-yellow-400 font-medium">{fmt(pos.dailyDebit * 30)}</td>
                      <td className="py-2 px-3 text-slate-400">{pos.firstSeen} → {pos.lastSeen}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-600 bg-slate-900/50 font-semibold">
                    <td className="py-3 px-3 text-slate-200">Combined Obligation</td>
                    <td className="text-right py-3 px-3 text-yellow-400">{fmt(mcaPositions.reduce((sum, p) => sum + p.dailyDebit, 0))}</td>
                    <td className="text-right py-3 px-3">{fmt(mcaPositions.reduce((sum, p) => sum + (p.dailyDebit * 7), 0))}</td>
                    <td className="text-right py-3 px-3 text-yellow-400">{fmt(mcaPositions.reduce((sum, p) => sum + (p.dailyDebit * 30), 0))}</td>
                    <td className="py-3 px-3">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <p className="text-xs text-slate-400 mb-2">Holdback Impact</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-slate-500">Avg Holdback %</p>
                  <p className={`text-lg font-bold ${portfolio.avgHoldback > 15 ? 'text-red-400' : portfolio.avgHoldback > 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {portfolio.avgHoldback.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Monthly Impact</p>
                  <p className="text-lg font-bold text-slate-100">{fmt(portfolio.avgMonthlyRevenue * (portfolio.avgHoldback / 100))}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Num. Positions</p>
                  <p className="text-lg font-bold text-slate-100">{mcaPositions.length}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className={`text-lg font-bold ${portfolio.avgHoldback > 20 ? 'text-red-400' : portfolio.avgHoldback > 15 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {portfolio.avgHoldback > 20 ? 'CRITICAL' : portfolio.avgHoldback > 15 ? 'WARNING' : 'OK'}
                  </p>
                </div>
              </div>
            </div>
          </Section>
        )}

        {/* UNDERWRITING SCORECARD */}
        <Section title="Underwriting Scorecard" section="scorecard" expanded={expanded} toggle={toggle}>
          <div className={`rounded-lg p-6 border-2 mb-6 ${riskBgClass} border-slate-700`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-slate-300 font-semibold mb-2">Overall Risk Assessment</h3>
                <p className={`text-5xl font-bold ${riskColorClass}`}>{risk.level.toUpperCase()[0]}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 mb-1">Risk Score</p>
                <p className="text-4xl font-bold text-slate-100">{risk.score}</p>
                <p className="text-xs text-slate-400">/100</p>
              </div>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden">
              <div
                className={`h-full ${risk.score < 35 ? 'bg-green-500' : risk.score < 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${risk.score}%` }}
              />
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <ScoreRow label="Avg Daily Balance" value={portfolio.avgAdb} benchmark="$2,500+" good={portfolio.avgAdb > 2500} />
            <ScoreRow label="NSF History" value={portfolio.totalNsf} benchmark="0 events" good={portfolio.totalNsf === 0} />
            <ScoreRow label="Holdback %" value={portfolio.avgHoldback} benchmark="<10%" good={portfolio.avgHoldback < 10} />
            <ScoreRow label="MCA Positions" value={mcaPositions.length} benchmark="0-1" good={mcaPositions.length <= 1} />
            {app && <ScoreRow label="Time in Business" value={app.time_in_business_years || 0} benchmark="5+ years" good={(app.time_in_business_years || 0) >= 5} />}
          </div>

          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
            <h4 className="text-slate-200 font-semibold mb-3">Recommendations</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <InfoField label="Max Advance" value={fmt(risk.recommendedAdvance)} />
              <InfoField label="Factor Rate" value="1.20 - 1.45" />
              <InfoField label="Term (Days)" value="120 - 180" />
              <InfoField label="Daily Debit" value={fmt((risk.recommendedAdvance / 150) / 30)} />
            </div>
          </div>
        </Section>

        {/* RISK FLAGS */}
        {risk.flags.length > 0 && (
          <Section title={`Risk Flags (${risk.flags.length})`} section="flags" expanded={expanded} toggle={toggle}>
            <div className="space-y-3">
              {risk.flags.map((flag, i) => (
                <div key={i} className={`flex gap-3 p-4 rounded-lg border ${
                  flag.severity === 'high' ? 'bg-red-900/20 border-red-700' :
                  flag.severity === 'medium' ? 'bg-yellow-900/20 border-yellow-700' :
                  'bg-blue-900/20 border-blue-700'
                }`}>
                  <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    flag.severity === 'high' ? 'text-red-400' :
                    flag.severity === 'medium' ? 'text-yellow-400' :
                    'text-blue-400'
                  }`} />
                  <div className="flex-1">
                    <p className={`font-semibold ${
                      flag.severity === 'high' ? 'text-red-300' :
                      flag.severity === 'medium' ? 'text-yellow-300' :
                      'text-blue-300'
                    }`}>
                      {flag.severity.toUpperCase()}
                    </p>
                    <p className="text-slate-300">{flag.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* DOCUMENTS */}
        <Section title={`Documents (${files.length})`} section="documents" expanded={expanded} toggle={toggle}>
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-700">
                <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-100 font-medium truncate">{f.label}</p>
                  <p className="text-xs text-slate-500">{f.file.name} • {(f.file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap ${
                  f.type === 'application' ? 'bg-blue-900/50 text-blue-300' : 'bg-green-900/50 text-green-300'
                }`}>
                  {f.type === 'application' ? 'Application' : 'Statement'}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* DEAL TERMS CALCULATOR */}
        <Section title="Deal Terms Calculator" section="calculator" expanded={expanded} toggle={toggle}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                <label className="text-xs text-slate-400 mb-2 block">Advance Amount</label>
                <input
                  type="number"
                  disabled={readOnly}
                  value={dealTerms.advanceAmount}
                  onChange={(e) => setDealTerms({ ...dealTerms, advanceAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-slate-800 text-slate-100 rounded px-3 py-2 text-sm border border-slate-700 focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="0"
                />
                <p className="text-xs text-slate-500 mt-2">Recommended: {fmt(risk.recommendedAdvance)}</p>
              </div>

              <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                <label className="text-xs text-slate-400 mb-2 block">Factor Rate</label>
                <input
                  type="number"
                  step="0.01"
                  disabled={readOnly}
                  value={dealTerms.factorRate}
                  onChange={(e) => setDealTerms({ ...dealTerms, factorRate: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-slate-800 text-slate-100 rounded px-3 py-2 text-sm border border-slate-700 focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="1.30"
                />
                <p className="text-xs text-slate-500 mt-2">Range: 1.20 - 1.45</p>
              </div>

              <div className="bg-slate-900 rounded-lg p-4 border border-slate-800">
                <label className="text-xs text-slate-400 mb-2 block">Term (Days)</label>
                <input
                  type="number"
                  disabled={readOnly}
                  value={dealTerms.termDays}
                  onChange={(e) => setDealTerms({ ...dealTerms, termDays: parseInt(e.target.value) || 150 })}
                  className="w-full bg-slate-800 text-slate-100 rounded px-3 py-2 text-sm border border-slate-700 focus:border-blue-500 outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="150"
                />
                <p className="text-xs text-slate-500 mt-2">Range: 120 - 180</p>
              </div>
            </div>

            {dealTerms.advanceAmount > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <ResultBox label="Payback Amount" value={fmt(paybackAmount)} />
                <ResultBox label="Daily Debit" value={fmt(dailyDebit)} />
                <ResultBox label="Weekly Debit" value={fmt(weeklyDebit)} />
                <ResultBox label="Monthly Debit" value={fmt(dailyDebit * 30)} />
                <ResultBox label="Gross Profit" value={fmt(grossProfit)} highlight="green" />
                <ResultBox label="% of Avg Revenue" value={`${revenuePercent.toFixed(1)}%`} highlight={revenuePercent > 30 ? 'red' : 'green'} />
                <ResultBox label="Payoff Timeline" value={`${dealTerms.termDays} days`} />
                <ResultBox label="Profit Margin" value={`${((grossProfit / paybackAmount) * 100).toFixed(1)}%`} />
              </div>
            )}
          </div>
        </Section>

        {/* ACTION BUTTONS */}
        {!readOnly && (
          <div className="flex flex-col md:flex-row gap-3 mt-8 pt-6 border-t border-slate-800">
            <button
              onClick={() => handleCreate('approved')}
              disabled={creating}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 text-white font-bold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
            >
              {creating && <Loader2 className="w-5 h-5 animate-spin" />}
              Approve Deal
            </button>
            <button
              onClick={() => handleCreate('counter')}
              disabled={creating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white font-bold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
            >
              {creating && <Loader2 className="w-5 h-5 animate-spin" />}
              Counter Offer
            </button>
            <button
              onClick={() => handleCreate('review')}
              disabled={creating}
              className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-700 text-white font-bold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
            >
              {creating && <Loader2 className="w-5 h-5 animate-spin" />}
              Save for Review
            </button>
            <button
              onClick={() => handleCreate('declined')}
              disabled={creating}
              className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white font-bold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
            >
              {creating && <Loader2 className="w-5 h-5 animate-spin" />}
              Decline Deal
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// HELPER COMPONENTS

function Section({
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

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-900 rounded px-3 py-2 border border-slate-800">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-bold text-slate-100">{value}</p>
    </div>
  )
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-slate-100">{value || '—'}</p>
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="bg-slate-800/50 rounded p-3 border border-slate-700/50">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-slate-100">{value || '—'}</p>
    </div>
  )
}

function MetricCard({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'red' }) {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <p className="text-xs text-slate-400 mb-2">{label}</p>
      <p className={`text-xl font-bold ${
        highlight === 'green' ? 'text-green-400' :
        highlight === 'red' ? 'text-red-400' :
        'text-slate-100'
      }`}>{value}</p>
    </div>
  )
}

function ScoreRow({ label, value, benchmark, good }: { label: string; value: number; benchmark: string; good: boolean }) {
  return (
    <div className={`bg-slate-800/50 rounded p-3 border ${good ? 'border-green-700/50' : 'border-red-700/50'}`}>
      <div className="flex justify-between items-center">
        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className={`text-sm font-semibold ${good ? 'text-green-400' : 'text-red-400'}`}>{value} {benchmark}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${good ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>
    </div>
  )
}

function ResultBox({ label, value, highlight }: { label: string; value: string; highlight?: 'green' | 'red' }) {
  return (
    <div className="bg-slate-800 rounded p-3 border border-slate-700">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${
        highlight === 'green' ? 'text-green-400' :
        highlight === 'red' ? 'text-red-400' :
        'text-slate-100'
      }`}>{value}</p>
    </div>
  )
}
