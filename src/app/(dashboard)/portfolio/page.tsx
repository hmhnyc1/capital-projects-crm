import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BarChart3, DollarSign, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { Deal, MCAStatus } from '@/types'

const mcaStatusColors: Record<MCAStatus, string> = {
  active: 'bg-success bg-opacity-10 text-success',
  paid_off: 'bg-accent-primary bg-opacity-10 text-accent-primary',
  defaulted: 'bg-danger bg-opacity-10 text-danger',
  renewed: 'bg-accent-secondary bg-opacity-10 text-accent-secondary',
}

function BalanceBar({ deal }: { deal: Deal }) {
  if (!deal.payback_amount || !deal.remaining_balance) return null
  const paidPct = Math.min(100, ((Number(deal.total_paid) || 0) / Number(deal.payback_amount)) * 100)
  const remaining = Number(deal.remaining_balance)
  const payback = Number(deal.payback_amount)
  const remainPct = payback > 0 ? (remaining / payback) * 100 : 0

  let barColor = 'bg-success'
  if (remainPct < 25) barColor = 'bg-danger'
  else if (remainPct < 50) barColor = 'bg-warning'

  return (
    <div className="w-full">
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${paidPct}%` }}
        />
      </div>
      <p className="text-xs text-text-muted mt-0.5">{Math.round(paidPct)}% collected</p>
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
        <h1 className="text-3xl font-bold text-text-primary">MCA Portfolio</h1>
        <p className="text-text-muted text-sm mt-0.5">Overview of all merchant cash advances</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-bg-secondary rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-accent-primary bg-opacity-10 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-accent-primary" />
            </div>
            <span className="text-sm font-medium text-text-secondary">Total Portfolio Balance</span>
          </div>
          <p className="text-2xl font-bold text-text-primary font-mono">${totalPortfolioBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-text-muted mt-1">Outstanding on active deals</p>
        </div>

        <div className="bg-bg-secondary rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-success bg-opacity-10 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-success" />
            </div>
            <span className="text-sm font-medium text-text-secondary">Active MCAs</span>
          </div>
          <p className="text-2xl font-bold text-text-primary font-mono">{activeDeals.length}</p>
          <p className="text-xs text-text-muted mt-1">{paidOffDeals.length} paid off · {defaultedDeals.length} defaulted</p>
        </div>

        <div className="bg-bg-secondary rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-accent-secondary bg-opacity-10 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-accent-secondary" />
            </div>
            <span className="text-sm font-medium text-text-secondary">Collections This Month</span>
          </div>
          <p className="text-2xl font-bold text-text-primary font-mono">${collectionsThisMonth.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
          <p className="text-xs text-text-muted mt-1">Completed ACH payments</p>
        </div>

        <div className="bg-bg-secondary rounded-xl border border-border p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-warning bg-opacity-10 p-2 rounded-lg">
              <CheckCircle className="w-5 h-5 text-warning" />
            </div>
            <span className="text-sm font-medium text-text-secondary">Avg Factor Rate</span>
          </div>
          <p className="text-2xl font-bold text-text-primary font-mono">{avgFactorRate > 0 ? avgFactorRate.toFixed(2) : '—'}</p>
          <p className="text-xs text-text-muted mt-1">Across active deals · ${totalFunded.toLocaleString()} total funded</p>
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-text-primary">All MCA Deals</h2>
          <Link
            href="/deals/new"
            className="inline-flex items-center gap-2 bg-accent-primary hover:bg-opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-smooth"
          >
            + New Deal
          </Link>
        </div>

        {allDeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-bg-tertiary p-4 rounded-full mb-4">
              <BarChart3 className="w-8 h-8 text-text-muted" />
            </div>
            <p className="text-text-secondary font-medium">No MCA deals yet</p>
            <p className="text-text-muted text-sm mt-1">Create a deal with advance amount to see it here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-bg-tertiary border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Merchant</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Advance</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Factor</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Payback</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Total Paid</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Remaining</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Daily Pmt</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Progress</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wide">Originated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {allDeals.map(deal => (
                  <tr key={deal.id} className="hover:bg-bg-tertiary transition-smooth">
                    <td className="px-6 py-4">
                      <Link href={`/deals/${deal.id}`} className="group">
                        <p className="text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-smooth">{deal.title}</p>
                        {deal.contacts && (
                          <p className="text-xs text-text-muted">
                            {deal.contacts.first_name} {deal.contacts.last_name}
                            {deal.contacts.company ? ` · ${deal.contacts.company}` : ''}
                          </p>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium text-text-primary font-mono">
                      {deal.advance_amount ? `$${Number(deal.advance_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-text-secondary font-mono">
                      {deal.factor_rate ? `${Number(deal.factor_rate).toFixed(2)}x` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-text-secondary font-mono">
                      {deal.payback_amount ? `$${Number(deal.payback_amount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-success font-medium font-mono">
                      {deal.total_paid ? `$${Number(deal.total_paid).toLocaleString()}` : '$0'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-semibold text-text-primary font-mono">
                      {deal.remaining_balance !== null ? `$${Number(deal.remaining_balance).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-text-secondary font-mono">
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
                    <td className="px-4 py-4 text-sm text-text-muted">
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
        <div className="mt-4 bg-danger bg-opacity-10 border border-danger border-opacity-30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-danger">{defaultedDeals.length} defaulted deal{defaultedDeals.length !== 1 ? 's' : ''}</p>
            <p className="text-xs text-danger text-opacity-80 mt-0.5">
              {defaultedDeals.map(d => d.title).join(', ')}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
