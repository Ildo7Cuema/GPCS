import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    icon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]'

        const variants = {
            primary: 'bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500 shadow-lg shadow-blue-600/25 hover:shadow-blue-500/40',
            secondary: 'bg-gray-700 text-white hover:bg-gray-600 focus:ring-gray-500',
            ghost: 'bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white focus:ring-gray-500',
            danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500',
            outline: 'bg-transparent border border-gray-600 text-gray-300 hover:bg-gray-800 hover:border-gray-500 focus:ring-gray-500',
        }

        // Touch-friendly sizing: all sizes have minimum 44px height
        const sizes = {
            sm: 'px-3 py-2 text-sm min-h-[44px]',
            md: 'px-4 py-2.5 text-sm min-h-[44px]',
            lg: 'px-6 py-3 text-base min-h-[48px]',
        }

        return (
            <button
                ref={ref}
                className={clsx(baseStyles, variants[variant], sizes[size], className)}
                disabled={disabled || loading}
                {...props}
            >
                {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                ) : icon ? (
                    icon
                ) : null}
                {children}
            </button>
        )
    }
)

Button.displayName = 'Button'

export default Button
