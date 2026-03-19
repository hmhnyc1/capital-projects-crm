'use client'

import { useState, useRef } from 'react'
import { createBankStatement } from '@/app/actions/bank-statements'

interface ContactOption {
  id: string
  first_name: string
  last_name: string
  company: string | null
}

interface ParsedTransaction {
  transaction_date: string | null
  description: string | null
  amount: number | null
  transaction_type: 'credit' | 'debit' | null
  balance: number | null
  is_nsf: boolean
}

interface StatementStats {
  total_deposits: number
  total_withdrawals: number
  average_daily_balance: number
  nsf_count: number
  ending_balance: number | null
  largest_deposit: number
  transaction_count: number
}

interface Props {
  contacts: ContactOption[]
}

function parseCSV(csvText: string): ParsedTransaction[] {
  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  if (lines.length < 2) return []

  // Detect delimiter
  const header = lines[0]
  const delimiter = header.includes('\t') ? '\t' : ','

  const headers = header.split(delimiter).map(h => h.replace(/^"|"$/g, '').trim().toLowerCase())

  // Find column indices with fallbacks
  const findCol = (...names: string[]) => {
    for (const name of names) {
      const idx = headers.findIndex(h => h.includes(name))
      if (idx !== -1) return idx
    }
    return -1
  }

  const dateIdx = findCol('date', 'transaction date', 'posting date', 'post date')
  const descIdx = findCol('description', 'memo', 'narrative', 'details', 'payee')
  const amountIdx = findCol('amount', 'transaction amount', 'debit/credit')
  const debitIdx = findCol('debit', 'withdrawal', 'withdrawals')
  const creditIdx = findCol('credit', 'deposit', 'deposits')
  const balanceIdx = findCol('balance', 'running balance', 'ending balance')
  const typeIdx = findCol('type', 'transaction type', 'dr/cr')

  const transactions: ParsedTransaction[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue

    // Parse CSV fields respecting quotes
    const fields: string[] = []
    let field = ''
    let inQuotes = false
    for (let ci = 0; ci < line.length; ci++) {
      const ch = line[ci]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === delimiter && !inQuotes) {
        fields.push(field.trim())
        field = ''
      } else {
        field += ch
      }
    }
    fields.push(field.trim())

    const getField = (idx: number) => (idx >= 0 && idx < fields.length ? fields[idx].replace(/^"|"$/g, '').trim() : '')

    const dateStr = getField(dateIdx)
    const desc = getField(descIdx)

    // Parse amount: handle both combined amount column and separate debit/credit columns
    let amount: number | null = null
    let txType: 'credit' | 'debit' | null = null

    if (amountIdx >= 0) {
      const rawAmount = getField(amountIdx).replace(/[$,\s]/g, '')
      if (rawAmount !== '') {
        amount = parseFloat(rawAmount)
        if (!isNaN(amount)) {
          // Check type column
          if (typeIdx >= 0) {
            const typeStr = getField(typeIdx).toLowerCase()
            if (typeStr.includes('credit') || typeStr.includes('cr') || typeStr.includes('deposit')) {
              txType = 'credit'
              amount = Math.abs(amount)
            } else if (typeStr.includes('debit') || typeStr.includes('dr') || typeStr.includes('withdrawal')) {
              txType = 'debit'
              amount = Math.abs(amount)
            } else {
              txType = amount >= 0 ? 'credit' : 'debit'
              amount = Math.abs(amount)
            }
          } else {
            txType = amount >= 0 ? 'credit' : 'debit'
            amount = Math.abs(amount)
          }
        }
      }
    } else if (debitIdx >= 0 || creditIdx >= 0) {
      const debitStr = getField(debitIdx).replace(/[$,\s]/g, '')
      const creditStr = getField(creditIdx).replace(/[$,\s]/g, '')
      const debitAmt = debitStr ? parseFloat(debitStr) : NaN
      const creditAmt = creditStr ? parseFloat(creditStr) : NaN
      if (!isNaN(creditAmt) && creditAmt !== 0) {
        amount = Math.abs(creditAmt)
        txType = 'credit'
      } else if (!isNaN(debitAmt) && debitAmt !== 0) {
        amount = Math.abs(debitAmt)
        txType = 'debit'
      }
    }

    const balanceStr = getField(balanceIdx).replace(/[$,\s]/g, '')
    const balance = balanceStr ? parseFloat(balanceStr) : null

    // Detect NSF
    const descLower = desc.toLowerCase()
    const isNsf = descLower.includes('nsf') || descLower.includes('insufficient') || descLower.includes('overdraft') || descLower.includes('returned item')

    // Parse date
    let parsedDate: string | null = null
    if (dateStr) {
      try {
        const d = new Date(dateStr)
        if (!isNaN(d.getTime())) {
          parsedDate = d.toISOString().split('T')[0]
        }
      } catch {
        parsedDate = null
      }
    }

    if (amount !== null && !isNaN(amount)) {
      transactions.push({
        transaction_date: parsedDate,
        description: desc || null,
        amount,
        transaction_type: txType,
        balance: balance !== null && !isNaN(balance) ? balance : null,
        is_nsf: isNsf,
      })
    }
  }

  return transactions
}

function calculateStats(transactions: ParsedTransaction[]): StatementStats {
  const credits = transactions.filter(t => t.transaction_type === 'credit')
  const debits = transactions.filter(t => t.transaction_type === 'debit')

  const totalDeposits = credits.reduce((s, t) => s + (t.amount ?? 0), 0)
  const totalWithdrawals = debits.reduce((s, t) => s + (t.amount ?? 0), 0)
  const nsfCount = transactions.filter(t => t.is_nsf).length
  const largestDeposit = credits.length > 0 ? Math.max(...credits.map(t => t.amount ?? 0)) : 0

  // Average daily balance from balances if available
  const balances = transactions.filter(t => t.balance !== null).map(t => t.balance as number)
  const avgDailyBalance = balances.length > 0
    ? balances.reduce((s, b) => s + b, 0) / balances.length
    : 0

  const endingBalance = balances.length > 0 ? balances[balances.length - 1] : null

  return {
    total_deposits: Math.round(totalDeposits * 100) / 100,
    total_withdrawals: Math.round(totalWithdrawals * 100) / 100,
    average_daily_balance: Math.round(avgDailyBalance * 100) / 100,
    nsf_count: nsfCount,
    ending_balance: endingBalance !== null ? Math.round(endingBalance * 100) / 100 : null,
    largest_deposit: Math.round(largestDeposit * 100) / 100,
    transaction_count: transactions.length,
  }
}

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
]

export default function BankStatementUploadForm({ contacts }: Props) {
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([])
  const [stats, setStats] = useState<StatementStats | null>(null)
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [isParsed, setIsParsed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError('')
    setIsParsed(false)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      try {
        const txs = parseCSV(text)
        if (txs.length === 0) {
          setParseError('No transactions could be parsed. Please check your CSV format.')
          setTransactions([])
          setStats(null)
          return
        }
        const s = calculateStats(txs)
        setTransactions(txs)
        setStats(s)
        setIsParsed(true)
      } catch (err) {
        setParseError('Failed to parse CSV. Please ensure it is a valid CSV file.')
        setTransactions([])
        setStats(null)
      }
    }
    reader.readAsText(file)
  }

  const recommendedAdvance = stats ? Math.round((stats.total_deposits * 0.1) * 10) / 10 : 0

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <form ref={formRef} action={createBankStatement} className="space-y-5">
          <div>
            <label htmlFor="contact_id" className="block text-sm font-medium text-slate-700 mb-1.5">
              Merchant <span className="text-red-500">*</span>
            </label>
            <select
              id="contact_id"
              name="contact_id"
              required
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">-- Select merchant --</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}{c.company ? ` (${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="statement_month" className="block text-sm font-medium text-slate-700 mb-1.5">Statement Month</label>
              <select
                id="statement_month"
                name="statement_month"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- Select month --</option>
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="statement_year" className="block text-sm font-medium text-slate-700 mb-1.5">Year</label>
              <input
                id="statement_year"
                name="statement_year"
                type="number"
                min="2000"
                max="2099"
                defaultValue={new Date().getFullYear()}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="csv_file" className="block text-sm font-medium text-slate-700 mb-1.5">
              CSV File <span className="text-red-500">*</span>
            </label>
            <input
              id="csv_file"
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              required
              onChange={handleFileChange}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="text-xs text-slate-500 mt-1">
              Supported formats: Standard bank CSV with Date, Description, Amount, Balance columns
            </p>
            {parseError && (
              <p className="text-xs text-red-600 mt-1">{parseError}</p>
            )}
          </div>

          <div>
            <label htmlFor="analysis_notes" className="block text-sm font-medium text-slate-700 mb-1.5">Analysis Notes</label>
            <textarea
              id="analysis_notes"
              name="analysis_notes"
              rows={3}
              placeholder="Underwriting notes, observations about this statement..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Hidden fields populated after parsing */}
          <input type="hidden" name="file_name" value={fileName} />
          <input type="hidden" name="transactions_json" value={JSON.stringify(transactions)} />
          <input type="hidden" name="stats_json" value={JSON.stringify(stats ?? {})} />

          {isParsed && stats && (
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Parsed Analysis Preview</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Total Deposits</p>
                  <p className="text-base font-bold text-green-700 mt-0.5">${stats.total_deposits.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Total Withdrawals</p>
                  <p className="text-base font-bold text-red-600 mt-0.5">${stats.total_withdrawals.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Avg Daily Balance</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">${stats.average_daily_balance.toLocaleString()}</p>
                </div>
                <div className={`rounded-lg border p-3 ${stats.nsf_count > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                  <p className="text-xs text-slate-500">NSF Count</p>
                  <p className={`text-base font-bold mt-0.5 ${stats.nsf_count > 0 ? 'text-red-700' : 'text-slate-900'}`}>{stats.nsf_count}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Largest Single Deposit</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">${stats.largest_deposit.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Ending Balance</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5">
                    {stats.ending_balance !== null ? `$${stats.ending_balance.toLocaleString()}` : 'N/A'}
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                  <p className="text-xs text-blue-600 font-medium">Recommended Advance (10%)</p>
                  <p className="text-base font-bold text-blue-800 mt-0.5">${recommendedAdvance.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">{stats.transaction_count} transactions parsed</p>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!isParsed}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition"
            >
              {isParsed ? 'Save Statement' : 'Parse CSV first'}
            </button>
            <a href="/bank-statements" className="text-sm text-slate-500 hover:text-slate-900 transition-colors px-4 py-2.5">
              Cancel
            </a>
          </div>
        </form>
      </div>

      {/* Transaction Preview */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">Transaction Preview ({transactions.length} rows)</h3>
          </div>
          <div className="overflow-x-auto max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Type</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Balance</th>
                  <th className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">NSF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.slice(0, 50).map((tx, i) => (
                  <tr key={i} className={`${tx.is_nsf ? 'bg-red-50' : 'hover:bg-slate-50'} transition-colors`}>
                    <td className="px-4 py-2 text-slate-700">{tx.transaction_date ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-700 max-w-[250px] truncate">{tx.description ?? '—'}</td>
                    <td className={`px-4 py-2 text-right font-medium ${tx.transaction_type === 'credit' ? 'text-green-700' : 'text-red-600'}`}>
                      {tx.amount !== null ? `$${tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      {tx.transaction_type ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tx.transaction_type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {tx.transaction_type}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600">
                      {tx.balance !== null ? `$${tx.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      {tx.is_nsf && <span className="text-xs font-bold text-red-600">NSF</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {transactions.length > 50 && (
              <p className="px-4 py-3 text-xs text-slate-500 border-t border-slate-100">
                Showing first 50 of {transactions.length} transactions
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
