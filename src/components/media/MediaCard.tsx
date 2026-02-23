import { useState, useCallback, memo } from 'react'
import { Image, Video, FileText, Music, Download, Trash2, Eye, MapPin, Building2, Pencil } from 'lucide-react'
import { clsx } from 'clsx'
import { FileTypeBadge } from '../ui/Badge'
import { formatFileSize } from '../../lib/types'
import type { MediaFile } from '../../lib/types'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

interface MediaCardProps {
    file: MediaFile
    onView: (file: MediaFile) => void
    onDelete?: (file: MediaFile) => void
    onEdit?: (file: MediaFile) => void
    canDelete?: boolean
    canEdit?: boolean
    canDownload?: boolean
}

const MediaCard = memo(function MediaCard({ file, onView, onDelete, onEdit, canDelete, canEdit, canDownload = false }: MediaCardProps) {
    const [imageError, setImageError] = useState(false)

    const getFileIcon = useCallback(() => {
        const iconClass = "w-12 h-12"
        switch (file.file_type) {
            case 'image': return <Image className={clsx(iconClass, 'text-emerald-400')} />
            case 'video': return <Video className={clsx(iconClass, 'text-amber-400')} />
            case 'audio': return <Music className={clsx(iconClass, 'text-purple-400')} />
            default: return <FileText className={clsx(iconClass, 'text-blue-400')} />
        }
    }, [file.file_type])

    const handleDownload = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        window.open(file.file_url, '_blank')
    }, [file.file_url])

    const handleDelete = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        if (onDelete) onDelete(file)
    }, [onDelete, file])

    const handleEdit = useCallback((e: React.MouseEvent) => {
        e.stopPropagation()
        if (onEdit) onEdit(file)
    }, [onEdit, file])

    const handleView = useCallback(() => {
        onView(file)
    }, [onView, file])

    const handleImageError = useCallback(() => {
        setImageError(true)
    }, [])

    // Determine source display info
    const isProvincial = file.source_type === 'provincial'
    const hasSourceInfo = isProvincial
        ? (file.direccao_provincial || file.departamento_provincial)
        : (file.municipio || file.area)

    const getSourceLabel = () => {
        if (isProvincial) {
            const parts = []
            if (file.direccao_provincial?.abbreviation) {
                parts.push(file.direccao_provincial.abbreviation)
            } else if (file.direccao_provincial?.name) {
                parts.push(file.direccao_provincial.name)
            }
            if (file.departamento_provincial?.name) {
                parts.push(file.departamento_provincial.name)
            }
            return parts.join(' / ') || 'Governo Provincial'
        } else {
            const parts = []
            if (file.municipio?.name) parts.push(file.municipio.name)
            if (file.area?.name) parts.push(file.area.name)
            return parts.join(' / ')
        }
    }

    return (
        <div
            onClick={handleView}
            className={clsx(
                'group rounded-xl overflow-hidden cursor-pointer',
                'bg-gray-800/40 border border-gray-700/50',
                'hover:border-gray-600/50 hover:bg-gray-800/60',
                'transition-all duration-200'
            )}
        >
            {/* Thumbnail/Preview */}
            <div className="relative aspect-video bg-gray-900 flex items-center justify-center overflow-hidden">
                {file.file_type === 'image' && !imageError ? (
                    <img
                        src={file.file_url}
                        alt={file.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={handleImageError}
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        {getFileIcon()}
                    </div>
                )}

                {/* Source Type Badge */}
                {file.source_type && (
                    <div className={clsx(
                        'absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1',
                        isProvincial
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    )}>
                        {isProvincial ? <Building2 className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        {isProvincial ? 'Provincial' : 'Municipal'}
                    </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleView() }}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                    >
                        <Eye className="w-5 h-5 text-white" />
                    </button>
                    {canDownload && (
                        <button
                            onClick={handleDownload}
                            className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                        >
                            <Download className="w-5 h-5 text-white" />
                        </button>
                    )}
                    {canEdit && onEdit && (
                        <button
                            onClick={handleEdit}
                            className="p-2 bg-blue-500/30 rounded-lg hover:bg-blue-500/50 transition-colors"
                        >
                            <Pencil className="w-5 h-5 text-white" />
                        </button>
                    )}
                    {canDelete && onDelete && (
                        <button
                            onClick={handleDelete}
                            className="p-2 bg-red-500/30 rounded-lg hover:bg-red-500/50 transition-colors"
                        >
                            <Trash2 className="w-5 h-5 text-white" />
                        </button>
                    )}
                </div>
            </div>

            {/* Info */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-medium text-white truncate flex-1">
                        {file.title}
                    </h3>
                    <FileTypeBadge type={file.file_type} />
                </div>

                <p className="text-xs text-gray-400 truncate mb-2">
                    {file.description || 'Sem descrição'}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatFileSize(file.size_bytes)}</span>
                    <span>{format(new Date(file.created_at), 'dd MMM yyyy', { locale: pt })}</span>
                </div>

                {hasSourceInfo && (
                    <div className="mt-2 pt-2 border-t border-gray-700/50 flex items-center gap-1.5">
                        {isProvincial ? (
                            <Building2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        ) : (
                            <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                        )}
                        <span className={clsx(
                            'text-xs truncate',
                            isProvincial ? 'text-emerald-400' : 'text-gray-400'
                        )}>
                            {getSourceLabel()}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
})

export default MediaCard
