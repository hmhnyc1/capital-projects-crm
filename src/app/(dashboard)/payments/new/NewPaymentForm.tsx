'use client'

import { useState } from 'react'
import { createPayment } from '@/app/actions/payments'
import Link from 'next/link'

interface DealOption {
  id: string
  title: string
  daily_payment: number | null
  mca_status: string | null
  contacts: { first_name: string; last_name: string; company: string | null } | null
}

interface Props {
  deals: DealOption[]
  today: string
}

export default function NewPaymentForm({ deals, today }: Props) {
  const [selectedDealId, setSelectedDealId] = useState('')
  const [amount, setAmount] = useState('')

  const selectedDeal = deals.find(d => d.id === selectedDealId)

  const handleDealChange = (dealId: string) => {
    setSelectedDealId(dealId)
    const deal = deals.find(d => d.id === dealId)
    if (deal?.daily_payment) {
      setAmount(Number(deal.daily_payment).toFixed(2))
    } else {
      setAmount('')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <form action={createPayment} className="space-y-5">
        <div>
          <label htmlFor="deal_id" className="block text-sm font-medium text-slate-700 mb-1.5">
            Deal <span className="text-red-500">*</span>
          </label>
          <select
            id="deal_id"
            name="deal_id"
            required
            value={selectedDealId}
            onChange={e => handleDealChange(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">-- Select a deal --</option>
            {deals.map(deal => {
              const contact = deal.contacts
              const label = `${deal.title}${contact ? ` (${contact.first_name} ${contact.last_name}${contact.company ? ' · ' + contact.company : ''})` : ''}`
              return (
                <option key={deal.id} value={deal.id}>
                  {label}{deal.mca_status ? ` [${deal.mca_status}]` : ''}
                </option>
              )
            })}
          </select>
          {selectedDeal && selectedDeal.daily_payment && (
            <p className="text-xs text-slate-500 mt-1">
              Daily payment: ${Number(selectedDeal.daily_payment).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1.5">
              Amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="payment_date" className="block text-sm font-medium text-slate-700 mb-1.5">
              Date <span className="text-red-500">*</span>
            </label>
            <input
              id="payment_date"
              name="payment_date"
              type="date"
              required
              defaultValue={today}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
            <select
              id="status"
              name="status"
              defaultValue="completed"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="completed">Completed</option>
              <option value="scheduled">Scheduled</option>
              <option value="failed">Failed</option>
              <option value="returned">Returned</option>
              <option value="nsf">NSF</option>
            </select>
          </div>

          <div>
            <label htmlFor="payment_type" className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
            <select
              id="payment_type"
              name="payment_type"
              defaultValue="ach"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ach">ACH</option>
              <option value="wire">Wire</option>
              <option value="check">Check</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Optional notes about this payment..."
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition"
          >
            Record Payment
          </button>
          <Link href="/payments" className="text-sm text-slate-500 hover:text-slate-900 transition-colors px-4 py-2.5">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
