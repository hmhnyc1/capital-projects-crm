import clsx from 'clsx'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'
  className?: string
}

export default function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        {
          'bg-bg-tertiary text-text-secondary': variant === 'default',
          'bg-success bg-opacity-10 text-success': variant === 'success',
          'bg-warning bg-opacity-10 text-warning': variant === 'warning',
          'bg-danger bg-opacity-10 text-danger': variant === 'danger',
          'bg-accent-primary bg-opacity-10 text-accent-primary': variant === 'info',
          'bg-accent-secondary bg-opacity-10 text-accent-secondary': variant === 'purple',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
