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
      <span className="text-sm text-text-muted">Filter:</span>
      {TYPES.map(t => (
        <button
          key={t}
          onClick={() => setType(t)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-smooth capitalize ${
            activeType === t
              ? 'bg-accent-primary text-white'
              : 'bg-bg-tertiary border border-border text-text-secondary hover:text-text-primary'
          }`}
        >
          {t}
        </button>
      ))}
      {activeType && (
        <button
          onClick={() => router.push(pathname)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium text-text-muted hover:text-text-secondary hover:bg-bg-tertiary transition-smooth flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}
    </div>
  )
}
