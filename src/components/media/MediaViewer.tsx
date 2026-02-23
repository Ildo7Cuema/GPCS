import { X, Download, FileText, Music, Calendar, HardDrive, Building2, User } from 'lucide-react'
import { formatFileSize } from '../../lib/types'
import type { MediaFile } from '../../lib/types'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { FileTypeBadge } from '../ui/Badge'
import Button from '../ui/Button'

interface MediaViewerProps {
    file: MediaFile | null
    onClose: () => void
    canDownload?: boolean
}

export default function MediaViewer({ file, onClose, canDownload = false }: MediaViewerProps) {
    if (!file) return null

    const handleDownload = () => {
        window.open(file.file_url, '_blank')
    }

    const renderPreview = () => {
        switch (file.file_type) {
            case 'image':
                return (
                    <img
                        src={file.file_url}
                        alt={file.title}
                        className="max-w-full max-h-[60vh] object-contain rounded-lg"
                    />
                )
            case 'video':
                return (
                    <video
                        src={file.file_url}
                        controls
                        className="max-w-full max-h-[60vh] rounded-lg"
                    >
                        O seu navegador não suporta o elemento de vídeo.
                    </video>
                )
            case 'audio':
                return (
                    <div className="w-full max-w-md bg-gray-800 rounded-xl p-6">
                        <div className="flex items-center justify-center mb-4">
                            <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center">
                                <Music className="w-12 h-12 text-purple-400" />
                            </div>
                        </div>
                        <audio src={file.file_url} controls className="w-full">
                            O seu navegador não suporta o elemento de áudio.
                        </audio>
                    </div>
                )
            default:
                return (
                    <div className="flex flex-col items-center gap-4 p-8">
                        <div className="w-24 h-24 bg-blue-500/20 rounded-xl flex items-center justify-center">
                            <FileText className="w-12 h-12 text-blue-400" />
                        </div>
                        <p className="text-gray-400 text-center">
                            Pré-visualização não disponível para este tipo de ficheiro
                        </p>
                        {canDownload && (
                            <Button onClick={handleDownload} icon={<Download className="w-4 h-4" />}>
                                Descarregar Ficheiro
                            </Button>
                        )}
                    </div>
                )
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Content */}
            <div className="relative flex flex-1">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

                {/* Preview Area */}
                <div className="flex-1 flex items-center justify-center p-8">
                    {renderPreview()}
                </div>

                {/* Sidebar */}
                <div className="w-80 bg-gray-900 border-l border-gray-800 p-6 overflow-y-auto">
                    <div className="space-y-6">
                        {/* Title & Badge */}
                        <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <h2 className="text-xl font-semibold text-white">{file.title}</h2>
                            </div>
                            <FileTypeBadge type={file.file_type} />
                        </div>

                        {/* Description */}
                        {file.description && (
                            <div>
                                <h3 className="text-sm font-medium text-gray-400 mb-2">Descrição</h3>
                                <p className="text-gray-300 text-sm">{file.description}</p>
                            </div>
                        )}

                        {/* Metadata */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-medium text-gray-400">Detalhes</h3>

                            <div className="flex items-center gap-3 text-sm">
                                <HardDrive className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-300">{formatFileSize(file.size_bytes)}</span>
                            </div>

                            <div className="flex items-center gap-3 text-sm">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className="text-gray-300">
                                    {format(new Date(file.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}
                                </span>
                            </div>

                            {file.municipio && (
                                <div className="flex items-center gap-3 text-sm">
                                    <Building2 className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-300">
                                        {file.municipio.name}
                                        {file.area && ` / ${file.area.name}`}
                                    </span>
                                </div>
                            )}

                            {file.uploader && (
                                <div className="flex items-center gap-3 text-sm">
                                    <User className="w-4 h-4 text-gray-500" />
                                    <span className="text-gray-300">{file.uploader.full_name}</span>
                                </div>
                            )}

                            {file.mime_type && (
                                <div className="text-xs text-gray-500 mt-2">
                                    Tipo: {file.mime_type}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="pt-4 border-t border-gray-800">
                            {canDownload && (
                                <Button
                                    onClick={handleDownload}
                                    className="w-full"
                                    icon={<Download className="w-4 h-4" />}
                                >
                                    Descarregar
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
