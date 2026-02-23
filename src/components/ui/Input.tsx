import { forwardRef, type InputHTMLAttributes } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    helperText?: string
    icon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, helperText, icon, id, ...props }, ref) => {
        const inputId = id || label?.toLowerCase().replace(/\s/g, '-')

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-gray-300 mb-2"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        className={clsx(
                            // Base styles with mobile-first sizing (min-h-44px, 16px font to prevent iOS zoom)
                            'w-full px-4 py-3 rounded-lg bg-gray-800/50 border text-white placeholder-gray-400 transition-all duration-200',
                            'min-h-[44px] text-base sm:text-sm',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                            icon && 'pl-11',
                            error
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-gray-700 hover:border-gray-600 focus:border-blue-500',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-red-400">{error}</p>
                )}
                {helperText && !error && (
                    <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'

export default Input
