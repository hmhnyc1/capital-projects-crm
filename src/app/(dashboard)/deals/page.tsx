import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import DealCard from '@/components/DealCard'
import { Plus, Briefcase } from 'lucide-react'
import { DealStage, Deal } from '@/types'

const STAGES: DealStage[] = ['Prospecting', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']

const stageConfig: Record<DealStage, { color: string; headerColor: string }> = {
  'Prospecting': { color: 'border-slate-300', headerColor: 'bg-slate-100 text-slate-700' },
  'Qualified': { color: 'border-blue-300', headerColor: 'bg-blue-50 text-blue-700' },
  'Proposal': { color: 'border-yellow-300', headerColor: 'bg-yellow-50 text-yellow-700' },
  'Negotiation': { color: 'border-orange-300', headerColor: 'bg-orange-50 text-orange-700' },
  'Closed Won': { color: 'border-green-300', headerColor: 'bg-green-50 text-green-700' },
  'Closed Lost': { color: 'border-red-300', headerColor: 'bg-red-50 text-red-700' },
}

export default async function DealsPage() {
  const supabase = createClient()

  const { data: deals, error } = await supabase
    .from('deals')
    .select('*, contacts(first_name, last_name, company)')
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
          <h1 className="text-2xl font-bold text-slate-900">Deals Pipeline</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {deals?.length ?? 0} deals · Total value: ${totalValue.toLocaleString()}
          </p>
        </div>
        <Link
          href="/deals/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          New Deal
        </Link>
      </div>

      {error ? (
        <div className="p-8 text-center text-red-600">Error loading deals: {error.message}</div>
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
                  className={`w-72 flex-shrink-0 flex flex-col rounded-xl border-2 ${config.color} bg-slate-50`}
                >
                  {/* Column header */}
                  <div className={`px-4 py-3 rounded-t-xl ${config.headerColor}`}>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{stage}</h3>
                      <span className="text-xs font-bold bg-white bg-opacity-60 px-2 py-0.5 rounded-full">
                        {stageDeals.length}
                      </span>
                    </div>
                    {stageValue > 0 && (
                      <p className="text-xs mt-0.5 opacity-70">${stageValue.toLocaleString()}</p>
                    )}
                  </div>

                  {/* Cards */}
                  <div className="flex-1 p-3 space-y-3 min-h-[200px]">
                    {stageDeals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-24 text-center">
                        <Briefcase className="w-6 h-6 text-slate-300 mb-1" />
                        <p className="text-xs text-slate-400">No deals</p>
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
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 hover:bg-white py-2 rounded-lg transition border border-dashed border-slate-300 hover:border-slate-400"
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
