import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DealCard from '@/components/DealCard'
import { Plus, Briefcase } from 'lucide-react'
import { DealStage, Deal } from '@/types'

const STAGES: DealStage[] = ['Prospecting', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']

const stageConfig: Record<DealStage, { color: string; headerColor: string; accentColor: string }> = {
  'Prospecting': { color: 'border-text-muted', headerColor: 'bg-bg-tertiary text-text-secondary', accentColor: 'text-text-muted' },
  'Qualified': { color: 'border-accent-primary', headerColor: 'bg-accent-primary bg-opacity-10 text-accent-primary', accentColor: 'text-accent-primary' },
  'Proposal': { color: 'border-warning', headerColor: 'bg-warning bg-opacity-10 text-warning', accentColor: 'text-warning' },
  'Negotiation': { color: 'border-accent-secondary', headerColor: 'bg-accent-secondary bg-opacity-10 text-accent-secondary', accentColor: 'text-accent-secondary' },
  'Closed Won': { color: 'border-success', headerColor: 'bg-success bg-opacity-10 text-success', accentColor: 'text-success' },
  'Closed Lost': { color: 'border-danger', headerColor: 'bg-danger bg-opacity-10 text-danger', accentColor: 'text-danger' },
}

export default async function DealsPage() {
  const supabase = createClient()

  const { data: deals, error } = await supabase
    .from('deals')
    .select('*, contacts!deals_merchant_id_fkey(first_name, last_name, company)')
    .order('created_at', { ascending: false })

  const dealsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = (deals as Deal[] ?? []).filter(d => d.stage === stage)
    return acc
  }, {} as Record<DealStage, Deal[]>)

  const totalValue = (deals as Deal[] ?? []).reduce((sum, d) => sum + (Number(d.value) || 0), 0)

  return (
    <div className="p-6 max-w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Deals Pipeline</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {deals?.length ?? 0} deals · Total value: <span className="font-mono text-text-secondary">${totalValue.toLocaleString()}</span>
          </p>
        </div>
        <Link
          href="/deals/new"
          className="inline-flex items-center gap-2 bg-accent-primary hover:bg-opacity-90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-smooth"
        >
          <Plus className="w-4 h-4" />
          New Deal
        </Link>
      </div>

      {error ? (
        <div className="p-8 text-center text-danger">Error loading deals: {error.message}</div>
      ) : (
        <div className="overflow-x-auto -mx-6 px-6">
          <div className="flex gap-4 min-w-max pb-4">
            {STAGES.map(stage => {
              const stageDeals = dealsByStage[stage] ?? []
              const stageValue = stageDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0)
              const config = stageConfig[stage]

              return (
                <div
                  key={stage}
                  className={`w-72 flex-shrink-0 flex flex-col rounded-xl border-2 ${config.color} bg-bg-secondary`}
                >
                  {/* Column header */}
                  <div className={`px-4 py-3 rounded-t-xl ${config.headerColor}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{stage}</h3>
                      <span className="text-xs font-bold bg-bg-secondary bg-opacity-60 px-2 py-0.5 rounded-full">
                        {stageDeals.length}
                      </span>
                    </div>
                    {stageValue > 0 && (
                      <p className="text-xs mt-0.5 opacity-70 font-mono">${stageValue.toLocaleString()}</p>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="flex-1 p-3 space-y-3 min-h-[200px]">
                    {stageDeals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-24 text-center">
                        <Briefcase className="w-6 h-6 text-text-muted mb-1" />
                        <p className="text-xs text-text-muted">No deals</p>
                      </div>
                    ) : (
                      stageDeals.map(deal => (
                        <DealCard key={deal.id} deal={deal} />
                      ))
                    )}
                  </div>

                  {/* Add button */}
                  <div className="p-3 pt-0">
                    <Link
                      href={`/deals/new?stage=${encodeURIComponent(stage)}`}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-text-muted hover:text-text-secondary hover:bg-bg-tertiary py-2 rounded-lg transition-smooth border border-dashed border-border hover:border-accent-primary"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add deal
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
