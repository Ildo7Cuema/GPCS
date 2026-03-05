import type { ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps {
    children: ReactNode
    className?: string
    hover?: boolean
    padding?: 'none' | 'sm' | 'md' | 'lg'
}

export default function Card({ children, className, hover = true, padding = 'md' }: CardProps) {
    const paddingStyles = {
        none: '',
        sm: 'p-3 sm:p-4',
        md: 'p-4 sm:p-6',
        lg: 'p-5 sm:p-8',
    }

    return (
        <div
            className={clsx(
                'rounded-xl backdrop-blur-sm shadow-sm transition-all duration-200',
                hover && 'hover:shadow-md active:opacity-90',
                paddingStyles[padding],
                className
            )}
            style={{
                backgroundColor: 'rgba(30, 41, 59, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
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
        <h3 className={clsx('text-lg font-semibold text-white', className)}>
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
        <div
            className={clsx('mt-4 pt-4 border-t', className)}
            style={{ borderColor: 'rgba(255, 255, 255, 0.08)' }}
        >
            {children}
        </div>
    )
}
