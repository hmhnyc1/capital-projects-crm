import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, DollarSign, Calendar, TrendingUp, CreditCard } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import ActivityItem from '@/components/ActivityItem'
import { format } from 'date-fns'
import { Activity, DealStage, MCAStatus, Payment } from '@/types'
import DeleteDealButton from './DeleteDealButton'
import clsx from 'clsx'

const STAGES: DealStage[] = ['Prospecting', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']

const stageBadgeVariant: Record<string, 'default' | 'info' | 'warning' | 'success' | 'danger' | 'purple'> = {
  'Prospecting': 'default',
  'Qualified': 'info',
  'Proposal': 'warning',
  'Negotiation': 'purple',
  'Closed Won': 'success',
  'Closed Lost': 'danger',
}

const mcaStatusColors: Record<MCAStatus, string> = {
  active: 'bg-green-100 text-green-700',
  paid_off: 'bg-blue-100 text-blue-700',
  defaulted: 'bg-red-100 text-red-700',
  renewed: 'bg-purple-100 text-purple-700',
}

const paymentStatusColors: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  scheduled: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
  returned: 'bg-orange-100 text-orange-700',
  nsf: 'bg-red-100 text-red-800',
}

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: deal }, { data: activities }, { data: payments }] = await Promise.all([
    supabase
      .from('deals')
      .select('*, contacts(id, first_name, last_name, company, email, phone)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('activities')
      .select('*, contacts(first_name, last_name, company)')
      .eq('deal_id', params.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('payments')
      .select('*')
      .eq('deal_id', params.id)
      .order('payment_date', { ascending: false })
      .limit(20),
  ])

  if (!deal) notFound()

  const stageIndex = STAGES.indexOf(deal.stage as DealStage)
  const hasMCA = deal.advance_amount !== null

  const payback = Number(deal.payback_amount) || 0
  const totalPaid = Number(deal.total_paid) || 0
  const remaining = Number(deal.remaining_balance) ?? 0
  const paidPct = payback > 0 ? Math.min(100, (totalPaid / payback) * 100) : 0
  const remainPct = payback > 0 ? (remaining / payback) * 100 : 0
  let progressColor = 'bg-green-500'
  if (remainPct < 25) progressColor = 'bg-red-500'
  else if (remainPct < 50) progressColor = 'bg-yellow-500'

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/deals"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Deals
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{deal.title}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant={stageBadgeVariant[deal.stage] || 'default'}>{deal.stage}</Badge>
              {deal.mca_status && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${mcaStatusColors[deal.mca_status as MCAStatus]}`}>
                  {deal.mca_status === 'paid_off' ? 'Paid Off' : deal.mca_status.charAt(0).toUpperCase() + deal.mca_status.slice(1)}
                </span>
              )}
              {deal.value && (
                <span className="text-slate-600 text-sm font-medium">${Number(deal.value).toLocaleString()}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <DeleteDealButton id={deal.id} title={deal.title} />
            <Link
              href={`/deals/${deal.id}/edit`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
          </div>
        </div>
      </div>

      {/* Stage Progress */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Stage Progress</h2>
        <div className="flex items-center gap-0">
          {STAGES.map((stage, i) => {
            const isActive = i === stageIndex
            const isPast = i < stageIndex
            const isClosedLost = stage === 'Closed Lost' && deal.stage === 'Closed Lost'
            return (
              <div key={stage} className="flex-1 flex items-center">
                <div className="flex-1">
                  <div
                    className={clsx(
                      'h-2 rounded-sm',
                      isClosedLost ? 'bg-red-400' :
                      isPast || isActive ? 'bg-blue-500' : 'bg-slate-200'
                    )}
                  />
                  <p className={clsx(
                    'text-xs mt-1.5 truncate',
                    isActive ? 'font-semibold text-blue-700' : isPast ? 'text-slate-500' : 'text-slate-400'
                  )}>
                    {stage}
                  </p>
                </div>
                {i < STAGES.length - 1 && <div className="w-1" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* MCA Info Panel */}
      {hasMCA && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">MCA Details</h2>
            <Link href="/payments/new" className="text-xs text-blue-600 hover:underline font-medium">
              + Record Payment
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <div>
              <p className="text-xs text-slate-500">Advance Amount</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                {deal.advance_amount ? `$${Number(deal.advance_amount).toLocaleString()}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Factor Rate</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                {deal.factor_rate ? `${Number(deal.factor_rate).toFixed(2)}x` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Payback Amount</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                {deal.payback_amount ? `$${Number(deal.payback_amount).toLocaleString()}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Daily Payment</p>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                {deal.daily_payment ? `$${Number(deal.daily_payment).toLocaleString()}` : '—'}
                {deal.payment_frequency && <span className="text-xs text-slate-500 font-normal ml-1">/ {deal.payment_frequency}</span>}
              </p>
            </div>
          </div>

          {/* Balance Progress Bar */}
          {payback > 0 && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-600 mb-1.5">
                <span>Total Paid: <span className="font-semibold text-green-700">${totalPaid.toLocaleString()}</span></span>
                <span>Remaining: <span className="font-semibold text-slate-900">${remaining.toLocaleString()}</span></span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progressColor}`}
                  style={{ width: `${paidPct}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">{Math.round(paidPct)}% collected of ${payback.toLocaleString()} payback</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Position</p>
              <p className="text-sm font-medium text-slate-700">{deal.position ? `${deal.position}${deal.position === 1 ? 'st' : deal.position === 2 ? 'nd' : deal.position === 3 ? 'rd' : 'th'} Position` : '—'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Origination</p>
              <p className="text-sm font-medium text-slate-700">
                {deal.origination_date ? format(new Date(deal.origination_date), 'MMM d, yyyy') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Maturity</p>
              <p className="text-sm font-medium text-slate-700">
                {deal.maturity_date ? format(new Date(deal.maturity_date), 'MMM d, yyyy') : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Funder</p>
              <p className="text-sm font-medium text-slate-700">{deal.funder_name ?? '—'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Deal Info</h2>
            <div className="space-y-3">
              {deal.value !== null && deal.value !== undefined && (
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Value</p>
                    <p className="text-sm font-semibold text-slate-900">${Number(deal.value).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {deal.probability !== null && deal.probability !== undefined && (
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Probability</p>
                    <p className="text-sm font-semibold text-slate-900">{deal.probability}%</p>
                  </div>
                </div>
              )}
              {deal.expected_close_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Expected Close</p>
                    <p className="text-sm font-medium text-slate-900">
                      {format(new Date(deal.expected_close_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Created</p>
                  <p className="text-sm text-slate-700">{format(new Date(deal.created_at), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          {deal.contacts && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">Merchant</h2>
              <Link href={`/contacts/${deal.contacts.id}`} className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-semibold">
                    {deal.contacts.first_name[0]}{deal.contacts.last_name[0]}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
                    {deal.contacts.first_name} {deal.contacts.last_name}
                  </p>
                  {deal.contacts.company && <p className="text-xs text-slate-500">{deal.contacts.company}</p>}
                </div>
              </Link>
              {deal.contacts.email && (
                <a href={`mailto:${deal.contacts.email}`} className="mt-3 flex items-center gap-2 text-xs text-blue-600 hover:underline">
                  {deal.contacts.email}
                </a>
              )}
            </div>
          )}

          {deal.description && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">Description</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{deal.description}</p>
            </div>
          )}
        </div>

        {/* Payment History + Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment History */}
          {hasMCA && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Payment History ({payments?.length ?? 0})
                </h2>
                <Link
                  href="/payments/new"
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  + Record Payment
                </Link>
              </div>
              {payments && payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 uppercase">
                        <th className="text-left pb-2">Date</th>
                        <th className="text-right pb-2">Amount</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2">Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(payments as Payment[]).map(pmt => (
                        <tr key={pmt.id}>
                          <td className="py-2 text-slate-700">
                            {new Date(pmt.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className="py-2 text-right font-semibold text-slate-900">
                            ${Number(pmt.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${paymentStatusColors[pmt.status] ?? 'bg-slate-100 text-slate-700'}`}>
                              {pmt.status}
                            </span>
                          </td>
                          <td className="py-2 text-center text-slate-500 capitalize">{pmt.payment_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6">
                  <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No payments recorded</p>
                  <Link href="/payments/new" className="mt-2 text-xs text-blue-600 hover:underline block">Record first payment</Link>
                </div>
              )}
            </div>
          )}

          {/* Activity */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                Activity ({activities?.length ?? 0})
              </h2>
              <Link
                href={`/activities/new?deal_id=${deal.id}`}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                + Log Activity
              </Link>
            </div>
            {activities && activities.length > 0 ? (
              <div className="space-y-4 divide-y divide-slate-100">
                {(activities as Activity[]).map(activity => (
                  <div key={activity.id} className="pt-4 first:pt-0">
                    <ActivityItem activity={activity} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-8 text-center">No activities logged yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
