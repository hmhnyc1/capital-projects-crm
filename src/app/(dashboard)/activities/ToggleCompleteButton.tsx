'use client'

import { toggleActivityComplete } from '@/app/actions/activities'
import { CheckCircle, Circle } from 'lucide-react'
import { useTransition } from 'react'

interface Props {
  id: string
  completed: boolean
}

export default function ToggleCompleteButton({ id, completed }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      await toggleActivityComplete(id, completed)
    })
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className="flex-shrink-0 text-slate-400 hover:text-blue-600 transition-colors disabled:opacity-50"
      title={completed ? 'Mark incomplete' : 'Mark complete'}
    >
      {completed ? (
        <CheckCircle className="w-5 h-5 text-green-500" />
      ) : (
        <Circle className="w-5 h-5" />
      )}
    </button>
  )
}
