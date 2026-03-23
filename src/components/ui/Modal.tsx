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

            {/* Modal */}
            <div
                className={clsx(
                    'relative w-full shadow-2xl',
                    'border-t sm:border',
                    'rounded-t-2xl sm:rounded-2xl',
                    'animate-scale-in flex flex-col',
                    'max-h-[85vh] sm:max-h-[90vh]',
                    'h-auto',
                    'safe-area-inset-bottom',
                    sizes[size]
                )}
                style={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    color: '#1e293b',
                }}
            >
                {/* Header */}
                {(title || showClose) && (
                    <div
                        className="flex items-center justify-between px-4 sm:px-6 py-4 flex-shrink-0 border-b"
                        style={{ borderColor: '#e2e8f0' }}
                    >
                        {title && (
                            <h2 className="text-lg font-semibold text-slate-800 pr-4">{title}</h2>
                        )}
                        {/* Spacer to push close button right when no title */}
                        {!title && <div />}
                        {showClose && (
                            <button
                                onClick={onClose}
                                className="p-2 -mr-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors touch-target"
                                aria-label="Fechar"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                )}

                {/* Content - scrollable quando o conteúdo ultrapassa o limite */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
                    {children}
                </div>
            </div>
        </div>
    )
}
