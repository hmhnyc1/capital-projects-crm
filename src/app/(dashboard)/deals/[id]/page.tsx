'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Calendar, AlertCircle } from 'lucide-react'
import ReviewScreenNew from '@/app/(dashboard)/upload-deal/ReviewScreenNew'
import type { UploadedFile, ParsedApplication, ParsedBankStatement } from '@/types'

interface DealData {
  id: string
  title: string
  deal_number: string
  merchant_id: string
  risk_score: number
  risk_grade: string
  executive_summary: string
  status: string
  position_recommendation: string
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
  stated_monthly_revenue: number | null
  bank_name: string | null
  account_type: string | null
  landlord_name: string | null
  monthly_rent: number | null
  use_of_funds: string | null
  ownership_percentage: number | null
}

interface BankStatementData {
  id: string
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
  nsf_dates: string[] | null
  nsf_amounts: number[] | null
  total_mca_holdback: number | null
  holdback_percentage: number | null
  net_cash_flow: number | null
}

interface MCAPosData {
  funder_name: string
  daily_debit_amount: number | null
  weekly_amount: number | null
  total_monthly: number | null
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
  const [activities, setActivities] = useState<ActivityData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDealData() {
      const supabase = createClient()
      try {
        // Query deal
        const { data: dealData, error: dealError } = await supabase
          .from('deals')
          .select('*')
          .eq('id', params.id)
          .single()

        if (dealError || !dealData) {
          setError('Deal not found')
          return
        }

        setDeal(dealData)

        // Query contact (merchant)
        const { data: merchantData } = await supabase
          .from('contacts')
          .select('*')
          .eq('id', dealData.merchant_id)
          .single()

        setMerchant(merchantData)

        // Query bank statements
        const { data: statementsData } = await supabase
          .from('bank_statements_detailed')
          .select('*')
          .eq('deal_id', params.id)
          .order('statement_year, statement_month', { ascending: true })

        // Query MCA positions
        const { data: mcaData } = await supabase
          .from('mca_positions_detailed')
          .select('*')
          .eq('deal_id', params.id)

        // Query documents
        const { data: docsData } = await supabase
          .from('documents_detailed')
          .select('*')
          .eq('deal_id', params.id)
          .order('document_type', { ascending: true })

        // Query activities
        const { data: activitiesData } = await supabase
          .from('deal_activities')
          .select('*')
          .eq('deal_id', params.id)
          .order('created_at', { ascending: false })

        setActivities(activitiesData || [])

        // Reconstruct files array for ReviewScreenNew
        const reconstructedFiles: UploadedFile[] = []

        // Add application (first document that's an application)
        const appDoc = docsData?.find(d => d.document_type === 'application')
        if (merchantData && appDoc) {
          const application: ParsedApplication = {
            business_legal_name: merchantData.business_legal_name,
            dba: merchantData.dba,
            entity_type: merchantData.entity_type,
            ownership_percentage: merchantData.ownership_percentage,
            owner_name: merchantData.owner_name,
            owner_dob: merchantData.owner_dob,
            owner_ssn_last4: merchantData.owner_ssn_last4,
            business_address: merchantData.business_address,
            business_phone: merchantData.business_phone,
            business_email: merchantData.business_email,
            ein: merchantData.ein,
            time_in_business_years: merchantData.time_in_business_years,
            industry: merchantData.industry,
            stated_monthly_revenue: merchantData.stated_monthly_revenue,
            bank_name: merchantData.bank_name,
            account_type: merchantData.account_type,
            landlord_name: merchantData.landlord_name,
            monthly_rent: merchantData.monthly_rent,
            use_of_funds: merchantData.use_of_funds,
            co_owners: null,
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
            // Build MCA debits for this statement
            const mcaDebits = mcaData
              ?.filter(mca => {
                const firstMonth = mca.first_seen_month?.split('-')
                const lastMonth = mca.last_seen_month?.split('-')
                if (!firstMonth || !lastMonth) return false
                const stmtDate = `${stmt.statement_year}-${String(stmt.statement_month).padStart(2, '0')}`
                return stmtDate >= firstMonth && stmtDate <= lastMonth
              })
              .map(mca => ({
                funder_name: mca.funder_name,
                daily_debit_amount: mca.daily_debit_amount || 0,
                weekly_amount: mca.weekly_amount || 0,
                frequency: 'daily' as const,
                total_monthly: mca.monthly_total || 0,
              })) || []

            const statement: ParsedBankStatement = {
              statement_period_text: `${stmt.statement_period_start} to ${stmt.statement_period_end}`,
              statement_start_date: stmt.statement_period_start,
              statement_end_date: stmt.statement_period_end,
              statement_month: stmt.statement_month,
              statement_year: stmt.statement_year,
              starting_balance: stmt.starting_balance,
              ending_balance: stmt.ending_balance,
              total_deposits: stmt.total_deposits || 0,
              deposit_count: 0,
              true_revenue_deposits: stmt.true_revenue || 0,
              non_revenue_deposits: stmt.non_revenue_deposits || 0,
              average_daily_balance: stmt.average_daily_balance || 0,
              lowest_daily_balance: stmt.lowest_daily_balance,
              nsf_count: stmt.nsf_count || 0,
              nsf_dates: stmt.nsf_dates || [],
              nsf_amounts: stmt.nsf_amounts || [],
              mca_debits: mcaDebits,
              total_mca_holdback: stmt.total_mca_holdback || 0,
              holdback_percentage: stmt.holdback_percentage || 0,
              net_cash_flow_after_mca: stmt.net_cash_flow || 0,
              days_below_500: 0,
              days_below_1000: 0,
            }

            const stmtDoc = docsData?.find(d => d.document_type === 'bank_statement' && d.statement_month === stmt.statement_month && d.statement_year === stmt.statement_year)

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

      {/* Review Screen */}
      {files.length > 0 && (
        <div className="bg-slate-950 py-6">
          <ReviewScreenNew files={files} readOnly={true} />
        </div>
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
