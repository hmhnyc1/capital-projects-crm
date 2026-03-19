import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CreditCard, Plus, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import { Payment, PaymentStatus } from '@/types'

const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  returned: { label: 'Returned', className: 'bg-orange-100 text-orange-700' },
  nsf: { label: 'NSF', className: 'bg-red-100 text-red-800' },
}

export default async function PaymentsPage() {
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]
  const startOfWeek = new Date()
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
  const startOfWeekStr = startOfWeek.toISOString().split('T')[0]
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [
    { data: payments },
    { data: todayExpected },
    { data: weekPayments },
    { data: monthPayments },
    { data: failedNsf },
  ] = await Promise.all([
    supabase
      .from('payments')
      .select('*, deals(id, title, contacts!deals_merchant_id_fkey(first_name, last_name, company))')
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('payments')
      .select('amount')
      .eq('payment_date', today),
    supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', startOfWeekStr)
      .eq('status', 'completed'),
    supabase
      .from('payments')
      .select('amount')
      .gte('payment_date', startOfMonth)
      .eq('status', 'completed'),
    supabase
      .from('payments')
      .select('id')
      .in('status', ['failed', 'nsf'])
      .gte('payment_date', startOfMonth),
  ])

  const todayExpectedTotal = (todayExpected ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const weekTotal = (weekPayments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const monthTotal = (monthPayments ?? []).reduce((s, p) => s + Number(p.amount), 0)
  const failedCount = failedNsf?.length ?? 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500 text-sm mt-0.5">ACH payment tracking and history</p>
        </div>
        <Link
          href="/payments/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Today&apos;s Payments</span>
          </div>
          <p className="text-xl font-bold text-slate-900">${todayExpectedTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">This Week</span>
          </div>
          <p className="text-xl font-bold text-slate-900">${weekTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">This Month</span>
          </div>
          <p className="text-xl font-bold text-slate-900">${monthTotal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
        </div>

        <div className={`rounded-xl border shadow-sm p-5 ${failedCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className={`w-4 h-4 ${failedCount > 0 ? 'text-red-500' : 'text-slate-400'}`} />
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Failed / NSF (MTD)</span>
          </div>
          <p className={`text-xl font-bold ${failedCount > 0 ? 'text-red-700' : 'text-slate-900'}`}>{failedCount}</p>
        </div>
      </div>

      {/* Payment Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Payment Log</h2>
        </div>

        {!payments || payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <CreditCard className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No payments recorded</p>
            <p className="text-slate-400 text-sm mt-1">Start by recording a payment</p>
            <Link
              href="/payments/new"
              className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Record Payment
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Merchant</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Deal</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(payments as Payment[]).map(payment => {
                  const deal = payment.deals
                  const contact = deal?.contacts
                  const sc = statusConfig[payment.status] ?? { label: payment.status, className: 'bg-slate-100 text-slate-700' }
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {new Date(payment.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700">
                        {contact ? `${contact.first_name} ${contact.last_name}${contact.company ? ` · ${contact.company}` : ''}` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {deal ? (
                          <Link href={`/deals/${deal.id}`} className="text-sm text-blue-600 hover:underline font-medium">
                            {deal.title}
                          </Link>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-semibold text-slate-900">
                        ${Number(payment.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${sc.className}`}>
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-slate-600 capitalize">{payment.payment_type}</td>
                      <td className="px-4 py-4 text-sm text-slate-500 max-w-[200px] truncate">{payment.notes ?? '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
