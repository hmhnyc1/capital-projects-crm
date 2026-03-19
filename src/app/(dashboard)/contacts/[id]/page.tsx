import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Edit, Mail, Phone, Building2, MapPin, Calendar, Tag } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import ActivityItem from '@/components/ActivityItem'
import DealCard from '@/components/DealCard'
import { format } from 'date-fns'
import { Activity, Deal } from '@/types'
import DeleteContactButton from './DeleteContactButton'

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: contact }, { data: deals }, { data: activities }] = await Promise.all([
    supabase.from('contacts').select('*').eq('id', params.id).single(),
    supabase.from('deals').select('*, contacts!deals_contact_id_fkey(first_name, last_name, company)').eq('contact_id', params.id).order('created_at', { ascending: false }),
    supabase.from('activities').select('*, contacts(first_name, last_name, company)').eq('contact_id', params.id).order('created_at', { ascending: false }),
  ])

  if (!contact) notFound()

  const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
    active: 'success',
    qualified: 'info',
    inactive: 'default',
    unqualified: 'danger',
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Contacts
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xl font-bold">
                {contact.first_name[0]}{contact.last_name[0]}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {contact.first_name} {contact.last_name}
              </h1>
              {(contact.title || contact.company) && (
                <p className="text-slate-500 mt-0.5">
                  {contact.title}{contact.title && contact.company ? ' at ' : ''}{contact.company}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={contact.type === 'lead' ? 'warning' : 'info'}>
                  {contact.type === 'lead' ? 'Lead' : 'Contact'}
                </Badge>
                <Badge variant={statusVariant[contact.status] || 'default'}>
                  {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DeleteContactButton id={contact.id} name={`${contact.first_name} ${contact.last_name}`} />
            <Link
              href={`/contacts/${contact.id}/edit`}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
            >
              <Edit className="w-4 h-4" />
              Edit
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">Contact Info</h2>
            <div className="space-y-3">
              {contact.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a href={`mailto:${contact.email}`} className="text-sm text-blue-600 hover:underline truncate">
                    {contact.email}
                  </a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <a href={`tel:${contact.phone}`} className="text-sm text-slate-700">{contact.phone}</a>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-3">
                  <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700">{contact.company}</span>
                </div>
              )}
              {(contact.city || contact.state) && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700">
                    {[contact.address, contact.city, contact.state, contact.zip].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {contact.source && (
                <div className="flex items-center gap-3">
                  <Tag className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <span className="text-sm text-slate-700">Source: {contact.source}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-500">
                  Added {format(new Date(contact.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>

          {contact.notes && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-3">Notes</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{contact.notes}</p>
            </div>
          )}
        </div>

        {/* Deals & Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deals */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                Deals ({deals?.length ?? 0})
              </h2>
              <Link
                href={`/deals/new?contact_id=${contact.id}`}
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                + New Deal
              </Link>
            </div>
            {deals && deals.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(deals as Deal[]).map(deal => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 py-4 text-center">No deals linked yet</p>
            )}
          </div>

          {/* Activity */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                Activity ({activities?.length ?? 0})
              </h2>
              <Link
                href={`/activities?contact_id=${contact.id}`}
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
              <p className="text-sm text-slate-400 py-4 text-center">No activities logged yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
