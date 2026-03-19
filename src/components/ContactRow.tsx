import Link from 'next/link'
import { Contact } from '@/types'
import Badge from '@/components/ui/Badge'
import { format } from 'date-fns'

interface ContactRowProps {
  contact: Contact
}

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  qualified: 'info',
  inactive: 'default',
  unqualified: 'danger',
}

export default function ContactRow({ contact }: ContactRowProps) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4">
        <Link href={`/contacts/${contact.id}`} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {contact.first_name[0]}{contact.last_name[0]}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900 group-hover:text-blue-600 transition-colors">
              {contact.first_name} {contact.last_name}
            </p>
            {contact.title && <p className="text-xs text-slate-500">{contact.title}</p>}
          </div>
        </Link>
      </td>
      <td className="px-6 py-4 text-sm text-slate-600">{contact.company || '—'}</td>
      <td className="px-6 py-4 text-sm text-slate-600">
        {contact.email ? (
          <a href={`mailto:${contact.email}`} className="hover:text-blue-600 transition-colors">
            {contact.email}
          </a>
        ) : '—'}
      </td>
      <td className="px-6 py-4 text-sm text-slate-600">{contact.phone || '—'}</td>
      <td className="px-6 py-4">
        <Badge variant={contact.type === 'lead' ? 'warning' : 'info'}>
          {contact.type === 'lead' ? 'Lead' : 'Contact'}
        </Badge>
      </td>
      <td className="px-6 py-4">
        <Badge variant={statusVariant[contact.status] || 'default'}>
          {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
        </Badge>
      </td>
      <td className="px-6 py-4 text-sm text-slate-500">
        {format(new Date(contact.created_at), 'MMM d, yyyy')}
      </td>
    </tr>
  )
}
