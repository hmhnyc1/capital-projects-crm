'use client'

import { useRouter, usePathname } from 'next/navigation'
import { X } from 'lucide-react'

const TYPES = ['note', 'call', 'email', 'meeting', 'task']

interface Props {
  activeType?: string
}

export default function ActivitiesFilter({ activeType }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function setType(type: string) {
    if (type === activeType) {
      router.push(pathname)
    } else {
      router.push(`${pathname}?type=${type}`)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm text-slate-500">Filter:</span>
      {TYPES.map(t => (
        <button
          key={t}
          onClick={() => setType(t)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
            activeType === t
              ? 'bg-blue-600 text-white'
              : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
          }`}
        >
          {t}
        </button>
      ))}
      {activeType && (
        <button
          onClick={() => router.push(pathname)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  )
}
