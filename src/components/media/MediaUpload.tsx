import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, Image, Video, Music, Check, Loader2, Building2, MapPin } from 'lucide-react'
import { clsx } from 'clsx'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Modal from '../ui/Modal'
import { uploadMediaFile, getMunicipios, getAreas, getGovernoProvincial, getDireccoesProvinciais, getDepartamentosProvinciais } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { compressImage } from '../../lib/compression'
import { useToast } from '../ui/Toast'
import type { Municipio, Area, DireccaoProvincial, DepartamentoProvincial, GovernoProvincial, SourceType } from '../../lib/types'

interface MediaUploadProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

interface FileWithStatus {
    file: File
    id: string
    status: 'pending' | 'compressing' | 'uploading' | 'success' | 'error'
    progress: number
    error?: string
    compressedSize?: number
}

export default function MediaUpload({ isOpen, onClose, onSuccess }: MediaUploadProps) {
    const [files, setFiles] = useState<FileWithStatus[]>([])
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')

    // Source type toggle
    const [sourceType, setSourceType] = useState<SourceType>('municipio')

    // Municipal fields
    const [municipioId, setMunicipioId] = useState('')
    const [areaId, setAreaId] = useState('')
    const [municipios, setMunicipios] = useState<Municipio[]>([])
    const [areas, setAreas] = useState<Area[]>([])

    // Provincial fields
    const [governoProvincial, setGovernoProvincial] = useState<GovernoProvincial | null>(null)
    const [direccaoId, setDireccaoId] = useState('')
    const [departamentoId, setDepartamentoId] = useState('')
    const [direccoes, setDireccoes] = useState<DireccaoProvincial[]>([])
    const [departamentos, setDepartamentos] = useState<DepartamentoProvincial[]>([])

    const [uploading, setUploading] = useState(false)
    const { user, profile } = useAuth()
    const toast = useToast()

    useEffect(() => {
        if (isOpen) {
            loadMunicipios()
            loadProvincialData()
        }
    }, [isOpen])

    useEffect(() => {
        if (municipioId && sourceType === 'municipio') {
            loadAreas(municipioId)
        } else {
            setAreas([])
            setAreaId('')
        }
    }, [municipioId, sourceType])

    useEffect(() => {
        if (direccaoId && sourceType === 'provincial') {
            loadDepartamentos(direccaoId)
        } else {
            setDepartamentos([])
            setDepartamentoId('')
        }
    }, [direccaoId, sourceType])

    const loadMunicipios = async () => {
        try {
            const data = await getMunicipios()
            setMunicipios(data)

            if (profile?.municipio_id) {
                setMunicipioId(profile.municipio_id)
            }
        } catch (err) {
            console.error('Error loading municipios:', err)
        }
    }

    const loadAreas = async (munId: string) => {
        try {
            const data = await getAreas(munId)
            setAreas(data)
        } catch (err) {
            console.error('Error loading areas:', err)
        }
    }

    const loadProvincialData = async () => {
        try {
            const [governo, direccoesData] = await Promise.all([
                getGovernoProvincial(),
                getDireccoesProvinciais()
            ])
            setGovernoProvincial(governo)
            setDireccoes(direccoesData)
        } catch (err) {
            console.error('Error loading provincial data:', err)
        }
    }

    const loadDepartamentos = async (dirId: string) => {
        try {
            const data = await getDepartamentosProvinciais(dirId)
            setDepartamentos(data)
        } catch (err) {
            console.error('Error loading departamentos:', err)
        }
    }

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = acceptedFiles.map(file => ({
            file,
            id: Math.random().toString(36).substring(7),
            status: 'pending' as const,
            progress: 0
        }))

        setFiles(prev => [...prev, ...newFiles])

        // Auto-set title from first file if empty
        if (!title && newFiles.length > 0) {
            const nameWithoutExt = newFiles[0].file.name.replace(/\.[^/.]+$/, '')
            setTitle(nameWithoutExt)
        }
    }, [title])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: true,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
            'video/*': ['.mp4', '.mov', '.avi', '.webm'],
            'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'],
            'application/pdf': ['.pdf'],
            'application/msword': ['.doc'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
        },
    })

    const getFileIcon = (file: File) => {
        if (file.type.startsWith('image/')) return <Image className="w-8 h-8 text-emerald-400" />
        if (file.type.startsWith('video/')) return <Video className="w-8 h-8 text-amber-400" />
        if (file.type.startsWith('audio/')) return <Music className="w-8 h-8 text-purple-400" />
        return <FileText className="w-8 h-8 text-blue-400" />
    }

    const formatSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id))
    }

    const updateFileStatus = (id: string, updates: Partial<FileWithStatus>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f))
    }

    const handleSubmit = async () => {
        if (files.length === 0 || !title || !user) return

        setUploading(true)

        try {
            // Process files sequentially to avoid overwhelming bandwidth/memory
            for (const fileItem of files) {
                if (fileItem.status === 'success') continue

                try {
                    // 1. Compression
                    let fileToUpload = fileItem.file
                    if (fileItem.file.type.startsWith('image/')) {
                        updateFileStatus(fileItem.id, { status: 'compressing' })
                        fileToUpload = await compressImage(fileItem.file)
                        updateFileStatus(fileItem.id, {
                            compressedSize: fileToUpload.size
                        })
                    }

                    // 2. Upload
                    updateFileStatus(fileItem.id, { status: 'uploading', progress: 0 })

                    // Construct unique title for multi-upload
                    const fileTitle = files.length > 1
                        ? `${title} - ${fileItem.file.name}`
                        : title

                    await uploadMediaFile(
                        fileToUpload,
                        fileTitle,
                        description || null,
                        sourceType === 'municipio' ? municipioId || null : null,
                        sourceType === 'municipio' ? areaId || null : null,
                        user.id,
                        sourceType === 'provincial' ? {
                            sourceType: 'provincial',
                            governoProvincialId: governoProvincial?.id || null,
                            direccaoProvincialId: direccaoId || null,
                            departamentoProvincialId: departamentoId || null
                        } : undefined
                    )

                    updateFileStatus(fileItem.id, { status: 'success', progress: 100 })
                } catch (err) {
                    console.error(`Error uploading ${fileItem.file.name}:`, err)
                    updateFileStatus(fileItem.id, {
                        status: 'error',
                        error: err instanceof Error ? err.message : 'Upload falhou'
                    })
                }
            }

            // Simple success toast if at least one file uploaded
            if (files.length > 0) {
                toast.success(
                    'Upload concluído',
                    `${files.length} ficheiro(s) processado(s).`
                )
                setTimeout(() => {
                    onSuccess()
                    handleClose()
                }, 1000)
            }

        } catch (error) {
            toast.error('Erro no upload', 'Ocorreu um erro inesperado.')
        } finally {
            setUploading(false)
        }
    }

    const handleClose = () => {
        if (!uploading) {
            setFiles([])
            setTitle('')
            setDescription('')
            setSourceType('municipio')
            setMunicipioId('')
            setAreaId('')
            setDireccaoId('')
            setDepartamentoId('')
            onClose()
        }
    }

    const totalSize = files.reduce((acc, f) => acc + f.file.size, 0)
    const totalCompressedSize = files.reduce((acc, f) => acc + (f.compressedSize || f.file.size), 0)
    const compressionRatio = totalSize > 0 ? ((1 - totalCompressedSize / totalSize) * 100).toFixed(0) : '0'

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Carregar Ficheiros" size="lg">
            <div className="space-y-5">
                {/* Dropzone */}
                <div
                    {...getRootProps()}
                    className={clsx(
                        'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200',
                        isDragActive
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800/30'
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-3">
                        <Upload className="w-10 h-10 text-gray-500" />
                        <div>
                            <p className="text-gray-300">Arraste ficheiros ou clique para seleccionar</p>
                            <p className="text-sm text-gray-500 mt-1">Imagens serão comprimidas automaticamente</p>
                        </div>
                    </div>
                </div>

                {/* File List */}
                {files.length > 0 && (
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                        {files.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg border border-gray-700/50">
                                {getFileIcon(item.file)}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{item.file.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span>{formatSize(item.file.size)}</span>
                                        {item.compressedSize && (
                                            <span className="text-emerald-400">
                                                → {formatSize(item.compressedSize)}
                                            </span>
                                        )}
                                        {item.status === 'compressing' && <span className="text-blue-400">• A comprimir...</span>}
                                        {item.status === 'uploading' && <span className="text-blue-400">• A enviar...</span>}
                                        {item.error && <span className="text-red-400">• {item.error}</span>}
                                    </div>
                                </div>

                                {item.status === 'success' ? (
                                    <Check className="w-5 h-5 text-emerald-400" />
                                ) : item.status === 'uploading' || item.status === 'compressing' ? (
                                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                ) : (
                                    <button
                                        onClick={() => removeFile(item.id)}
                                        className="text-gray-500 hover:text-red-400 transition-colors"
                                        disabled={uploading}
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Stats */}
                {files.length > 0 && files.some(f => f.compressedSize) && (
                    <div className="text-sm text-gray-400 text-right">
                        Poupança estimada: <span className="text-emerald-400">{compressionRatio}%</span>
                    </div>
                )}

                <div className="space-y-4 pt-4 border-t border-gray-700/50">
                    <Input
                        label="Título (Prefixo)"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Evento de Natal"
                        required
                    />

                    {/* Source Type Toggle */}
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Fonte do Ficheiro
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setSourceType('municipio')}
                                className={clsx(
                                    'flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all duration-200',
                                    sourceType === 'municipio'
                                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                                )}
                            >
                                <MapPin className="w-5 h-5" />
                                <span className="font-medium">Município</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSourceType('provincial')}
                                className={clsx(
                                    'flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all duration-200',
                                    sourceType === 'provincial'
                                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                        : 'border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600'
                                )}
                            >
                                <Building2 className="w-5 h-5" />
                                <span className="font-medium">Provincial</span>
                            </button>
                        </div>
                    </div>

                    {/* Municipal Fields */}
                    {sourceType === 'municipio' && (
                        <div className="grid grid-cols-2 gap-4 animate-fade-in">
                            <div className="w-full">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Município
                                </label>
                                <select
                                    value={municipioId}
                                    onChange={(e) => setMunicipioId(e.target.value)}
                                    className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-600 transition-all duration-200"
                                >
                                    <option value="">Seleccione...</option>
                                    {municipios.map((m) => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-full">
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Área
                                </label>
                                <select
                                    value={areaId}
                                    onChange={(e) => setAreaId(e.target.value)}
                                    disabled={!municipioId}
                                    className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-600 transition-all duration-200 disabled:opacity-50"
                                >
                                    <option value="">Seleccione...</option>
                                    {areas.map((a) => (
                                        <option key={a.id} value={a.id}>{a.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Provincial Fields */}
                    {sourceType === 'provincial' && (
                        <div className="space-y-4 animate-fade-in">
                            {/* Governo Provincial Info */}


                            <div className="grid grid-cols-2 gap-4">
                                <div className="w-full">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Direcção Provincial
                                    </label>
                                    <select
                                        value={direccaoId}
                                        onChange={(e) => setDireccaoId(e.target.value)}
                                        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-gray-600 transition-all duration-200"
                                    >
                                        <option value="">Seleccione...</option>
                                        {direccoes.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.abbreviation ? `${d.abbreviation} - ${d.name}` : d.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-full">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Departamento
                                    </label>
                                    <select
                                        value={departamentoId}
                                        onChange={(e) => setDepartamentoId(e.target.value)}
                                        disabled={!direccaoId}
                                        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-gray-600 transition-all duration-200 disabled:opacity-50"
                                    >
                                        <option value="">Seleccione...</option>
                                        {departamentos.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Descrição
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Descrição opcional..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-600 transition-all duration-200 resize-none"
                        />
                    </div>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button variant="secondary" onClick={handleClose} className="flex-1" disabled={uploading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        className="flex-1"
                        disabled={files.length === 0 || !title || uploading}
                        loading={uploading}
                    >
                        {uploading ? `A processar ${files.filter(f => f.status === 'success').length}/${files.length}` : 'Carregar Ficheiros'}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
