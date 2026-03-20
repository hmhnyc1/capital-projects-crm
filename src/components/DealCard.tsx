import Link from 'next/link'
import { Deal } from '@/types'
import Badge from '@/components/ui/Badge'
import { format } from 'date-fns'
import { DollarSign, Calendar, User } from 'lucide-react'

interface DealCardProps {
  deal: Deal
}

export default function DealCard({ deal }: DealCardProps) {
  return (
    <Link href={`/deals/${deal.id}`}>
      <div className="bg-bg-secondary rounded-lg border border-border p-4 hover:border-accent-primary hover:shadow-lg hover:shadow-accent-primary/10 transition-smooth cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h4 className="font-semibold text-text-primary text-sm leading-tight flex-1">{deal.title}</h4>
          <Badge variant="info">{deal.stage || 'Active'}</Badge>
        </div>

        <div className="space-y-2 text-xs">
          {deal.contacts && (
            <div className="flex items-center gap-1.5 text-text-secondary">
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">
                {deal.contacts.first_name} {deal.contacts.last_name}
                {deal.contacts.company && ` · ${deal.contacts.company}`}
              </span>
            </div>
          )}

          {deal.value !== null && deal.value !== undefined && (
            <div className="flex items-center gap-1.5 text-text-primary font-medium font-mono">
              <DollarSign className="w-3.5 h-3.5 flex-shrink-0 text-success" />
              <span>${Number(deal.value).toLocaleString()}</span>
            </div>
          )}

          {deal.expected_close_date && (
            <div className="flex items-center gap-1.5 text-text-muted">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{format(new Date(deal.expected_close_date), 'MMM d, yyyy')}</span>
            </div>
          )}
        </div>

        {deal.probability !== null && deal.probability !== undefined && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-text-muted mb-1">
              <span>Probability</span>
              <span className="font-medium text-text-secondary font-mono">{deal.probability}%</span>
            </div>
            <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-primary rounded-full transition-all"
                style={{ width: `${deal.probability}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </Link>
  )
}
