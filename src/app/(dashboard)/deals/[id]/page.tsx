'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Calendar, AlertCircle } from 'lucide-react'
import ReviewScreenNew from '@/app/(dashboard)/upload-deal/ReviewScreenNew'
import FileControlSheetDisplay from '@/app/(dashboard)/upload-deal/FileControlSheetDisplay'
import { FileControlSheet } from '@/lib/file-control-sheet'
import type { UploadedFile, ParsedApplication, ParsedBankStatement } from '@/types'

interface DealData {
  id: string
  title: string
  deal_number: string
  merchant_id: string
  risk_score: number
  risk_grade: string
  status: string
  created_at: string
}

interface MerchantData {
  id: string
  business_legal_name: string | null
  dba: string | null
  entity_type: string | null
  owner_name: string | null
  owner_dob: string | null
  owner_ssn_last4: string | null
  business_address: string | null
  business_phone: string | null
  business_email: string | null
  ein: string | null
  time_in_business_years: number | null
  industry: string | null
  monthly_revenue: number | null
  bank_name: string | null
  landlord_name: string | null
  monthly_rent: number | null
  use_of_funds: string | null
  ownership_percentage: number | null
}

interface BankStatementData {
  id: string
  deal_id: string
  statement_month: number
  statement_year: number
  statement_period_start: string | null
  statement_period_end: string | null
  starting_balance: number | null
  ending_balance: number | null
  total_deposits: number | null
  true_revenue: number | null
  non_revenue_deposits: number | null
  average_daily_balance: number | null
  lowest_daily_balance: number | null
  nsf_count: number
  total_mca_holdback: number | null
  holdback_percentage: number | null
  net_cash_flow: number | null
}

interface MCAPositionData {
  id: string
  deal_id: string
  funder_name: string
  daily_debit_amount: number | null
  weekly_amount: number | null
  monthly_total: number | null
  first_seen_month: string | null
  last_seen_month: string | null
  status: string
}

interface ScorecardData {
  id: string
  deal_id: string
  overall_score: number
  risk_grade: string
  adb_score: number | null
  revenue_consistency_score: number | null
  nsf_score: number | null
  mca_stack_score: number | null
  revenue_trend_score: number | null
  time_in_business_score: number | null
}

interface RiskFlagData {
  id: string
  deal_id: string
  severity: 'high' | 'medium' | 'low'
  message: string
}

interface DocumentData {
  id: string
  file_name: string
  file_size: number
  document_type: 'application' | 'bank_statement'
  storage_path: string
}

interface ActivityData {
  id: string
  action_type: string
  action_title: string
  action_description: string | null
  created_at: string
  risk_score: number | null
}

export default function DealDetailPage({ params }: { params: { id: string } }) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [deal, setDeal] = useState<DealData | null>(null)
  const [merchant, setMerchant] = useState<MerchantData | null>(null)
  const [fileControlSheet, setFileControlSheet] = useState<FileControlSheet | null>(null)
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDealData() {
      const supabase = createClient()
      try {
        // 1. Query deal
        const { data: dealData, error: dealError } = await supabase
          .from('deals')
          .select('*')
          .eq('id', params.id)
          .single()

        if (dealError || !dealData) {
          setError('Deal not found')
          setLoading(false)
          return
        }

        setDeal(dealData)

        // 2. Query merchant/contact
        const { data: merchantData } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', dealData.merchant_id)
          .single()

        setMerchant(merchantData)

        // 3. Query bank statements
        const { data: statementsData } = await supabase
          .from('bank_statements_detailed')
          .select('*')
          .eq('deal_id', params.id)
          .order('statement_year, statement_month', { ascending: true })

        // 4. Query MCA positions
        const { data: mcaData } = await supabase
          .from('mca_positions_detailed')
          .select('*')
          .eq('deal_id', params.id)

        // 5. Query underwriting scorecard
        const { data: scorecardData } = await supabase
          .from('underwriting_scorecards_detailed')
          .select('*')
          .eq('deal_id', params.id)
          .single()

        // 6. Query risk flags
        const { data: riskFlagsData } = await supabase
          .from('risk_flags_detailed')
          .select('*')
          .eq('deal_id', params.id)

        // 7. Query documents
        const { data: docsData } = await supabase
          .from('documents_detailed')
          .select('*')
          .eq('deal_id', params.id)
          .order('document_type', { ascending: true })

        // 8. Query activities
        const { data: activitiesData } = await supabase
          .from('deal_activities')
          .select('*')
          .eq('deal_id', params.id)
          .order('created_at', { ascending: false })

        setActivities(activitiesData || [])

        // Build FileControlSheet from database records
        const sheet: FileControlSheet = {
          merchant_legal_name: merchantData?.business_legal_name || null,
          merchant_dba: merchantData?.dba || null,
          date_generated: new Date().toISOString().split('T')[0],
          prepared_by: 'System',
          deal_number: dealData.deal_number || null,
          overall_recommendation: scorecardData ?
            (scorecardData.overall_score >= 75 ? 'APPROVE' :
             scorecardData.overall_score >= 60 ? 'COUNTER' :
             scorecardData.overall_score >= 40 ? 'REVIEW' : 'DECLINE') : 'REVIEW',

          merchant_summary: {
            legal_name: merchantData?.business_legal_name || null,
            dba: merchantData?.dba || null,
            entity_type: merchantData?.entity_type || null,
            ein: merchantData?.ein || null,
            date_established: null,
            time_in_business_years: merchantData?.time_in_business_years || null,
            industry: merchantData?.industry || null,
            address: merchantData?.business_address || null,
            phone: merchantData?.business_phone || null,
            email: merchantData?.business_email || null,
            owner_1_name: merchantData?.owner_name || null,
            owner_1_ownership_pct: merchantData?.ownership_percentage || null,
            owner_1_ssn_last4: merchantData?.owner_ssn_last4 || null,
            owner_2_name: null,
            owner_2_ownership_pct: null,
          },

          bank_analysis_months: (statementsData || []).map(stmt => ({
            month_label: `${String(stmt.statement_month).padStart(2, '0')}/${stmt.statement_year}`,
            starting_balance: stmt.starting_balance,
            ending_balance: stmt.ending_balance,
            true_revenue: stmt.true_revenue || 0,
            non_revenue: stmt.non_revenue_deposits || 0,
            total_deposits: stmt.total_deposits || 0,
            avg_daily_balance: stmt.average_daily_balance,
            lowest_balance: stmt.lowest_daily_balance,
            nsf_count: stmt.nsf_count || 0,
            mca_holdback: stmt.total_mca_holdback || 0,
            holdback_pct: stmt.holdback_percentage,
            net_cash_flow: stmt.net_cash_flow || 0,
          })),

          trend_analysis: {
            revenue_trend: 'STABLE',
            revenue_month_over_month_change: null,
            adb_trend: 'STABLE',
            nsf_trend: 'STABLE',
            mca_load_trend: 'STABLE',
            overall_direction: 'STABLE',
          },

          mca_positions: (mcaData || []).map(mca => ({
            funder: mca.funder_name,
            type: 'Daily',
            per_debit: mca.daily_debit_amount || 0,
            frequency: 'daily',
            monthly_total: mca.monthly_total || 0,
            months_active: 1,
            total_paid: mca.monthly_total || 0,
            status: mca.status || 'active',
          })),

          mca_summary: {
            combined_daily_obligation: (mcaData || []).reduce((sum, m) => sum + (m.daily_debit_amount || 0), 0),
            combined_monthly_obligation: (mcaData || []).reduce((sum, m) => sum + (m.monthly_total || 0), 0),
            combined_holdback_pct: (statementsData && statementsData.length > 0) ?
              Math.round((statementsData.reduce((sum, s) => sum + (s.holdback_percentage || 0), 0) / statementsData.length) * 100) / 100 : null,
          },

          risk_flags: (riskFlagsData || []).map(flag => ({
            severity: flag.severity.toUpperCase() as 'HIGH' | 'MEDIUM' | 'LOW',
            flag: flag.message.split(' - ')[0] || 'Risk Flag',
            description: flag.message,
          })),

          scorecard: {
            overall_score: scorecardData?.overall_score || 0,
            grade: scorecardData?.risk_grade || 'F',
            revenue_quality_score: scorecardData?.revenue_consistency_score || 0,
            cash_flow_score: scorecardData?.adb_score || 0,
            credit_score: 50,
            time_in_business_score: scorecardData?.time_in_business_score || 0,
            debt_service_score: scorecardData?.mca_stack_score || 0,
          },

          underwriting_recommendation: {
            advance_amount: null,
            factor_rate_range_low: 1.2,
            factor_rate_range_high: 1.45,
            recommended_term_days: 150,
            recommended_daily_debit: null,
            rationale: 'Underwriting review completed. Consult with underwriting team for final approval.',
          },

          non_revenue_deposits: [],
          daily_balances: [],
          revenue_source_breakdown: [],

          application_confidence_score: 75,
          bank_statement_confidence_score: 80,
          overall_confidence_score: 78,
        }

        setFileControlSheet(sheet)

        // Reconstruct files for ReviewScreenNew
        const reconstructedFiles: UploadedFile[] = []

        // Add application if present
        const appDoc = docsData?.find(d => d.document_type === 'application')
        if (merchantData && appDoc) {
          const application: ParsedApplication = {
            business_legal_name: merchantData.business_legal_name,
            dba: merchantData.dba,
            entity_type: merchantData.entity_type,
            ein: merchantData.ein,
            date_established: null,
            time_in_business_years: merchantData.time_in_business_years,
            industry: merchantData.industry,
            business_address: merchantData.business_address,
            business_city: null,
            business_state: null,
            business_zip: null,
            business_phone: merchantData.business_phone,
            business_fax: null,
            business_email: merchantData.business_email,
            business_website: null,
            monthly_revenue: merchantData.monthly_revenue,
            monthly_rent: merchantData.monthly_rent,
            landlord_name: merchantData.landlord_name,
            landlord_phone: null,
            use_of_funds: merchantData.use_of_funds,
            bank_name: merchantData.bank_name,
            bank_account_last4: null,
            bank_routing: null,
            average_monthly_balance: null,
            processor_name: null,
            monthly_processing_volume: null,
            owner_1_name: merchantData.owner_name,
            owner_1_title: null,
            owner_1_dob: merchantData.owner_dob,
            owner_1_ssn_last4: merchantData.owner_ssn_last4,
            owner_1_address: null,
            owner_1_city: null,
            owner_1_state: null,
            owner_1_zip: null,
            owner_1_ownership_pct: merchantData.ownership_percentage,
            owner_1_email: null,
            owner_1_cell: null,
            owner_1_home_phone: null,
            owner_2_name: null,
            owner_2_title: null,
            owner_2_dob: null,
            owner_2_ssn_last4: null,
            owner_2_address: null,
            owner_2_city: null,
            owner_2_state: null,
            owner_2_zip: null,
            owner_2_ownership_pct: null,
            owner_2_email: null,
            owner_2_cell: null,
            existing_obligations: null,
            confidence_score: 0,
            low_confidence_fields: [],
            extraction_notes: 'Reconstructed from database',
            additional_notes: null,
          }

          reconstructedFiles.push({
            file: new File([], appDoc.file_name),
            type: 'application',
            parsing: false,
            parsed: true,
            error: null,
            label: appDoc.file_name,
            data: application,
          })
        }

        // Add bank statements
        if (statementsData) {
          statementsData.forEach(stmt => {
            const statement: ParsedBankStatement = {
              bank_name: 'Unknown',
              account_number_last4: null,
              routing_number: null,
              statement_period_start: stmt.statement_period_start,
              statement_period_end: stmt.statement_period_end,
              statement_month_label: `${String(stmt.statement_month).padStart(2, '0')}/${stmt.statement_year}`,
              statement_month: stmt.statement_month,
              statement_year: stmt.statement_year,
              starting_balance: stmt.starting_balance,
              ending_balance: stmt.ending_balance,
              total_deposits: stmt.total_deposits || 0,
              deposit_count: 0,
              revenue_deposits: [],
              non_revenue_deposits: [],
              true_revenue_total: stmt.true_revenue || 0,
              non_revenue_total: stmt.non_revenue_deposits || 0,
              average_daily_balance: stmt.average_daily_balance || 0,
              lowest_daily_balance: stmt.lowest_daily_balance,
              lowest_balance_date: null,
              highest_daily_balance: null,
              highest_balance_date: null,
              days_below_500: 0,
              days_below_1000: 0,
              days_below_2000: 0,
              total_withdrawals: null,
              withdrawal_count: null,
              nsf_events: [],
              nsf_count: stmt.nsf_count || 0,
              nsf_total_amount: 0,
              mca_positions: (mcaData || [])
                .filter(mca => {
                  const firstMonth = mca.first_seen_month?.split('-')
                  const lastMonth = mca.last_seen_month?.split('-')
                  if (!firstMonth || !lastMonth) return false
                  const stmtDate = `${stmt.statement_year}-${String(stmt.statement_month).padStart(2, '0')}`
                  return stmtDate >= firstMonth.join('-') && stmtDate <= lastMonth.join('-')
                })
                .map(mca => ({
                  funder_name: mca.funder_name,
                  descriptor_matched: mca.funder_name,
                  amount_per_debit: mca.daily_debit_amount || 0,
                  frequency: 'daily' as const,
                  total_debited_this_month: mca.monthly_total || 0,
                  debit_dates: [],
                })) || [],
              total_mca_holdback: stmt.total_mca_holdback || 0,
              holdback_pct_of_true_revenue: stmt.true_revenue ? ((stmt.total_mca_holdback || 0) / stmt.true_revenue * 100) : null,
              holdback_pct_of_total_deposits: stmt.total_deposits ? ((stmt.total_mca_holdback || 0) / stmt.total_deposits * 100) : null,
              daily_balances: [],
              largest_single_deposit: null,
              largest_single_withdrawal: null,
              net_cash_flow: stmt.net_cash_flow || 0,
              confidence_score: 50,
              low_confidence_fields: [],
              parsing_notes: ['Reconstructed from database data'],
            }

            const stmtDoc = docsData?.find(
              d => d.document_type === 'bank_statement' &&
                (d.file_name?.includes(String(stmt.statement_month)) || true)
            )

            reconstructedFiles.push({
              file: new File([], stmtDoc?.file_name || `statement-${stmt.statement_month}-${stmt.statement_year}`),
              type: 'bank_statement',
              parsing: false,
              parsed: true,
              error: null,
              label: stmtDoc?.file_name || `${stmt.statement_month}/${stmt.statement_year}`,
              data: statement,
            })
          })
        }

        setFiles(reconstructedFiles)
        setLoading(false)
      } catch (err) {
        console.error('Error loading deal data:', err)
        setError('Failed to load deal data')
        setLoading(false)
      }
    }

    loadDealData()
  }, [params.id])

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-slate-600">Loading deal...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !deal || !merchant) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Link href="/deals" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Deals
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-red-700 text-sm mt-1">{error || 'Failed to load deal'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900 p-6 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto">
          <Link href="/deals" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Deals
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">{merchant.business_legal_name || merchant.dba || 'Merchant'}</h1>
              <p className="text-sm text-slate-400 mt-1">{deal.deal_number}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-slate-100">{deal.risk_grade}</div>
              <p className="text-sm text-slate-400">Risk Grade</p>
            </div>
          </div>
        </div>
      </div>

      {/* Document Collection Warning */}
      {deal.status === 'Document Collection' && (
        <div className="bg-amber-900/20 border-b border-amber-700 p-6">
          <div className="max-w-7xl mx-auto flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-amber-300 text-lg">Document Collection In Progress</h2>
              <p className="text-amber-200 text-sm mt-2">
                This deal is waiting for additional documents to be uploaded.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Review Screen */}
      {files.length > 0 && (
        <div className="bg-slate-950 py-6 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-lg font-semibold text-white mb-4">Uploaded Documents</h2>
            <ReviewScreenNew files={files} readOnly={true} />
          </div>
        </div>
      )}

      {/* File Control Sheet */}
      {fileControlSheet && (
        <FileControlSheetDisplay sheet={fileControlSheet} />
      )}

      {/* Activity Timeline */}
      {activities.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-8 border-t border-slate-800">
          <h2 className="text-lg font-semibold text-white mb-6">Activity Timeline</h2>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/20">
                      <Calendar className="h-5 w-5 text-blue-400" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">{activity.action_title}</h3>
                    {activity.action_description && (
                      <p className="text-sm text-slate-400 mt-1">{activity.action_description}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(activity.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
