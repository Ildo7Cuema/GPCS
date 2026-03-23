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
                        className="block text-sm font-medium text-slate-700 mb-2"
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
                            // Mobile-first sizing (min-h-44px, 16px font to prevent iOS zoom)
                            'w-full px-4 py-3 rounded-lg text-slate-800 placeholder-slate-400 transition-all duration-200',
                            'min-h-[44px] text-base sm:text-sm',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                            icon && 'pl-11',
                            error
                                ? 'border-red-500 focus:border-red-500'
                                : 'border-slate-300 hover:border-slate-400 focus:border-blue-500',
                            className
                        )}
                        style={{
                            backgroundColor: '#ffffff',
                            border: error ? '1px solid #ef4444' : '1px solid #cbd5e1',
                        }}
                        {...props}
                    />
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-red-600">{error}</p>
                )}
                {helperText && !error && (
                    <p className="mt-1.5 text-sm text-slate-500">{helperText}</p>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'

export default Input
