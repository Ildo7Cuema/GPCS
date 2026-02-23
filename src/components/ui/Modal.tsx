import { useEffect, type ReactNode } from 'react'
import { clsx } from 'clsx'
import { X } from 'lucide-react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title?: string
    children: ReactNode
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
    showClose?: boolean
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showClose = true
}: ModalProps) {
    // Close on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }

        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, onClose])

    if (!isOpen) return null

    // Desktop sizes - on mobile, modals adapt to content
    const sizes = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        full: 'sm:max-w-4xl',
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Modal - flexible height on mobile, adapts to content */}
            <div
                className={clsx(
                    'relative w-full bg-white dark:bg-gray-800 shadow-2xl border-t sm:border border-gray-200 dark:border-gray-700/50',
                    // Mobile: bottom-sheet style with rounded top corners
                    'rounded-t-2xl sm:rounded-2xl',
                    'animate-scale-in flex flex-col',
                    // Flexible height: min-height for content, max-height for overflow
                    // Mobile: up to 85vh to allow some space at top
                    // Desktop: up to 90vh
                    'max-h-[85vh] sm:max-h-[90vh]',
                    // Content determines height, not fixed
                    'h-auto',
                    'safe-area-inset-bottom',
                    sizes[size]
                )}
            >
                {/* Header */}
                {(title || showClose) && (
                    <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700/50 flex-shrink-0">
                        {title && (
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">{title}</h2>
                        )}
                        {/* Spacer to push close button right when no title */}
                        {!title && <div />}
                        {showClose && (
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors touch-target"
                                aria-label="Fechar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content - scrollable when content overflows */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
                    {children}
                </div>
            </div>
        </div>
    )
}
