import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { updateContact } from '@/app/actions/contacts'

export default async function EditContactPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: contact } = await supabase.from('contacts').select('*').eq('id', params.id).single()

  if (!contact) notFound()

  const updateWithId = updateContact.bind(null, params.id)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/contacts/${params.id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Contact
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Edit Contact</h1>
        <p className="text-slate-500 text-sm mt-0.5">{contact.first_name} {contact.last_name}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <form action={updateWithId} className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  defaultValue={contact.first_name}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  defaultValue={contact.last_name}
                  required
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={contact.email ?? ''}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={contact.phone ?? ''}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-slate-700 mb-1.5">Company</label>
                <input
                  id="company"
                  name="company"
                  type="text"
                  defaultValue={contact.company ?? ''}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
                <input
                  id="title"
                  name="title"
                  type="text"
                  defaultValue={contact.title ?? ''}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-4">Classification</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-slate-700 mb-1.5">Type</label>
                <select
                  id="type"
                  name="type"
                  defaultValue={contact.type}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="lead">Lead</option>
                  <option value="contact">Contact</option>
                </select>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                <select
                  id="status"
                  name="status"
                  defaultValue={contact.status}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="active">Active</option>
                  <option value="qualified">Qualified</option>
                  <option value="inactive">Inactive</option>
                  <option value="unqualified">Unqualified</option>
                </select>
              </div>
              <div>
                <label htmlFor="source" className="block text-sm font-medium text-slate-700 mb-1.5">Source</label>
                <input
                  id="source"
                  name="source"
                  type="text"
                  defaultValue={contact.source ?? ''}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-4">Address</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label htmlFor="address" className="block text-sm font-medium text-slate-700 mb-1.5">Street Address</label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  defaultValue={contact.address ?? ''}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-slate-700 mb-1.5">City</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  defaultValue={contact.city ?? ''}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1.5">State</label>
                  <input
                    id="state"
                    name="state"
                    type="text"
                    defaultValue={contact.state ?? ''}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="zip" className="block text-sm font-medium text-slate-700 mb-1.5">ZIP</label>
                  <input
                    id="zip"
                    name="zip"
                    type="text"
                    defaultValue={contact.zip ?? ''}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-slate-200" />

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              defaultValue={contact.notes ?? ''}
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
            <Link
              href={`/contacts/${params.id}`}
              className="text-sm text-slate-500 hover:text-slate-900 transition-colors px-4 py-2.5"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
