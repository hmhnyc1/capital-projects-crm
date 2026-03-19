import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { FileText, Plus } from 'lucide-react'
import { BankStatement } from '@/types'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default async function BankStatementsPage() {
  const supabase = createClient()

  const { data: statements, error } = await supabase
    .from('bank_statements')
    .select('*, contacts(id, first_name, last_name, company)')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bank Statements</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {statements?.length ?? 0} statement{statements?.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>
        <Link
          href="/bank-statements/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Upload Statement
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-red-600">Error loading statements: {error.message}</div>
        ) : !statements || statements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No bank statements yet</p>
            <p className="text-slate-400 text-sm mt-1">Upload a CSV bank statement to analyze transactions</p>
            <Link
              href="/bank-statements/new"
              className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Upload Statement
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Merchant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">File</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Period</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Deposits</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Withdrawals</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Avg Daily Bal</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">NSF Count</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Transactions</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Uploaded</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(statements as BankStatement[]).map(stmt => (
                  <tr key={stmt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      {stmt.contacts ? (
                        <Link href={`/contacts/${stmt.contacts.id}`} className="group">
                          <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {stmt.contacts.first_name} {stmt.contacts.last_name}
                          </p>
                          {stmt.contacts.company && (
                            <p className="text-xs text-slate-500">{stmt.contacts.company}</p>
                          )}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <Link href={`/bank-statements/${stmt.id}`} className="text-sm text-blue-600 hover:underline font-medium">
                        {stmt.file_name}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {stmt.statement_month && stmt.statement_year
                        ? `${MONTHS[stmt.statement_month - 1]} ${stmt.statement_year}`
                        : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium text-green-700">
                      {stmt.total_deposits != null ? `$${Number(stmt.total_deposits).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm font-medium text-red-600">
                      {stmt.total_withdrawals != null ? `$${Number(stmt.total_withdrawals).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-slate-700">
                      {stmt.average_daily_balance != null ? `$${Number(stmt.average_daily_balance).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-right text-sm">
                      {stmt.nsf_count > 0 ? (
                        <span className="text-red-600 font-semibold">{stmt.nsf_count}</span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-sm text-slate-500">{stmt.transaction_count ?? '—'}</td>
                    <td className="px-4 py-4 text-sm text-slate-500">
                      {new Date(stmt.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
