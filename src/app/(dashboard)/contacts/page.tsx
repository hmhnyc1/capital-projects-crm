import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ContactRow from '@/components/ContactRow'
import { Plus, Users } from 'lucide-react'
import ContactsSearch from './ContactsSearch'

interface SearchParams {
  q?: string
  type?: string
}

export default async function ContactsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()
  const { q, type } = searchParams

  let query = supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false })

  if (q) {
    query = query.or(
      `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,company.ilike.%${q}%`
    )
  }

  if (type && (type === 'lead' || type === 'contact')) {
    query = query.eq('type', type)
  }

  const { data: contacts, error } = await query

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contacts</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {contacts?.length ?? 0} record{contacts?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/contacts/new"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
        >
          <Plus className="w-4 h-4" />
          New Contact
        </Link>
      </div>

      <ContactsSearch initialQ={q} initialType={type} />

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-red-600">
            <p>Error loading contacts: {error.message}</p>
          </div>
        ) : !contacts || contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">No contacts found</p>
            <p className="text-slate-400 text-sm mt-1">
              {q || type ? 'Try adjusting your search or filters' : 'Get started by creating your first contact'}
            </p>
            {!q && !type && (
              <Link
                href="/contacts/new"
                className="mt-4 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                New Contact
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Company</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Phone</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.map(contact => (
                  <ContactRow key={contact.id} contact={contact} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
