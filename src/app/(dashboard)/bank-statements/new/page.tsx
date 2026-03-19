import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BankStatementUploadForm from './BankStatementUploadForm'

export default async function NewBankStatementPage() {
  const supabase = createClient()

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, first_name, last_name, company')
    .order('first_name')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/bank-statements"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Bank Statements
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Upload Bank Statement</h1>
        <p className="text-slate-500 text-sm mt-0.5">Upload a PDF bank statement — Claude AI will extract all data, identify MCA debits, and flag risk indicators automatically</p>
      </div>

      <BankStatementUploadForm contacts={contacts ?? []} />
    </div>
  )
}
