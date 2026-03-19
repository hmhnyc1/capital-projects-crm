import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import NewPaymentForm from './NewPaymentForm'

export default async function NewPaymentPage() {
  const supabase = createClient()

  const { data: rawDeals } = await supabase
    .from('deals')
    .select('id, title, daily_payment, mca_status, contacts!deals_merchant_id_fkey(first_name, last_name, company)')
    .not('advance_amount', 'is', null)
    .order('title')

  const today = new Date().toISOString().split('T')[0]

  // Normalize contacts (Supabase can return array or object depending on join)
  const deals = (rawDeals ?? []).map((d: Record<string, unknown>) => {
    const contactsRaw = d.contacts
    let contact: { first_name: string; last_name: string; company: string | null } | null = null
    if (Array.isArray(contactsRaw) && contactsRaw.length > 0) {
      contact = contactsRaw[0] as { first_name: string; last_name: string; company: string | null }
    } else if (contactsRaw && !Array.isArray(contactsRaw)) {
      contact = contactsRaw as { first_name: string; last_name: string; company: string | null }
    }
    return {
      id: d.id as string,
      title: d.title as string,
      daily_payment: d.daily_payment as number | null,
      mca_status: d.mca_status as string | null,
      contacts: contact,
    }
  })

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          href="/payments"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Payments
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Record Payment</h1>
        <p className="text-slate-500 text-sm mt-0.5">Log an ACH or other payment against an MCA deal</p>
      </div>

      <NewPaymentForm deals={deals} today={today} />
    </div>
  )
}
