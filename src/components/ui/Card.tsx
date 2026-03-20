import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
}

export default function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-bg-secondary rounded-xl border border-border',
        padding && 'p-6',
        className
      )}
    >
      {children}
    </div>
  )
}
