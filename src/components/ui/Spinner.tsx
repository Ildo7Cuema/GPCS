import { clsx } from 'clsx'

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

export default function Spinner({ size = 'md', className }: SpinnerProps) {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    }

    return (
        <div
            className={clsx(
                'animate-spin rounded-full border-2 border-gray-600 border-t-blue-500',
                sizes[size],
                className
            )}
        />
    )
}

interface LoadingScreenProps {
    message?: string
}

export function LoadingScreen({ message = 'A carregar...' }: LoadingScreenProps) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
            <Spinner size="lg" />
            <p className="text-gray-500 text-sm animate-pulse font-medium">{message}</p>
        </div>
    )
}
