'use client'

import { FileControlSheet } from '@/lib/file-control-sheet'
import { AlertCircle, TrendingUp, TrendingDown, BarChart3, Minus } from 'lucide-react'

interface FileControlSheetDisplayProps {
  sheet: FileControlSheet
}

export default function FileControlSheetDisplay({ sheet }: FileControlSheetDisplayProps) {
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'APPROVE':
        return 'bg-green-900/30 border-green-700 text-green-300'
      case 'DECLINE':
        return 'bg-red-900/30 border-red-700 text-red-300'
      case 'COUNTER':
        return 'bg-yellow-900/30 border-yellow-700 text-yellow-300'
      default:
        return 'bg-blue-900/30 border-blue-700 text-blue-300'
    }
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A':
        return 'text-green-400 bg-green-500/10'
      case 'B':
        return 'text-blue-400 bg-blue-500/10'
      case 'C':
        return 'text-yellow-400 bg-yellow-500/10'
      case 'D':
        return 'text-orange-400 bg-orange-500/10'
      case 'E':
      case 'F':
        return 'text-red-400 bg-red-500/10'
      default:
        return 'text-slate-400 bg-slate-500/10'
    }
  }

  const getRiskSeverityColor = (severity: string) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-500/10 border-l-2 border-red-500 text-red-300'
      case 'MEDIUM':
        return 'bg-yellow-500/10 border-l-2 border-yellow-500 text-yellow-300'
      case 'LOW':
        return 'bg-blue-500/10 border-l-2 border-blue-500 text-blue-300'
      default:
        return 'bg-slate-500/10 border-l-2 border-slate-500 text-slate-300'
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'IMPROVING':
        return <TrendingUp className="w-4 h-4 text-green-400" />
      case 'DECLINING':
        return <TrendingDown className="w-4 h-4 text-red-400" />
      case 'VOLATILE':
        return <BarChart3 className="w-4 h-4 text-yellow-400" />
      default:
        return <Minus className="w-4 h-4 text-blue-400" />
    }
  }

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A'
    return `${value.toFixed(1)}%`
  }

  return (
    <div className="bg-slate-950 py-8">
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        {/* HEADER SECTION */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">
                {sheet.merchant_summary.legal_name || sheet.merchant_summary.dba || 'Merchant'}
              </h1>
              <p className="text-sm text-slate-400">
                Deal: {sheet.deal_number || 'N/A'} · Generated: {new Date(sheet.date_generated).toLocaleDateString()}
              </p>
            </div>
            <div className={`px-4 py-3 rounded-lg border ${getRecommendationColor(sheet.overall_recommendation)}`}>
              <div className="text-sm font-semibold">{sheet.overall_recommendation}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">OVERALL SCORE</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-bold ${getGradeColor(sheet.scorecard.grade)}`}>
                  {sheet.scorecard.grade}
                </span>
                <span className="text-sm text-slate-400">({sheet.scorecard.overall_score}/100)</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">TIME IN BUSINESS</p>
              <p className="text-2xl font-semibold text-slate-100">
                {sheet.merchant_summary.time_in_business_years
                  ? `${sheet.merchant_summary.time_in_business_years} years`
                  : 'Unknown'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">CONFIDENCE</p>
              <p className="text-2xl font-semibold text-slate-100">{sheet.overall_confidence_score}%</p>
            </div>
          </div>
        </div>

        {/* MERCHANT SUMMARY SECTION */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Merchant Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-slate-400 mb-1">Legal Name</p>
              <p className="text-sm text-slate-100">{sheet.merchant_summary.legal_name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">DBA</p>
              <p className="text-sm text-slate-100">{sheet.merchant_summary.dba || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Entity Type</p>
              <p className="text-sm text-slate-100">{sheet.merchant_summary.entity_type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">EIN</p>
              <p className="text-sm text-slate-100">{sheet.merchant_summary.ein || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Industry</p>
              <p className="text-sm text-slate-100">{sheet.merchant_summary.industry || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Primary Owner</p>
              <p className="text-sm text-slate-100">
                {sheet.merchant_summary.owner_1_name || 'N/A'}{' '}
                {sheet.merchant_summary.owner_1_ownership_pct
                  ? `(${sheet.merchant_summary.owner_1_ownership_pct}%)`
                  : ''}
              </p>
            </div>
          </div>
        </div>

        {/* BANK ANALYSIS TABLE */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Monthly Bank Analysis</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800/50 border-b border-slate-700">
                <tr>
                  <th className="text-left px-3 py-2 text-slate-300 font-semibold">Month</th>
                  <th className="text-right px-3 py-2 text-slate-300 font-semibold">True Revenue</th>
                  <th className="text-right px-3 py-2 text-slate-300 font-semibold">Deposits</th>
                  <th className="text-right px-3 py-2 text-slate-300 font-semibold">Avg Daily Balance</th>
                  <th className="text-right px-3 py-2 text-slate-300 font-semibold">NSF</th>
                  <th className="text-right px-3 py-2 text-slate-300 font-semibold">MCA Holdback</th>
                  <th className="text-right px-3 py-2 text-slate-300 font-semibold">Net Cash Flow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {sheet.bank_analysis_months.map((month, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition">
                    <td className="px-3 py-2 text-slate-300">{month.month_label}</td>
                    <td className="text-right px-3 py-2 text-slate-100 font-medium">
                      {formatCurrency(month.true_revenue)}
                    </td>
                    <td className="text-right px-3 py-2 text-slate-100">
                      {formatCurrency(month.total_deposits)}
                    </td>
                    <td className="text-right px-3 py-2 text-slate-100">
                      {formatCurrency(month.avg_daily_balance)}
                    </td>
                    <td className="text-right px-3 py-2 text-slate-100">{month.nsf_count}</td>
                    <td className="text-right px-3 py-2 text-slate-100">
                      {formatCurrency(month.mca_holdback)}
                      {month.holdback_pct !== null && (
                        <span className="text-xs text-slate-400 ml-1">({formatPercent(month.holdback_pct)})</span>
                      )}
                    </td>
                    <td className="text-right px-3 py-2 text-slate-100 font-medium">
                      {formatCurrency(month.net_cash_flow)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TREND ANALYSIS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trend Overview */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Trend Analysis</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                <span className="text-slate-300">Revenue Trend</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(sheet.trend_analysis.revenue_trend)}
                  <span className="text-sm font-semibold text-slate-100">
                    {sheet.trend_analysis.revenue_trend}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                <span className="text-slate-300">ADB Trend</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(sheet.trend_analysis.adb_trend)}
                  <span className="text-sm font-semibold text-slate-100">{sheet.trend_analysis.adb_trend}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                <span className="text-slate-300">NSF Trend</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(sheet.trend_analysis.nsf_trend)}
                  <span className="text-sm font-semibold text-slate-100">{sheet.trend_analysis.nsf_trend}</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                <span className="text-slate-300">MCA Load Trend</span>
                <div className="flex items-center gap-2">
                  {getTrendIcon(sheet.trend_analysis.mca_load_trend)}
                  <span className="text-sm font-semibold text-slate-100">
                    {sheet.trend_analysis.mca_load_trend}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scorecard Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Scorecard Breakdown</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                <span className="text-slate-300">Revenue Quality</span>
                <span className="font-semibold text-slate-100">{sheet.scorecard.revenue_quality_score}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                <span className="text-slate-300">Cash Flow</span>
                <span className="font-semibold text-slate-100">{sheet.scorecard.cash_flow_score}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                <span className="text-slate-300">Time in Business</span>
                <span className="font-semibold text-slate-100">{sheet.scorecard.time_in_business_score}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded">
                <span className="text-slate-300">Debt Service</span>
                <span className="font-semibold text-slate-100">{sheet.scorecard.debt_service_score}</span>
              </div>
            </div>
          </div>
        </div>

        {/* MCA POSITIONS */}
        {sheet.mca_positions.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">MCA Positions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sheet.mca_positions.map((position, idx) => (
                <div key={idx} className="border border-slate-700 rounded p-4 bg-slate-800/30">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-slate-100">{position.funder}</p>
                      <p className="text-xs text-slate-400 mt-1">{position.months_active} months active</p>
                    </div>
                    <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">{position.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
                    <div>
                      <p className="text-xs text-slate-400">Per Debit</p>
                      <p className="text-sm font-medium text-slate-100">{formatCurrency(position.per_debit)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Monthly Total</p>
                      <p className="text-sm font-medium text-slate-100">{formatCurrency(position.monthly_total)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* MCA Summary */}
            <div className="mt-6 p-4 bg-slate-800/50 rounded border border-slate-700">
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Combined Daily Obligation</p>
                  <p className="text-lg font-semibold text-slate-100">
                    {formatCurrency(sheet.mca_summary.combined_daily_obligation)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Combined Monthly Obligation</p>
                  <p className="text-lg font-semibold text-slate-100">
                    {formatCurrency(sheet.mca_summary.combined_monthly_obligation)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Combined Holdback %</p>
                  <p className="text-lg font-semibold text-slate-100">
                    {formatPercent(sheet.mca_summary.combined_holdback_pct)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RISK FLAGS */}
        {sheet.risk_flags.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Risk Flags</h2>
            <div className="space-y-3">
              {sheet.risk_flags
                .sort((a, b) => {
                  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
                  return severityOrder[a.severity as keyof typeof severityOrder] -
                    severityOrder[b.severity as keyof typeof severityOrder]
                })
                .map((flag, idx) => (
                  <div key={idx} className={`p-4 rounded ${getRiskSeverityColor(flag.severity)}`}>
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{flag.flag}</p>
                        {flag.description && (
                          <p className="text-xs mt-1 opacity-90">{flag.description}</p>
                        )}
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 bg-black/20 rounded ml-2">
                        {flag.severity}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* UNDERWRITING RECOMMENDATION */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Underwriting Recommendation</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-slate-800/50 rounded">
              <p className="text-xs text-slate-400 mb-1">Max Advance</p>
              <p className="text-lg font-semibold text-slate-100">
                {formatCurrency(sheet.underwriting_recommendation.advance_amount)}
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded">
              <p className="text-xs text-slate-400 mb-1">Factor Rate Range</p>
              <p className="text-lg font-semibold text-slate-100">
                {sheet.underwriting_recommendation.factor_rate_range_low &&
                  sheet.underwriting_recommendation.factor_rate_range_high
                  ? `${sheet.underwriting_recommendation.factor_rate_range_low.toFixed(2)}-${sheet.underwriting_recommendation.factor_rate_range_high.toFixed(2)}`
                  : 'N/A'}
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded">
              <p className="text-xs text-slate-400 mb-1">Recommended Term</p>
              <p className="text-lg font-semibold text-slate-100">
                {sheet.underwriting_recommendation.recommended_term_days
                  ? `${sheet.underwriting_recommendation.recommended_term_days} days`
                  : 'N/A'}
              </p>
            </div>
            <div className="p-4 bg-slate-800/50 rounded">
              <p className="text-xs text-slate-400 mb-1">Daily Debit</p>
              <p className="text-lg font-semibold text-slate-100">
                {formatCurrency(sheet.underwriting_recommendation.recommended_daily_debit)}
              </p>
            </div>
          </div>

          {sheet.underwriting_recommendation.rationale && (
            <div className="p-4 bg-blue-900/20 border border-blue-700 rounded">
              <p className="text-sm text-slate-100">{sheet.underwriting_recommendation.rationale}</p>
            </div>
          )}
        </div>

        {/* CONFIDENCE SCORES */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Document Confidence</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-2">Application</p>
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all"
                  style={{ width: `${sheet.application_confidence_score}%` }}
                />
              </div>
              <p className="text-sm font-semibold text-slate-100 mt-1">{sheet.application_confidence_score}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2">Bank Statements</p>
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                  style={{ width: `${sheet.bank_statement_confidence_score}%` }}
                />
              </div>
              <p className="text-sm font-semibold text-slate-100 mt-1">{sheet.bank_statement_confidence_score}%</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2">Overall</p>
              <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full transition-all"
                  style={{ width: `${sheet.overall_confidence_score}%` }}
                />
              </div>
              <p className="text-sm font-semibold text-slate-100 mt-1">{sheet.overall_confidence_score}%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
