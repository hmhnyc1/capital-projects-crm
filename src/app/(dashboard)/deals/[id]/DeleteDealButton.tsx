'use client'

import { deleteDeal } from '@/app/actions/deals'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

interface Props {
  id: string
  title: string
}

export default function DeleteDealButton({ id, title }: Props) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">Delete this deal?</span>
        <form action={deleteDeal.bind(null, id)}>
          <button
            type="submit"
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-3 py-2 rounded-lg transition"
          >
            Confirm
          </button>
        </form>
        <button
          onClick={() => setConfirming(false)}
          className="text-sm text-slate-500 hover:text-slate-900 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-2 border border-slate-300 hover:border-red-300 hover:text-red-600 text-slate-600 text-sm font-medium px-3 py-2 rounded-lg transition"
    >
      <Trash2 className="w-4 h-4" />
      Delete
    </button>
  )
}
