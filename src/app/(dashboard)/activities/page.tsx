import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Activity as ActivityIcon } from 'lucide-react'
import { Activity, ActivityType } from '@/types'
import ActivityItem from '@/components/ActivityItem'
import ActivitiesFilter from './ActivitiesFilter'
import ToggleCompleteButton from './ToggleCompleteButton'

interface SearchParams {
  type?: string
}

export default async function ActivitiesPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()
  const { type } = searchParams

  let query = supabase
    .from('activities')
    .select('*, contacts(first_name, last_name, company), deals(title)')
    .order('created_at', { ascending: false })

  if (type && ['note', 'call', 'email', 'meeting', 'task'].includes(type)) {
    query = query.eq('type', type as ActivityType)
  }

  const { data: activities, error } = await query

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activities</h1>
          <p className="text-slate-500 text-sm mt-0.5">{activities?.length ?? 0} activities</p>
        </div>
        <Link
          href="/activities/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          Log Activity
        </Link>
      </div>

      <ActivitiesFilter activeType={type} />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-red-600">Error: {error.message}</div>
        ) : !activities || activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <ActivityIcon className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No activities found</p>
            <p className="text-slate-400 text-sm mt-1">Start logging calls, notes, meetings, and more</p>
            <Link
              href="/activities/new"
              className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Log Activity
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(activities as Activity[]).map(activity => (
              <div key={activity.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-1">
                    <ActivityItem activity={activity} showRelated />
                    {activity.deals && (
                      <Link
                        href={`/deals/${activity.deal_id}`}
                        className="mt-1.5 inline-block text-xs text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        Deal: {activity.deals.title}
                      </Link>
                    )}
                  </div>
                  {activity.type === 'task' && (
                    <ToggleCompleteButton id={activity.id} completed={activity.completed} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
