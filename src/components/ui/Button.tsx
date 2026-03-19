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
          'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed gap-2',
          {
            'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500': variant === 'primary',
            'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 focus:ring-slate-400': variant === 'secondary',
            'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500': variant === 'danger',
            'hover:bg-slate-100 text-slate-600 focus:ring-slate-400': variant === 'ghost',
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
