import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { BankTransaction } from '@/types'
import DeleteStatementButton from './DeleteStatementButton'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export default async function BankStatementDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: statement }, { data: transactions }] = await Promise.all([
    supabase
      .from('bank_statements')
      .select('*, contacts(id, first_name, last_name, company)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('bank_transactions')
      .select('*')
      .eq('statement_id', params.id)
      .order('transaction_date', { ascending: true }),
  ])

  if (!statement) notFound()

  const txs = (transactions as BankTransaction[]) ?? []
  const credits = txs.filter(t => t.transaction_type === 'credit')
  const debits = txs.filter(t => t.transaction_type === 'debit')
  const nsfTxs = txs.filter(t => t.is_nsf)
  const recommendedAdvance = statement.total_deposits
    ? Math.round(Number(statement.total_deposits) * 0.1 * 10) / 10
    : null

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link
          href="/bank-statements"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Bank Statements
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{statement.file_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {statement.contacts && (
                <Link href={`/contacts/${statement.contacts.id}`} className="text-sm text-blue-600 hover:underline">
                  {statement.contacts.first_name} {statement.contacts.last_name}
                  {statement.contacts.company ? ` · ${statement.contacts.company}` : ''}
                </Link>
              )}
              {statement.statement_month && statement.statement_year && (
                <span className="text-sm text-slate-500">
                  {MONTHS[statement.statement_month - 1]} {statement.statement_year}
                </span>
              )}
            </div>
          </div>
          <DeleteStatementButton id={statement.id} fileName={statement.file_name} />
        </div>
      </div>

      {/* Analysis Panel */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Deposits</p>
          <p className="text-xl font-bold text-green-700">
            {statement.total_deposits != null ? `$${Number(statement.total_deposits).toLocaleString()}` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{credits.length} credit transactions</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Withdrawals</p>
          <p className="text-xl font-bold text-red-600">
            {statement.total_withdrawals != null ? `$${Number(statement.total_withdrawals).toLocaleString()}` : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">{debits.length} debit transactions</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Avg Daily Balance</p>
          <p className="text-xl font-bold text-slate-900">
            {statement.average_daily_balance != null ? `$${Number(statement.average_daily_balance).toLocaleString()}` : '—'}
          </p>
        </div>

        <div className={`rounded-xl border shadow-sm p-5 ${statement.nsf_count > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">NSF Count</p>
          <p className={`text-xl font-bold ${statement.nsf_count > 0 ? 'text-red-700' : 'text-slate-900'}`}>
            {statement.nsf_count}
          </p>
          {nsfTxs.length > 0 && (
            <p className="text-xs text-red-600 mt-0.5">{nsfTxs.length} flagged transactions</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Largest Deposit</p>
          <p className="text-xl font-bold text-slate-900">
            {statement.largest_deposit != null ? `$${Number(statement.largest_deposit).toLocaleString()}` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Ending Balance</p>
          <p className="text-xl font-bold text-slate-900">
            {statement.ending_balance != null ? `$${Number(statement.ending_balance).toLocaleString()}` : '—'}
          </p>
        </div>
        {recommendedAdvance !== null && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 shadow-sm p-5">
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wide mb-1">Recommended Advance (10%)</p>
            <p className="text-xl font-bold text-blue-800">${recommendedAdvance.toLocaleString()}</p>
            <p className="text-xs text-blue-600 mt-0.5">Based on monthly deposits</p>
          </div>
        )}
      </div>

      {statement.analysis_notes && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Analysis Notes</h3>
          <p className="text-sm text-slate-600 leading-relaxed">{statement.analysis_notes}</p>
        </div>
      )}

      {/* Transaction Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Transactions ({statement.transaction_count ?? txs.length})
          </h2>
        </div>

        {txs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">No transactions recorded</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Balance</th>
                  <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {txs.map(tx => (
                  <tr key={tx.id} className={`${tx.is_nsf ? 'bg-red-50' : 'hover:bg-slate-50'} transition-colors`}>
                    <td className="px-6 py-3 text-sm text-slate-700">
                      {tx.transaction_date ? new Date(tx.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-6 py-3 text-sm text-slate-700 max-w-[300px]">
                      <span className="block truncate">{tx.description ?? '—'}</span>
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-semibold ${tx.transaction_type === 'credit' ? 'text-green-700' : 'text-red-600'}`}>
                      {tx.amount !== null ? `$${Number(tx.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {tx.transaction_type && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tx.transaction_type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {tx.transaction_type}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-slate-600">
                      {tx.balance !== null ? `$${Number(tx.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {tx.is_nsf && <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full">NSF</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
