import { createClient } from '@/lib/supabase/server'
import StatCard from '@/components/StatCard'
import ActivityItem from '@/components/ActivityItem'
import { Users, Briefcase, DollarSign, TrendingUp } from 'lucide-react'
import { DealStage, Activity } from '@/types'

const STAGES: DealStage[] = ['Prospecting', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']

const stageColors: Record<DealStage, string> = {
  'Prospecting': 'bg-slate-400',
  'Qualified': 'bg-blue-400',
  'Proposal': 'bg-yellow-400',
  'Negotiation': 'bg-orange-400',
  'Closed Won': 'bg-green-500',
  'Closed Lost': 'bg-red-400',
}

export default async function DashboardPage() {
  const supabase = createClient()

  const [
    { count: contactCount },
    { count: dealCount },
    { data: deals },
    { data: recentActivities },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('deals').select('*', { count: 'exact', head: true }),
    supabase.from('deals').select('value, stage'),
    supabase
      .from('activities')
      .select('*, contacts(first_name, last_name, company)')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  // Calculate pipeline value (exclude closed lost)
  const pipelineValue = deals?.reduce((sum, d) => {
    if (d.stage !== 'Closed Lost') return sum + (Number(d.value) || 0)
    return sum
  }, 0) ?? 0

  // Calculate win rate
  const closedDeals = deals?.filter(d => d.stage === 'Closed Won' || d.stage === 'Closed Lost') ?? []
  const winRate = closedDeals.length > 0
    ? Math.round((closedDeals.filter(d => d.stage === 'Closed Won').length / closedDeals.length) * 100)
    : 0

  // Deals by stage
  const dealsByStage = STAGES.map(stage => ({
    stage,
    count: deals?.filter(d => d.stage === stage).length ?? 0,
    value: deals?.filter(d => d.stage === stage).reduce((s, d) => s + (Number(d.value) || 0), 0) ?? 0,
  }))
  const maxCount = Math.max(...dealsByStage.map(s => s.count), 1)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Your pipeline overview at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Contacts"
          value={contactCount ?? 0}
          icon={Users}
          color="blue"
          subtitle="Leads & contacts"
        />
        <StatCard
          title="Total Deals"
          value={dealCount ?? 0}
          icon={Briefcase}
          color="purple"
          subtitle="All stages"
        />
        <StatCard
          title="Pipeline Value"
          value={`$${pipelineValue.toLocaleString()}`}
          icon={DollarSign}
          color="green"
          subtitle="Active deals"
        />
        <StatCard
          title="Win Rate"
          value={`${winRate}%`}
          icon={TrendingUp}
          color="orange"
          subtitle={`${closedDeals.filter(d => d.stage === 'Closed Won').length} of ${closedDeals.length} closed`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Pipeline by Stage */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-5">Pipeline by Stage</h2>
          <div className="space-y-4">
            {dealsByStage.map(({ stage, count, value }) => (
              <div key={stage}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-700">{stage}</span>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span>{count} deal{count !== 1 ? 's' : ''}</span>
                    {value > 0 && <span className="text-slate-400">${value.toLocaleString()}</span>}
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${stageColors[stage]}`}
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-5">Recent Activity</h2>
          {recentActivities && recentActivities.length > 0 ? (
            <div className="space-y-4">
              {(recentActivities as Activity[]).map(activity => (
                <ActivityItem key={activity.id} activity={activity} showRelated />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-slate-400 text-sm">No recent activity</p>
              <p className="text-slate-300 text-xs mt-1">Activities will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
