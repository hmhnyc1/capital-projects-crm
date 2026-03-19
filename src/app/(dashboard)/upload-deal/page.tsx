import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import DealUploadForm from './DealUploadForm'

export default function UploadDealPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/deals" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />
          Back to Deals
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Upload New Deal</h1>
          <p className="text-slate-500 text-sm mt-1">Upload application + bank statements. We&apos;ll extract everything automatically.</p>
        </div>
        <DealUploadForm />
      </div>
    </div>
  )
}
