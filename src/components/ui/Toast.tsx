import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import { createPortal } from 'react-dom'

export type ToastType = 'success' | 'error' | 'info' | 'loading'

export interface Toast {
    id: string
    title: string
    message?: string
    type: ToastType
    duration?: number
}

interface ToastContextType {
    show: (toast: Omit<Toast, 'id'>) => string
    dismiss: (id: string) => void
    success: (title: string, message?: string) => string
    error: (title: string, message?: string) => string
    loading: (title: string, message?: string) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider')
    }
    return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const show = (toastData: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substring(7)
        const toast = { ...toastData, id }

        setToasts((prev) => [...prev, toast])

        if (toast.duration !== 0 && toast.type !== 'loading') {
            setTimeout(() => {
                dismiss(id)
            }, toast.duration || 5000)
        }

        return id
    }

    const dismiss = (id: string) => {
        setToasts((prev) => prev.map(t => t.id === id ? { ...t, isExiting: true } : t))
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 300) // Wait for animation
    }

    const success = (title: string, message?: string) => show({ title, message, type: 'success' })
    const error = (title: string, message?: string) => show({ title, message, type: 'error' })
    const loading = (title: string, message?: string) => show({ title, message, type: 'loading', duration: 0 })

    return (
        <ToastContext.Provider value={{ show, dismiss, success, error, loading }}>
            {children}
            {createPortal(
                <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                    {toasts.map((toast) => (
                        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                    ))}
                </div>,
                document.body
            )}
        </ToastContext.Provider>
    )
}

function ToastItem({ toast, onDismiss }: { toast: Toast & { isExiting?: boolean }, onDismiss: (id: string) => void }) {
    useEffect(() => {
        // Auto-dismiss logic is handled in show()
    }, [])

    const icons = {
        success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
        error: <AlertCircle className="w-5 h-5 text-red-400" />,
        info: <Info className="w-5 h-5 text-blue-400" />,
        loading: <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
    }

    return (
        <div
            className={clsx(
                "pointer-events-auto min-w-[300px] max-w-md bg-gray-800 border border-gray-700/50 rounded-lg shadow-xl p-4 flex items-start gap-3 transition-all duration-300",
                toast.isExiting ? "opacity-0 translate-x-full" : "animate-slide-in-right opacity-100 translate-x-0"
            )}
        >
            <div className="mt-0.5">{icons[toast.type]}</div>
            <div className="flex-1">
                <h4 className="text-sm font-medium text-white">{toast.title}</h4>
                {toast.message && <p className="text-sm text-gray-400 mt-1">{toast.message}</p>}
            </div>
            <button
                onClick={() => onDismiss(toast.id)}
                className="text-gray-500 hover:text-white transition-colors"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    )
}
