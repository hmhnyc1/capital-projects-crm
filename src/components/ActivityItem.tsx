import { Activity, ActivityType } from '@/types'
import Badge from '@/components/ui/Badge'
import { format } from 'date-fns'
import { MessageSquare, Phone, Mail, Calendar, CheckSquare } from 'lucide-react'
import clsx from 'clsx'

const activityConfig: Record<ActivityType, { icon: React.ElementType; color: string; bg: string }> = {
  note: { icon: MessageSquare, color: 'text-text-secondary', bg: 'bg-bg-tertiary' },
  call: { icon: Phone, color: 'text-success', bg: 'bg-success bg-opacity-10' },
  email: { icon: Mail, color: 'text-accent-primary', bg: 'bg-accent-primary bg-opacity-10' },
  meeting: { icon: Calendar, color: 'text-accent-secondary', bg: 'bg-accent-secondary bg-opacity-10' },
  task: { icon: CheckSquare, color: 'text-warning', bg: 'bg-warning bg-opacity-10' },
}

interface ActivityItemProps {
  activity: Activity
  showRelated?: boolean
}

export default function ActivityItem({ activity, showRelated = false }: ActivityItemProps) {
  const config = activityConfig[activity.type]
  const Icon = config.icon

  return (
    <div className="flex gap-3 pb-3 border-b border-border last:border-b-0">
      <div className={clsx('flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center', config.bg)}>
        <Icon className={clsx('w-4 h-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-text-primary">{activity.title}</p>
            {activity.content && (
              <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">{activity.content}</p>
            )}
            {showRelated && activity.contacts && (
              <p className="text-xs text-text-muted mt-1">
                {activity.contacts.first_name} {activity.contacts.last_name}
                {activity.contacts.company && ` · ${activity.contacts.company}`}
              </p>
            )}
          </div>
          <span className="text-xs text-text-muted flex-shrink-0 mt-0.5">
            {format(new Date(activity.created_at), 'MMM d, h:mm a')}
          </span>
        </div>
        {activity.type === 'task' && (
          <div className="mt-1">
            <Badge variant={activity.completed ? 'success' : 'warning'}>
              {activity.completed ? 'Completed' : 'Pending'}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}
