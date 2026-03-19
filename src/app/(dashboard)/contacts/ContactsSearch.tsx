'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { useCallback, useState } from 'react'

interface Props {
  initialQ?: string
  initialType?: string
}

export default function ContactsSearch({ initialQ = '', initialType = '' }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [q, setQ] = useState(initialQ)
  const [type, setType] = useState(initialType)

  const updateSearch = useCallback((newQ: string, newType: string) => {
    const params = new URLSearchParams()
    if (newQ) params.set('q', newQ)
    if (newType) params.set('type', newType)
    const queryString = params.toString()
    router.push(queryString ? `${pathname}?${queryString}` : pathname)
  }, [router, pathname])

  function handleQChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQ(val)
    updateSearch(val, type)
  }

  function handleTypeChange(newType: string) {
    const val = type === newType ? '' : newType
    setType(val)
    updateSearch(q, val)
  }

  function clearSearch() {
    setQ('')
    setType('')
    router.push(pathname)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={q}
          onChange={handleQChange}
          placeholder="Search contacts..."
          className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {q && (
          <button onClick={() => { setQ(''); updateSearch('', type) }} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Filter:</span>
        {['lead', 'contact'].map(t => (
          <button
            key={t}
            onClick={() => handleTypeChange(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              type === t
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
        {(q || type) && (
          <button
            onClick={clearSearch}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
