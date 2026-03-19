import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BarChart3, DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { Deal, MCAStatus } from '@/types'

const mcaStatusColors: Record<MCAStatus, string> = {
  active: 'bg-green-100 text-green-700',
  paid_off: 'bg-blue-100 text-blue-700',
  defaulted: 'bg-red-100 text-red-700',
  renewed: 'bg-purple-100 text-purple-700',
}

function BalanceBar({ deal }: { deal: Deal }) {
  if (!deal.payback_amount || !deal.remaining_balance) return null
  const paidPct = Math.min(100, ((Number(deal.total_paid) || 0) / Number(deal.payback_amount)) * 100)
  const remaining = Number(deal.remaining_balance)
  const payback = Number(deal.payback_amount)
  const remainPct = payback > 0 ? (remaining / payback) * 100 : 0

  let barColor = 'bg-green-500'
  if (remainPct < 25) barColor = 'bg-red-500'
  else if (remainPct < 50) barColor = 'bg-yellow-500'

  return (
    <div className="w-full">
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${paidPct}%` }}
        />
      </div>
      <p className="text-xs text-slate-500 mt-0.5">{Math.round(paidPct)}% collected</p>
    </div>
  )
}

export default async function PortfolioPage() {
  const supabase = createClient()

  const { data: deals } = await supabase
    .from('deals')
    .select('*, contacts!deals_merchant_id_fkey(id, first_name, last_name, company)')
    .not('advance_amount', 'is', null)
    .order('remaining_balance', { ascending: false })

  const allDeals = (deals as Deal[]) ?? []

  const activeDeals = allDeals.filter(d => d.mca_status === 'active')
  const defaultedDeals = allDeals.filter(d => d.mca_status === 'defaulted')
  const paidOffDeals = allDeals.filter(d => d.mca_status === 'paid_off')

  const totalPortfolioBalance = activeDeals.reduce((sum, d) => sum + (Number(d.remaining_balance) || 0), 0)
  const totalFunded = allDeals.reduce((sum, d) => sum + (Number(d.advance_amount) || 0), 0)
  const avgFactorRate = activeDeals.length > 0
    ? activeDeals.reduce((sum, d) => sum + (Number(d.factor_rate) || 0), 0) / activeDeals.length
    : 0

  // Collections this month
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const { data: monthlyPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('status', 'completed')
    .gte('payment_date', startOfMonth)

  const collectionsThisMonth = (monthlyPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">MCA Portfolio</h1>
        <p className="text-slate-500 text-sm mt-0.5">Overview of all merchant cash advances</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Total Portfolio Balance</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">${totalPortfolioBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-slate-500 mt-1">Outstanding on active deals</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Active MCAs</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{activeDeals.length}</p>
          <p className="text-xs text-slate-500 mt-1">{paidOffDeals.length} paid off · {defaultedDeals.length} defaulted</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Collections This Month</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">${collectionsThisMonth.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-slate-500 mt-1">Completed ACH payments</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-slate-600">Avg Factor Rate</span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{avgFactorRate > 0 ? avgFactorRate.toFixed(2) : '—'}</p>
          <p className="text-xs text-slate-500 mt-1">Across active deals · ${totalFunded.toLocaleString()} total funded</p>
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">All MCA Deals</h2>
          <Link
            href="/deals/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            + New Deal
          </Link>
        </div>

        {allDeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <BarChart3 className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No MCA deals yet</p>
            <p className="text-slate-400 text-sm mt-1">Create a deal with advance amount to see it here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Merchant</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Advance</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Factor</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Payback</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Paid</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Remaining</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Daily Pmt</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Progress</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Originated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allDeals.map(deal => (
                  <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/deals/${deal.id}`} className="group">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{deal.title}</p>
                        {deal.contacts && (
                          <p className="text-xs text-slate-500">
                            {deal.contacts.first_name} {deal.contacts.last_name}
                            {deal.contacts.company ? ` · ${deal.contacts.company}` : ''}
                          </p>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium text-slate-900">
                      {deal.advance_amount ? `$${Number(deal.advance_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-slate-700">
                      {deal.factor_rate ? `${Number(deal.factor_rate).toFixed(2)}x` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-slate-700">
                      {deal.payback_amount ? `$${Number(deal.payback_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-green-700 font-medium">
                      {deal.total_paid ? `$${Number(deal.total_paid).toLocaleString()}` : '$0'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                      {deal.remaining_balance !== null ? `$${Number(deal.remaining_balance).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-slate-700">
                      {deal.daily_payment ? `$${Number(deal.daily_payment).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4 min-w-[120px]">
                      <BalanceBar deal={deal} />
                    </td>
                    <td className="px-4 py-4">
                      {deal.mca_status ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${mcaStatusColors[deal.mca_status as MCAStatus]}`}>
                          {deal.mca_status === 'paid_off' ? 'Paid Off' : deal.mca_status.charAt(0).toUpperCase() + deal.mca_status.slice(1)}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {deal.origination_date ? new Date(deal.origination_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Defaulted alert */}
      {defaultedDeals.length > 0 && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">{defaultedDeals.length} defaulted deal{defaultedDeals.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-red-600 mt-0.5">
              {defaultedDeals.map(d => d.title).join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
