'use client'

import { useState } from 'react'

interface Props {
  defaults?: {
    advance_amount?: number | null
    factor_rate?: number | null
    daily_payment?: number | null
    payment_frequency?: string | null
    position?: number | null
    origination_date?: string | null
    maturity_date?: string | null
    mca_status?: string | null
    funder_name?: string | null
    iso_name?: string | null
    commission_rate?: number | null
  }
}

export default function DealFormMCAFields({ defaults }: Props) {
  const [advanceAmount, setAdvanceAmount] = useState(defaults?.advance_amount?.toString() ?? '')
  const [factorRate, setFactorRate] = useState(defaults?.factor_rate?.toString() ?? '')

  const advance = parseFloat(advanceAmount) || 0
  const factor = parseFloat(factorRate) || 0
  const paybackAmount = advance > 0 && factor > 0 ? advance * factor : null

  return (
    <div>
      <h2 className="text-base font-semibold text-slate-900 mb-4">MCA Details</h2>
      <div className="space-y-4">
        {/* Advance Amount + Factor Rate */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="advance_amount" className="block text-sm font-medium text-slate-700 mb-1.5">Advance Amount ($)</label>
            <input
              id="advance_amount"
              name="advance_amount"
              type="number"
              min="0"
              step="0.01"
              value={advanceAmount}
              onChange={e => setAdvanceAmount(e.target.value)}
              placeholder="50000.00"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="factor_rate" className="block text-sm font-medium text-slate-700 mb-1.5">Factor Rate</label>
            <input
              id="factor_rate"
              name="factor_rate"
              type="number"
              min="1"
              max="3"
              step="0.01"
              value={factorRate}
              onChange={e => setFactorRate(e.target.value)}
              placeholder="1.35"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Live Payback Preview */}
        {paybackAmount !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-sm text-blue-800 font-medium">
              ${advance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} &times; {factor.toFixed(2)} ={' '}
              <span className="font-bold text-blue-900">
                ${paybackAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} payback
              </span>
            </p>
          </div>
        )}

        {/* Daily Payment + Frequency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="daily_payment" className="block text-sm font-medium text-slate-700 mb-1.5">Daily Payment ($)</label>
            <input
              id="daily_payment"
              name="daily_payment"
              type="number"
              min="0"
              step="0.01"
              defaultValue={defaults?.daily_payment?.toString() ?? ''}
              placeholder="500.00"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="payment_frequency" className="block text-sm font-medium text-slate-700 mb-1.5">Payment Frequency</label>
            <select
              id="payment_frequency"
              name="payment_frequency"
              defaultValue={defaults?.payment_frequency ?? 'daily'}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
        </div>

        {/* Position + MCA Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="position" className="block text-sm font-medium text-slate-700 mb-1.5">Position</label>
            <select
              id="position"
              name="position"
              defaultValue={defaults?.position?.toString() ?? '1'}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="1">1st Position</option>
              <option value="2">2nd Position</option>
              <option value="3">3rd Position</option>
              <option value="4">4th Position</option>
            </select>
          </div>
          <div>
            <label htmlFor="mca_status" className="block text-sm font-medium text-slate-700 mb-1.5">MCA Status</label>
            <select
              id="mca_status"
              name="mca_status"
              defaultValue={defaults?.mca_status ?? 'active'}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="active">Active</option>
              <option value="paid_off">Paid Off</option>
              <option value="defaulted">Defaulted</option>
              <option value="renewed">Renewed</option>
            </select>
          </div>
        </div>

        {/* Origination + Maturity Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="origination_date" className="block text-sm font-medium text-slate-700 mb-1.5">Origination Date</label>
            <input
              id="origination_date"
              name="origination_date"
              type="date"
              defaultValue={defaults?.origination_date ?? ''}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="maturity_date" className="block text-sm font-medium text-slate-700 mb-1.5">Maturity Date</label>
            <input
              id="maturity_date"
              name="maturity_date"
              type="date"
              defaultValue={defaults?.maturity_date ?? ''}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Funder + ISO */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="funder_name" className="block text-sm font-medium text-slate-700 mb-1.5">Funder Name</label>
            <input
              id="funder_name"
              name="funder_name"
              type="text"
              defaultValue={defaults?.funder_name ?? ''}
              placeholder="e.g. Rapid Finance"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="iso_name" className="block text-sm font-medium text-slate-700 mb-1.5">ISO Name</label>
            <input
              id="iso_name"
              name="iso_name"
              type="text"
              defaultValue={defaults?.iso_name ?? ''}
              placeholder="e.g. ABC Brokers"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Commission Rate */}
        <div>
          <label htmlFor="commission_rate" className="block text-sm font-medium text-slate-700 mb-1.5">Commission Rate</label>
          <input
            id="commission_rate"
            name="commission_rate"
            type="number"
            min="0"
            max="1"
            step="0.0001"
            defaultValue={defaults?.commission_rate?.toString() ?? ''}
            placeholder="e.g. 0.05 for 5%"
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-slate-500 mt-0.5">Enter as decimal (0.05 = 5%)</p>
        </div>
      </div>
    </div>
  )
}
