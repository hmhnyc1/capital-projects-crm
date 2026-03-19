'use client'

import { deleteBankStatement } from '@/app/actions/bank-statements'
import { Trash2 } from 'lucide-react'

interface Props {
  id: string
  fileName: string
}

export default function DeleteStatementButton({ id, fileName }: Props) {
  const handleDelete = async () => {
    if (!confirm(`Delete statement "${fileName}"? This will also delete all associated transactions.`)) return
    await deleteBankStatement(id)
  }

  return (
    <button
      onClick={handleDelete}
      className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-lg transition border border-red-200"
    >
      <Trash2 className="w-4 h-4" />
      Delete
    </button>
  )
}
