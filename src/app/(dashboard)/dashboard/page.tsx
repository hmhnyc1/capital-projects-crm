import { createClient } from '@/lib/supabase/server'
import StatCard from '@/components/StatCard'
import ActivityItem from '@/components/ActivityItem'
import { Users, Briefcase, DollarSign, TrendingUp, BarChart3, CreditCard } from 'lucide-react'
import { DealStage, Activity } from '@/types'
import Link from 'next/link'

const STAGES: DealStage[] = ['Prospecting', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']

const stageColors: Record<DealStage, string> = {
  'Prospecting': 'bg-text-muted',
  'Qualified': 'bg-accent-primary',
  'Proposal': 'bg-warning',
  'Negotiation': 'bg-accent-secondary',
  'Closed Won': 'bg-success',
  'Closed Lost': 'bg-danger',
}

export default async function DashboardPage() {
  const supabase = createClient()

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const [
    { count: contactCount },
    { count: dealCount },
    { data: deals },
    { data: recentActivities },
    { data: activeDeals },
    { data: monthlyPayments },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('deals').select('*', { count: 'exact', head: true }),
    supabase.from('deals').select('value, stage'),
    supabase
      .from('activities')
      .select('*, contacts(first_name, last_name, company)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('deals')
      .select('remaining_balance, factor_rate, mca_status, advance_amount')
      .eq('mca_status', 'active')
      .not('advance_amount', 'is', null),
    supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed')
      .gte('payment_date', startOfMonth),
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

  // MCA metrics
  const totalPortfolioBalance = (activeDeals ?? []).reduce((sum, d) => sum + (Number(d.remaining_balance) || 0), 0)
  const activeMCACount = activeDeals?.length ?? 0
  const collectionsThisMonth = (monthlyPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0)
  const avgFactorRate = activeMCACount > 0
    ? (activeDeals ?? []).reduce((sum, d) => sum + (Number(d.factor_rate) || 0), 0) / activeMCACount
    : 0

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-muted text-sm mt-0.5">Your CRM and MCA portfolio at a glance</p>
      </div>

      {/* CRM Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Merchants"
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

      {/* MCA Portfolio Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-accent-primary to-accent-secondary rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 opacity-80" />
            <span className="text-xs font-medium opacity-80 uppercase tracking-wide">Portfolio Balance</span>
          </div>
          <p className="text-2xl font-bold font-mono">${totalPortfolioBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
          <Link href="/portfolio" className="text-xs opacity-70 hover:opacity-100 mt-1 block">View portfolio →</Link>
        </div>
        <div className="bg-gradient-to-br from-success to-success/80 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="w-4 h-4 opacity-80" />
            <span className="text-xs font-medium opacity-80 uppercase tracking-wide">Active MCAs</span>
          </div>
          <p className="text-2xl font-bold font-mono">{activeMCACount}</p>
          <p className="text-xs opacity-70 mt-1">Active advances</p>
        </div>
        <div className="bg-gradient-to-br from-accent-secondary to-accent-primary rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard className="w-4 h-4 opacity-80" />
            <span className="text-xs font-medium opacity-80 uppercase tracking-wide">Collections MTD</span>
          </div>
          <p className="text-2xl font-bold font-mono">${collectionsThisMonth.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
          <Link href="/payments" className="text-xs opacity-70 hover:opacity-100 mt-1 block">View payments →</Link>
        </div>
        <div className="bg-gradient-to-br from-warning to-warning/80 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 opacity-80" />
            <span className="text-xs font-medium opacity-80 uppercase tracking-wide">Avg Factor Rate</span>
          </div>
          <p className="text-2xl font-bold font-mono">{avgFactorRate > 0 ? avgFactorRate.toFixed(2) : '—'}</p>
          <p className="text-xs opacity-70 mt-1">Across active deals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Pipeline by Stage */}
        <div className="lg:col-span-3 bg-bg-secondary rounded-xl border border-border p-6">
          <h2 className="text-base font-semibold text-text-primary mb-5">Pipeline by Stage</h2>
          <div className="space-y-4">
            {dealsByStage.map(({ stage, count, value }) => (
              <div key={stage}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="font-medium text-text-primary">{stage}</span>
                  <div className="flex items-center gap-3 text-text-muted">
                    <span>{count} deal{count !== 1 ? 's' : ''}</span>
                    {value > 0 && <span className="text-text-secondary font-mono">${value.toLocaleString()}</span>}
                  </div>
                </div>
                <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
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
        <div className="lg:col-span-2 bg-bg-secondary rounded-xl border border-border p-6">
          <h2 className="text-base font-semibold text-text-primary mb-5">Recent Activity</h2>
          {recentActivities && recentActivities.length > 0 ? (
            <div className="space-y-3">
              {(recentActivities as Activity[]).map(activity => (
                <ActivityItem key={activity.id} activity={activity} showRelated />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-text-muted text-sm">No recent activity</p>
              <p className="text-text-muted text-xs mt-1">Activities will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
