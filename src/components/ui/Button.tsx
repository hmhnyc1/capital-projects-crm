import clsx from 'clsx'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          'inline-flex items-center justify-center font-medium rounded-lg transition-smooth focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed gap-2',
          {
            'bg-accent-primary hover:bg-opacity-90 text-white hover:shadow-lg hover:shadow-accent-primary/25': variant === 'primary',
            'bg-transparent border border-border hover:bg-bg-tertiary text-text-secondary hover:text-text-primary': variant === 'secondary',
            'bg-danger hover:bg-opacity-90 text-white hover:shadow-lg hover:shadow-danger/25': variant === 'danger',
            'hover:bg-bg-tertiary text-text-secondary hover:text-text-primary': variant === 'ghost',
          },
          {
            'text-xs px-2.5 py-1.5': size === 'sm',
            'text-sm px-4 py-2': size === 'md',
            'text-base px-5 py-2.5': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
export default Button
