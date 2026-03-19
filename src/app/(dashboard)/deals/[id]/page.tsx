import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, DollarSign, Calendar, TrendingUp, User } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import ActivityItem from '@/components/ActivityItem'
import { format } from 'date-fns'
import { Activity, DealStage } from '@/types'
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

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: deal }, { data: activities }] = await Promise.all([
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
  ])

  if (!deal) notFound()

  const stageIndex = STAGES.indexOf(deal.stage as DealStage)

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
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={stageBadgeVariant[deal.stage] || 'default'}>{deal.stage}</Badge>
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
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">Contact</h2>
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

        {/* Activity */}
        <div className="lg:col-span-2">
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
