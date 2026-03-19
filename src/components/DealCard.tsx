import Link from 'next/link'
import { Deal } from '@/types'
import { format } from 'date-fns'
import { DollarSign, Calendar, User } from 'lucide-react'

interface DealCardProps {
  deal: Deal
}

export default function DealCard({ deal }: DealCardProps) {
  return (
    <Link href={`/deals/${deal.id}`}>
      <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
        <h4 className="font-semibold text-slate-900 text-sm leading-tight mb-3">{deal.title}</h4>

        <div className="space-y-2">
          {deal.contacts && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">
                {deal.contacts.first_name} {deal.contacts.last_name}
                {deal.contacts.company && ` · ${deal.contacts.company}`}
              </span>
            </div>
          )}

          {deal.value !== null && deal.value !== undefined && (
            <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
              <DollarSign className="w-3.5 h-3.5 flex-shrink-0 text-green-600" />
              <span>${Number(deal.value).toLocaleString()}</span>
            </div>
          )}

          {deal.expected_close_date && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{format(new Date(deal.expected_close_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {deal.probability !== null && deal.probability !== undefined && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Probability</span>
              <span className="font-medium">{deal.probability}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${deal.probability}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
