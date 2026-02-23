import type { ReactNode } from 'react'
import { clsx } from 'clsx'

interface BadgeProps {
    children: ReactNode
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
    size?: 'sm' | 'md'
    className?: string
}

export default function Badge({
    children,
    variant = 'default',
    size = 'md',
    className
}: BadgeProps) {
    const variants = {
        default: 'bg-gray-700/50 text-gray-300',
        primary: 'bg-blue-500/20 text-blue-300',
        success: 'bg-emerald-500/20 text-emerald-300',
        warning: 'bg-amber-500/20 text-amber-300',
        error: 'bg-red-500/20 text-red-300',
        info: 'bg-cyan-500/20 text-cyan-300',
    }

    // Mobile-friendly sizing with adequate padding
    const sizes = {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-xs sm:text-xs',
    }

    return (
        <span
            className={clsx(
                'inline-flex items-center font-medium rounded-full',
                variants[variant],
                sizes[size],
                className
            )}
        >
            {children}
        </span>
    )
}

// Role-specific badge
export function RoleBadge({ role }: { role: string }) {
    const roleConfig: Record<string, { variant: BadgeProps['variant']; label: string }> = {
        superadmin: { variant: 'error', label: 'Super Admin' },
        admin_municipal: { variant: 'warning', label: 'Admin Municipal' },
        tecnico: { variant: 'primary', label: 'Técnico' },
        leitor: { variant: 'default', label: 'Leitor' },
        direccao_provincial: { variant: 'info', label: 'Direção Provincial' },
        departamento_comunicacao: { variant: 'info', label: 'Dep. Comunicação' },
    }

    const config = roleConfig[role] || { variant: 'default', label: role }

    return <Badge variant={config.variant}>{config.label}</Badge>
}

// File type badge
export function FileTypeBadge({ type }: { type: string }) {
    const typeConfig: Record<string, { variant: BadgeProps['variant']; label: string }> = {
        image: { variant: 'success', label: 'Imagem' },
        video: { variant: 'warning', label: 'Vídeo' },
        audio: { variant: 'info', label: 'Áudio' },
        document: { variant: 'primary', label: 'Documento' },
    }

    const config = typeConfig[type] || { variant: 'default', label: type }

    return <Badge variant={config.variant}>{config.label}</Badge>
}
