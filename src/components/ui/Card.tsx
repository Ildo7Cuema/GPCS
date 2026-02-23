import type { ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps {
    children: ReactNode
    className?: string
    hover?: boolean
    padding?: 'none' | 'sm' | 'md' | 'lg'
}

export default function Card({ children, className, hover = true, padding = 'md' }: CardProps) {
    // Responsive padding: smaller on mobile
    const paddingStyles = {
        none: '',
        sm: 'p-3 sm:p-4',
        md: 'p-4 sm:p-6',
        lg: 'p-5 sm:p-8',
    }

    return (
        <div
            className={clsx(
                'rounded-xl bg-white dark:bg-gray-800/40 backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 shadow-sm',
                'transition-all duration-200',
                // Hover for desktop, active for mobile touch
                hover && 'hover:border-gray-300 dark:hover:border-gray-600/50 hover:shadow-md dark:hover:bg-gray-800/60 active:bg-gray-50 dark:active:bg-gray-800/70',
                paddingStyles[padding],
                className
            )}
        >
            {children}
        </div>
    )
}

interface CardHeaderProps {
    children: ReactNode
    className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
    return (
        <div className={clsx('mb-4', className)}>
            {children}
        </div>
    )
}

interface CardTitleProps {
    children: ReactNode
    className?: string
}

export function CardTitle({ children, className }: CardTitleProps) {
    return (
        <h3 className={clsx('text-lg font-semibold text-gray-900 dark:text-white', className)}>
            {children}
        </h3>
    )
}

interface CardDescriptionProps {
    children: ReactNode
    className?: string
}

export function CardDescription({ children, className }: CardDescriptionProps) {
    return (
        <p className={clsx('text-sm text-gray-500 dark:text-gray-400 mt-1', className)}>
            {children}
        </p>
    )
}

interface CardContentProps {
    children: ReactNode
    className?: string
}

export function CardContent({ children, className }: CardContentProps) {
    return (
        <div className={clsx('', className)}>
            {children}
        </div>
    )
}

interface CardFooterProps {
    children: ReactNode
    className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
    return (
        <div className={clsx('mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50', className)}>
            {children}
        </div>
    )
}
