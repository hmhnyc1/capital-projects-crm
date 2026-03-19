import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { updateDeal } from '@/app/actions/deals'

export default async function EditDealPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: deal }, { data: contacts }] = await Promise.all([
    supabase.from('deals').select('*').eq('id', params.id).single(),
    supabase.from('contacts').select('id, first_name, last_name, company').order('first_name'),
  ])

  if (!deal) notFound()

  const updateWithId = updateDeal.bind(null, params.id)

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/deals/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Deal
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Deal</h1>
        <p className="text-slate-500 text-sm mt-0.5">{deal.title}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <form action={updateWithId} className="space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1.5">
              Deal Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              defaultValue={deal.title}
              required
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="contact_id" className="block text-sm font-medium text-slate-700 mb-1.5">Contact</label>
            <select
              id="contact_id"
              name="contact_id"
              defaultValue={deal.contact_id ?? ''}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">-- No contact --</option>
              {contacts?.map(c => (
                <option key={c.id} value={c.id}>
                  {c.first_name} {c.last_name}{c.company ? ` (${c.company})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="value" className="block text-sm font-medium text-slate-700 mb-1.5">Deal Value ($)</label>
              <input
                id="value"
                name="value"
                type="number"
                min="0"
                step="0.01"
                defaultValue={deal.value ?? ''}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="probability" className="block text-sm font-medium text-slate-700 mb-1.5">Probability (%)</label>
              <input
                id="probability"
                name="probability"
                type="number"
                min="0"
                max="100"
                defaultValue={deal.probability ?? ''}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="stage" className="block text-sm font-medium text-slate-700 mb-1.5">Stage</label>
              <select
                id="stage"
                name="stage"
                defaultValue={deal.stage}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {['Prospecting', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="expected_close_date" className="block text-sm font-medium text-slate-700 mb-1.5">Expected Close</label>
              <input
                id="expected_close_date"
                name="expected_close_date"
                type="date"
                defaultValue={deal.expected_close_date ?? ''}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea
              id="description"
              name="description"
              rows={4}
              defaultValue={deal.description ?? ''}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition"
            >
              Save Changes
            </button>
            <Link href={`/deals/${params.id}`} className="text-sm text-slate-500 hover:text-slate-900 transition-colors px-4 py-2.5">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
