import { LucideIcon } from 'lucide-react'
import clsx from 'clsx'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'blue' | 'green' | 'purple' | 'orange'
  subtitle?: string
  trend?: { value: number; direction: 'up' | 'down' }
}

export default function StatCard({ title, value, icon: Icon, color = 'blue', subtitle, trend }: StatCardProps) {
  const colorMap = {
    blue: { icon: 'text-accent-primary', iconBg: 'bg-accent-primary bg-opacity-10' },
    green: { icon: 'text-success', iconBg: 'bg-success bg-opacity-10' },
    purple: { icon: 'text-accent-secondary', iconBg: 'bg-accent-secondary bg-opacity-10' },
    orange: { icon: 'text-warning', iconBg: 'bg-warning bg-opacity-10' },
  }
  const colors = colorMap[color]

  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-muted">{title}</p>
          <p className="text-3xl font-bold text-text-primary mt-1 font-mono">{value}</p>
          {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
          {trend && (
            <p className={clsx('text-xs mt-2 flex items-center gap-1', trend.direction === 'up' ? 'text-success' : 'text-danger')}>
              <span>{trend.direction === 'up' ? '↑' : '↓'}</span>
              {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl', colors.iconBg)}>
          <Icon className={clsx('w-6 h-6', colors.icon)} />
        </div>
      </div>
    </div>
  )
}
