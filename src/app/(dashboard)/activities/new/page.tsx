import { createClient } from '@/lib/supabase/server'
import { createActivity } from '@/app/actions/activities'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface SearchParams {
  contact_id?: string
  deal_id?: string
}

export default async function NewActivityPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()

  const [{ data: contacts }, { data: deals }] = await Promise.all([
    supabase.from('contacts').select('id, first_name, last_name, company').order('first_name'),
    supabase.from('deals').select('id, title').order('created_at', { ascending: false }),
  ])

  const defaultContactId = searchParams.contact_id || ''
  const defaultDealId = searchParams.deal_id || ''

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/activities"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Activities
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Log Activity</h1>
        <p className="text-slate-500 text-sm mt-0.5">Record a call, note, meeting, or task</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <form action={createActivity} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1.5">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                id="type"
                name="type"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="note">Note</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="meeting">Meeting</option>
                <option value="task">Task</option>
              </select>
            </div>
            <div>
              <label htmlFor="due_date" className="block text-sm font-medium text-slate-700 mb-1.5">Due Date</label>
              <input
                id="due_date"
                name="due_date"
                type="datetime-local"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1.5">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Follow up call with John"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-1.5">Notes / Content</label>
            <textarea
              id="content"
              name="content"
              rows={4}
              placeholder="Add details, notes, or summary..."
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact_id" className="block text-sm font-medium text-slate-700 mb-1.5">Contact</label>
              <select
                id="contact_id"
                name="contact_id"
                defaultValue={defaultContactId}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- None --</option>
                {contacts?.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}{c.company ? ` (${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="deal_id" className="block text-sm font-medium text-slate-700 mb-1.5">Deal</label>
              <select
                id="deal_id"
                name="deal_id"
                defaultValue={defaultDealId}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- None --</option>
                {deals?.map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-6 py-2.5 rounded-lg transition"
            >
              Log Activity
            </button>
            <Link href="/activities" className="text-sm text-slate-500 hover:text-slate-900 transition-colors px-4 py-2.5">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
