import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Filter, Grid, List, Image, Video, FileText, Music, X, Loader2, MapPin, Building2 } from 'lucide-react'
import { clsx } from 'clsx'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import MediaCard from '../../components/media/MediaCard'
import Modal from '../../components/ui/Modal'
import { SkeletonMediaGrid } from '../../components/ui/Skeleton'

import { getMediaFiles, deleteMediaFile, updateMediaFile, getMunicipios, getDireccoesProvinciais } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast' // Import UseToast
import Input from '../../components/ui/Input' // Import Input
import { rolePermissions } from '../../lib/types'
import type { MediaFile, Municipio, MediaType, DireccaoProvincial, SourceType } from '../../lib/types'

// Lazy load heavy modal components
const MediaUpload = lazy(() => import('../../components/media/MediaUpload'))
const MediaViewer = lazy(() => import('../../components/media/MediaViewer'))

const ITEMS_PER_PAGE = 24

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}

export default function MediaPage() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [files, setFiles] = useState<MediaFile[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [municipios, setMunicipios] = useState<Municipio[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingMore, setLoadingMore] = useState(false)
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [showUpload, setShowUpload] = useState(false)
    const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null)
    const [fileToDelete, setFileToDelete] = useState<MediaFile | null>(null)
    const [fileToEdit, setFileToEdit] = useState<MediaFile | null>(null)
    const [editTitle, setEditTitle] = useState('')
    const [editDescription, setEditDescription] = useState('')
    const [savingEdit, setSavingEdit] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [showFilters, setShowFilters] = useState(false)

    const toast = useToast()

    // Filters
    const [search, setSearch] = useState(searchParams.get('search') || '')
    const [fileType, setFileType] = useState<MediaType | 'all'>('all')
    const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceType | 'all'>('all')
    const [municipioFilter, setMunicipioFilter] = useState('')
    const [direccaoFilter, setDireccaoFilter] = useState('')
    const [direccoes, setDireccoes] = useState<DireccaoProvincial[]>([])

    // Debounce search to prevent excessive API calls
    const debouncedSearch = useDebounce(search, 300)

    const { user, profile } = useAuth()
    const permissions = profile?.role ? rolePermissions[profile.role] : rolePermissions.leitor

    // Initial data load
    useEffect(() => {
        loadInitialData()
    }, [])

    useEffect(() => {
        // Apply search from URL
        const urlSearch = searchParams.get('search')
        if (urlSearch) {
            setSearch(urlSearch)
        }
    }, [searchParams])

    // Refetch when filters change (debounced search)
    useEffect(() => {
        loadFiles()
    }, [debouncedSearch, fileType, sourceTypeFilter, municipioFilter, direccaoFilter])

    const loadInitialData = async () => {
        try {
            const [filesResponse, municipiosData, direccoesData] = await Promise.all([
                getMediaFiles({ limit: ITEMS_PER_PAGE }),
                getMunicipios(),
                getDireccoesProvinciais(),
            ])
            setFiles(filesResponse.data)
            setTotalCount(filesResponse.count)
            setMunicipios(municipiosData)
            setDireccoes(direccoesData)
        } catch (err) {
            console.error('Error loading data:', err)
        } finally {
            setLoading(false)
        }
    }

    const loadFiles = useCallback(async () => {
        if (loading) return

        setLoading(true)
        try {
            const response = await getMediaFiles({
                search: debouncedSearch || undefined,
                file_type: fileType === 'all' ? undefined : fileType,
                source_type: sourceTypeFilter === 'all' ? undefined : sourceTypeFilter,
                municipio_id: sourceTypeFilter !== 'provincial' ? (municipioFilter || undefined) : undefined,
                direccao_provincial_id: sourceTypeFilter !== 'municipio' ? (direccaoFilter || undefined) : undefined,
                limit: ITEMS_PER_PAGE,
                offset: 0,
            })
            setFiles(response.data)
            setTotalCount(response.count)
        } catch (err) {
            console.error('Error loading files:', err)
        } finally {
            setLoading(false)
        }
    }, [debouncedSearch, fileType, sourceTypeFilter, municipioFilter, direccaoFilter, loading])

    const loadMore = async () => {
        if (loadingMore || files.length >= totalCount) return

        setLoadingMore(true)
        try {
            const response = await getMediaFiles({
                search: debouncedSearch || undefined,
                file_type: fileType === 'all' ? undefined : fileType,
                source_type: sourceTypeFilter === 'all' ? undefined : sourceTypeFilter,
                municipio_id: sourceTypeFilter !== 'provincial' ? (municipioFilter || undefined) : undefined,
                direccao_provincial_id: sourceTypeFilter !== 'municipio' ? (direccaoFilter || undefined) : undefined,
                limit: ITEMS_PER_PAGE,
                offset: files.length,
            })
            setFiles(prev => [...prev, ...response.data])
        } catch (err) {
            console.error('Error loading more files:', err)
        } finally {
            setLoadingMore(false)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setSearchParams(search ? { search } : {})
    }

    const clearFilters = () => {
        setSearch('')
        setFileType('all')
        setSourceTypeFilter('all')
        setMunicipioFilter('')
        setDireccaoFilter('')
        setSearchParams({})
    }

    const hasActiveFilters = search || fileType !== 'all' || sourceTypeFilter !== 'all' || municipioFilter || direccaoFilter
    const hasMoreItems = files.length < totalCount

    const handleDelete = async () => {
        if (!fileToDelete || !user) return

        setDeleting(true)
        try {
            await deleteMediaFile(fileToDelete.id, fileToDelete.file_path, user.id)
            setFiles(files.filter(f => f.id !== fileToDelete.id))
            setTotalCount(prev => prev - 1)
            setFileToDelete(null)
            toast.success('Ficheiro eliminado', 'O ficheiro foi removido com sucesso.')
        } catch (err) {
            console.error('Error deleting file:', err)
            toast.error('Erro ao eliminar', 'Não foi possível eliminar o ficheiro.')
        } finally {
            setDeleting(false)
        }
    }

    const handleEditClick = (file: MediaFile) => {
        setFileToEdit(file)
        setEditTitle(file.title)
        setEditDescription(file.description || '')
    }

    const handleSaveEdit = async () => {
        if (!fileToEdit) return
        setSavingEdit(true)
        try {
            const updated = await updateMediaFile(fileToEdit.id, {
                title: editTitle,
                description: editDescription || undefined
            })
            // Update in local state
            setFiles(prev => prev.map(f => f.id === updated.id ? {
                ...f, ...updated,
                // Preserve joined fields that aren't returned by update
                municipio: f.municipio,
                area: f.area,
                direccao_provincial: f.direccao_provincial,
                departamento_provincial: f.departamento_provincial
            } : f))
            setFileToEdit(null)
            toast.success('Média actualizado', 'Alterações guardadas com sucesso.')
        } catch (err) {
            console.error('Error updating file:', err)
            toast.error('Erro ao actualizar', 'Não foi possível guardar as alterações.')
        } finally {
            setSavingEdit(false)
        }
    }

    const handleUploadSuccess = useCallback(() => {
        // Reload files after successful upload
        loadFiles()
    }, [loadFiles])

    const canDeleteFile = (file: MediaFile) => {
        if (!permissions.canDelete) return false
        if (profile?.role === 'superadmin') return true
        return file.uploaded_by === user?.id
    }

    // Permission check for downloads
    const canDownload = profile?.role === 'superadmin'

    const fileTypeFilters = [
        { value: 'all', label: 'Todos', icon: Grid },
        { value: 'image', label: 'Imagens', icon: Image },
        { value: 'video', label: 'Vídeos', icon: Video },
        { value: 'audio', label: 'Áudios', icon: Music },
        { value: 'document', label: 'Documentos', icon: FileText },
    ]

    if (loading && files.length === 0) {
        return (
            <DashboardLayout>
                <Header
                    title="Media"
                    subtitle="A carregar..."
                    showUploadButton={permissions.canUpload}
                    onUploadClick={() => setShowUpload(true)}
                />
                <div className="p-6">
                    <SkeletonMediaGrid count={8} />
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <Header
                title="Media"
                subtitle={`${totalCount} ficheiros`}
                showUploadButton={permissions.canUpload}
                onUploadClick={() => setShowUpload(true)}
            />

            <div className="p-6 space-y-6">
                {/* Search & Filters Bar */}
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Search */}
                    <form onSubmit={handleSearch} className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Pesquisar ficheiros..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                            />
                        </div>
                    </form>

                    {/* Filter Toggle */}
                    <div className="flex gap-2">
                        <Button
                            variant={showFilters ? 'primary' : 'secondary'}
                            onClick={() => setShowFilters(!showFilters)}
                            icon={<Filter className="w-4 h-4" />}
                        >
                            Filtros
                            {hasActiveFilters && (
                                <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 rounded-full">
                                    {[search, fileType !== 'all', municipioFilter].filter(Boolean).length}
                                </span>
                            )}
                        </Button>

                        {/* View Mode Toggle */}
                        <div className="flex bg-gray-800 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={clsx(
                                    'p-2 rounded-md transition-colors',
                                    viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                                )}
                            >
                                <Grid className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={clsx(
                                    'p-2 rounded-md transition-colors',
                                    viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
                                )}
                            >
                                <List className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <Card className="animate-fade-in">
                        <div className="space-y-4">
                            {/* File Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Tipo de Ficheiro</label>
                                <div className="flex flex-wrap gap-2">
                                    {fileTypeFilters.map((filter) => {
                                        const Icon = filter.icon
                                        return (
                                            <button
                                                key={filter.value}
                                                onClick={() => setFileType(filter.value as MediaType | 'all')}
                                                className={clsx(
                                                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                                                    fileType === filter.value
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                                )}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {filter.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Source Type Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Fonte</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSourceTypeFilter('all')}
                                        className={clsx(
                                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                                            sourceTypeFilter === 'all'
                                                ? 'bg-gray-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        )}
                                    >
                                        Todos
                                    </button>
                                    <button
                                        onClick={() => setSourceTypeFilter('municipio')}
                                        className={clsx(
                                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                                            sourceTypeFilter === 'municipio'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        )}
                                    >
                                        <MapPin className="w-4 h-4" />
                                        Municipal
                                    </button>
                                    <button
                                        onClick={() => setSourceTypeFilter('provincial')}
                                        className={clsx(
                                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                                            sourceTypeFilter === 'provincial'
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        )}
                                    >
                                        <Building2 className="w-4 h-4" />
                                        Provincial
                                    </button>
                                </div>
                            </div>

                            {/* Conditional Filters Row */}
                            <div className="flex flex-wrap gap-4 items-end">
                                {/* Municipality - show when not provincial only */}
                                {sourceTypeFilter !== 'provincial' && (
                                    <div className="w-48">
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Município</label>
                                        <select
                                            value={municipioFilter}
                                            onChange={(e) => setMunicipioFilter(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                        >
                                            <option value="">Todos</option>
                                            {municipios.map((m) => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Direcção Provincial - show when not municipio only */}
                                {sourceTypeFilter !== 'municipio' && (
                                    <div className="w-64">
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Direcção Provincial</label>
                                        <select
                                            value={direccaoFilter}
                                            onChange={(e) => setDireccaoFilter(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg bg-gray-700 border border-gray-600 text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                        >
                                            <option value="">Todas</option>
                                            {direccoes.map((d) => (
                                                <option key={d.id} value={d.id}>
                                                    {d.abbreviation ? `${d.abbreviation} - ${d.name}` : d.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Clear Filters */}
                                {hasActiveFilters && (
                                    <Button variant="ghost" onClick={clearFilters} icon={<X className="w-4 h-4" />}>
                                        Limpar
                                    </Button>
                                )}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Files Grid/List */}
                {files.length === 0 ? (
                    <Card className="text-center py-12">
                        <Image className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-white mb-2">Nenhum ficheiro encontrado</h3>
                        <p className="text-gray-400 mb-4">
                            {hasActiveFilters
                                ? 'Tente ajustar os filtros de pesquisa'
                                : 'Comece por carregar o seu primeiro ficheiro'}
                        </p>
                        {permissions.canUpload && !hasActiveFilters && (
                            <Button onClick={() => setShowUpload(true)}>
                                Carregar Ficheiro
                            </Button>
                        )}
                    </Card>
                ) : (
                    <>
                        <div className={clsx(
                            viewMode === 'grid'
                                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                                : 'space-y-2'
                        )}>
                            {files.map((file) => (
                                <MediaCard
                                    key={file.id}
                                    file={file}
                                    onView={setSelectedFile}
                                    onDelete={canDeleteFile(file) ? setFileToDelete : undefined}
                                    onEdit={canDeleteFile(file) ? handleEditClick : undefined} // Using canDelete permissions for edit too
                                    canDelete={canDeleteFile(file)}
                                    canEdit={canDeleteFile(file)}
                                    canDownload={canDownload}
                                />
                            ))}
                        </div>

                        {/* Load More Button */}
                        {hasMoreItems && (
                            <div className="flex justify-center pt-4">
                                <Button
                                    variant="secondary"
                                    onClick={loadMore}
                                    loading={loadingMore}
                                    icon={loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
                                >
                                    {loadingMore ? 'A carregar...' : `Carregar mais (${files.length} de ${totalCount})`}
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Upload Modal - Lazy loaded */}
            <Suspense fallback={null}>
                {showUpload && (
                    <MediaUpload
                        isOpen={showUpload}
                        onClose={() => setShowUpload(false)}
                        onSuccess={handleUploadSuccess}
                    />
                )}
            </Suspense>

            {/* Media Viewer - Lazy loaded */}
            <Suspense fallback={null}>
                {selectedFile && (
                    <MediaViewer
                        file={selectedFile}
                        onClose={() => setSelectedFile(null)}
                        canDownload={canDownload}
                    />
                )}
            </Suspense>

            {/* Delete Confirmation */}
            <Modal
                isOpen={!!fileToDelete}
                onClose={() => setFileToDelete(null)}
                title="Eliminar Ficheiro"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Tem a certeza que deseja eliminar <span className="text-white font-medium">{fileToDelete?.title}</span>?
                    </p>
                    <p className="text-sm text-gray-400">
                        Esta acção não pode ser revertida.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setFileToDelete(null)}
                            className="flex-1"
                            disabled={deleting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDelete}
                            className="flex-1"
                            loading={deleting}
                        >
                            Eliminar
                        </Button>
                    </div>
                </div>

            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={!!fileToEdit}
                onClose={() => setFileToEdit(null)}
                title="Editar Ficheiro"
                size="md"
            >
                <div className="space-y-4">
                    <Input
                        label="Título"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Título do ficheiro"
                    />
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Descrição
                        </label>
                        <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Descrição opcional..."
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-600 transition-all duration-200 resize-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="secondary"
                            onClick={() => setFileToEdit(null)}
                            className="flex-1"
                            disabled={savingEdit}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            className="flex-1"
                            loading={savingEdit}
                            disabled={!editTitle.trim()}
                        >
                            Guardar
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout >
    )
}
