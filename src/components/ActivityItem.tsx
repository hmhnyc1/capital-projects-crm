import { Activity, ActivityType } from '@/types'
import { format } from 'date-fns'
import { MessageSquare, Phone, Mail, Calendar, CheckSquare } from 'lucide-react'
import clsx from 'clsx'

const activityConfig: Record<ActivityType, { icon: React.ElementType; color: string; bg: string }> = {
  note: { icon: MessageSquare, color: 'text-slate-600', bg: 'bg-slate-100' },
  call: { icon: Phone, color: 'text-green-600', bg: 'bg-green-100' },
  email: { icon: Mail, color: 'text-blue-600', bg: 'bg-blue-100' },
  meeting: { icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' },
  task: { icon: CheckSquare, color: 'text-orange-600', bg: 'bg-orange-100' },
}

interface ActivityItemProps {
  activity: Activity
  showRelated?: boolean
}

export default function ActivityItem({ activity, showRelated = false }: ActivityItemProps) {
  const config = activityConfig[activity.type]
  const Icon = config.icon

  return (
    <div className="flex gap-3">
      <div className={clsx('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', config.bg)}>
        <Icon className={clsx('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-900">{activity.title}</p>
            {activity.content && (
              <p className="text-sm text-slate-500 mt-0.5 line-clamp-2">{activity.content}</p>
            )}
            {showRelated && activity.contacts && (
              <p className="text-xs text-slate-400 mt-1">
                {activity.contacts.first_name} {activity.contacts.last_name}
                {activity.contacts.company && ` · ${activity.contacts.company}`}
              </p>
            )}
          </div>
          <span className="text-xs text-slate-400 flex-shrink-0 mt-0.5">
            {format(new Date(activity.created_at), 'MMM d, h:mm a')}
          </span>
        </div>
        {activity.type === 'task' && (
          <span className={clsx(
            'inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium',
            activity.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          )}>
            {activity.completed ? 'Completed' : 'Pending'}
          </span>
        )}
      </div>
    </div>
  )
}
