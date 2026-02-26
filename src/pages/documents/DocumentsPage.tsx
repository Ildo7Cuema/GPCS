import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
    Plus,
    Search,
    Filter,
    FileBarChart2,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Trash2,
    FileStack,
    Clock,
    ArrowDownLeft,
    ArrowUpRight,
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ReportExportModal from '../../components/ui/ReportExportModal'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { getDocuments, deleteDocument, getDocumentMovements } from '../../lib/documents'
import { getMunicipios } from '../../lib/supabase'
import type { InstitutionalDocument, DocumentFilters, DocumentMovement, Municipio } from '../../lib/types'
import { rolePermissions, documentTypeLabels, documentStatusLabels, documentDirectionLabels } from '../../lib/types'
import type { DocumentType, DocumentDirection, DocumentStatus } from '../../lib/types'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

const PAGE_SIZE = 15

export default function DocumentsPage() {
    const { profile } = useAuth()
    const toast = useToast()
    const permissions = profile?.role ? rolePermissions[profile.role] : rolePermissions.leitor

    const [documents, setDocuments] = useState<InstitutionalDocument[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [municipios, setMunicipios] = useState<Municipio[]>([])
    const [showFilters, setShowFilters] = useState(false)
    const [deleteModal, setDeleteModal] = useState<InstitutionalDocument | null>(null)
    const [timelineModal, setTimelineModal] = useState<InstitutionalDocument | null>(null)
    const [movements, setMovements] = useState<DocumentMovement[]>([])
    const [loadingMovements, setLoadingMovements] = useState(false)
    const [showExportModal, setShowExportModal] = useState(false)

    const [filters, setFilters] = useState<DocumentFilters>({
        municipio_id: permissions.scopeToMunicipio ? profile?.municipio_id || '' : '',
    })

    const loadDocuments = useCallback(async () => {
        setLoading(true)
        try {
            const { data, count } = await getDocuments({
                ...filters,
                limit: PAGE_SIZE,
                offset: page * PAGE_SIZE,
                profile,
            })
            setDocuments(data)
            setTotalCount(count)
        } catch (err) {
            console.error('Error loading documents:', err)
            toast.error('Erro ao carregar documentos')
        } finally {
            setLoading(false)
        }
    }, [filters, page, profile, toast])

    useEffect(() => {
        loadDocuments()
    }, [loadDocuments])

    useEffect(() => {
        getMunicipios().then(setMunicipios).catch(console.error)
    }, [])

    const handleDelete = async () => {
        if (!deleteModal) return
        try {
            await deleteDocument(deleteModal.id)
            toast.success('Documento eliminado com sucesso')
            setDeleteModal(null)
            loadDocuments()
        } catch (err) {
            console.error('Error deleting document:', err)
            toast.error('Erro ao eliminar documento')
        }
    }

    const openTimeline = async (doc: InstitutionalDocument) => {
        setTimelineModal(doc)
        setLoadingMovements(true)
        try {
            const data = await getDocumentMovements(doc.id)
            setMovements(data)
        } catch (err) {
            console.error('Error loading movements:', err)
        } finally {
            setLoadingMovements(false)
        }
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    const statusColor = (status: DocumentStatus) => {
        switch (status) {
            case 'em_tramitacao': return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            case 'respondido': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            case 'arquivado': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
        }
    }

    // Build report data
    const reportColumns = [
        { header: 'Protocolo', key: 'protocol_number', width: 14 },
        { header: 'Assunto', key: 'subject', width: 32 },
        { header: 'Tipo', key: 'type', width: 14 },
        { header: 'Origem', key: 'origin', width: 22 },
        { header: 'Destino', key: 'destination', width: 22 },
        { header: 'Direcção', key: 'direction', width: 12 },
        { header: 'Data', key: 'document_date', width: 12 },
        { header: 'Estado', key: 'status', width: 16 },
        { header: 'Município', key: 'municipio', width: 18 },
        { header: 'Prazo', key: 'deadline', width: 12 },
        { header: 'Observações', key: 'observations', width: 28 },
    ]

    const reportRows = documents.map(d => ({
        protocol_number: d.protocol_number,
        subject: d.subject,
        type: documentTypeLabels[d.type],
        origin: d.origin,
        destination: d.destination,
        direction: documentDirectionLabels[d.direction],
        document_date: format(new Date(d.document_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: pt }),
        status: documentStatusLabels[d.status],
        municipio: d.municipio?.name || '—',
        deadline: d.deadline ? format(new Date(d.deadline + 'T00:00:00'), 'dd/MM/yyyy', { locale: pt }) : '—',
        observations: d.observations || '—',
    }))

    const byType = documents.reduce<Record<string, number>>((acc, d) => {
        const lbl = documentTypeLabels[d.type]
        acc[lbl] = (acc[lbl] || 0) + 1
        return acc
    }, {})
    const byStatus = documents.reduce<Record<string, number>>((acc, d) => {
        const lbl = documentStatusLabels[d.status]
        acc[lbl] = (acc[lbl] || 0) + 1
        return acc
    }, {})
    const COLORS = ['#1a3a5c', '#2d6a4f', '#d62828', '#f77f00', '#4361ee', '#7209b7']

    const reportCharts = [
        ...(Object.keys(byType).length > 0 ? [{
            title: 'Documentos por Tipo',
            type: 'pie' as const,
            labels: Object.keys(byType),
            datasets: [{ label: 'Tipo', data: Object.values(byType), color: COLORS[0] }],
        }] : []),
        ...(Object.keys(byStatus).length > 0 ? [{
            title: 'Documentos por Estado',
            type: 'bar' as const,
            labels: Object.keys(byStatus),
            datasets: [{ label: 'Estado', data: Object.values(byStatus), color: '#2d6a4f' }],
            width: 600, height: 260,
        }] : []),
    ]

    const reportStats = [
        { label: 'Total', value: totalCount },
        { label: 'Recebidos', value: documents.filter(d => d.direction === 'received').length },
        { label: 'Enviados', value: documents.filter(d => d.direction === 'sent').length },
        { label: 'Em Tramitação', value: documents.filter(d => d.status === 'em_tramitacao').length },
    ]

    const chartData = [
        { title: 'Por Tipo', labels: Object.keys(byType), values: Object.values(byType) },
        { title: 'Por Estado', labels: Object.keys(byStatus), values: Object.values(byStatus) },
    ]

    return (
        <DashboardLayout>
            <Header
                title="Gestão Documental"
                subtitle="Controlo de documentos recebidos e enviados"
            />

            <div className="p-4 sm:p-6 space-y-4">
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Pesquisar por assunto, protocolo..."
                                value={filters.search || ''}
                                onChange={(e) => {
                                    setFilters(prev => ({ ...prev, search: e.target.value }))
                                    setPage(0)
                                }}
                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
                            />
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2.5 rounded-lg border transition-colors ${showFilters ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        >
                            <Filter className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setShowExportModal(true)}
                            variant="secondary"
                            size="sm"
                            className="bg-blue-900/20 border-blue-700/40 text-blue-400 hover:bg-blue-900/40"
                        >
                            <FileBarChart2 className="w-4 h-4 mr-1.5" />
                            Exportar Relatório
                        </Button>
                        {permissions.canManageDocuments && (
                            <Link to="/documents/new">
                                <Button size="sm">
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    Novo Documento
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <Card className="animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {!permissions.scopeToMunicipio && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1.5">Município</label>
                                    <select
                                        value={filters.municipio_id || ''}
                                        onChange={(e) => {
                                            setFilters(prev => ({ ...prev, municipio_id: e.target.value || undefined }))
                                            setPage(0)
                                        }}
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    >
                                        <option value="">Todos</option>
                                        {municipios.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">Tipo</label>
                                <select
                                    value={filters.type || 'all'}
                                    onChange={(e) => {
                                        setFilters(prev => ({ ...prev, type: (e.target.value as DocumentType | 'all') }))
                                        setPage(0)
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                >
                                    <option value="all">Todos</option>
                                    {(Object.entries(documentTypeLabels) as [DocumentType, string][]).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">Estado</label>
                                <select
                                    value={filters.status || 'all'}
                                    onChange={(e) => {
                                        setFilters(prev => ({ ...prev, status: (e.target.value as DocumentStatus | 'all') }))
                                        setPage(0)
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                >
                                    <option value="all">Todos</option>
                                    {(Object.entries(documentStatusLabels) as [DocumentStatus, string][]).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">Direcção</label>
                                <select
                                    value={filters.direction || 'all'}
                                    onChange={(e) => {
                                        setFilters(prev => ({ ...prev, direction: (e.target.value as DocumentDirection | 'all') }))
                                        setPage(0)
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                >
                                    <option value="all">Todos</option>
                                    {(Object.entries(documentDirectionLabels) as [DocumentDirection, string][]).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">Data de</label>
                                <input
                                    type="date"
                                    value={filters.date_from || ''}
                                    onChange={(e) => {
                                        setFilters(prev => ({ ...prev, date_from: e.target.value || undefined }))
                                        setPage(0)
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                />
                            </div>
                        </div>
                    </Card>
                )}

                {/* Table */}
                <Card padding="none">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200 dark:border-gray-700/50">
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Protocolo</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assunto</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Tipo</th>
                                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Direcção</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Data</th>
                                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acções</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={7} className="px-4 py-4">
                                                <div className="h-4 bg-gray-200 dark:bg-gray-700/50 rounded animate-pulse" />
                                            </td>
                                        </tr>
                                    ))
                                ) : documents.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center">
                                            <FileStack className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                            <p className="text-gray-500 dark:text-gray-400">Nenhum documento encontrado</p>
                                            {permissions.canManageDocuments && (
                                                <Link to="/documents/new" className="text-blue-400 text-sm hover:text-blue-300 mt-2 inline-block">
                                                    Registar primeiro documento
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    documents.map((doc) => (
                                        <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-mono font-medium text-blue-400">{doc.protocol_number}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[250px]">{doc.subject}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{doc.origin} → {doc.destination}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                    {documentTypeLabels[doc.type]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center hidden md:table-cell">
                                                <span className={`inline-flex items-center gap-1 text-xs font-medium ${doc.direction === 'received' ? 'text-blue-400' : 'text-amber-400'}`}>
                                                    {doc.direction === 'received' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                                                    {documentDirectionLabels[doc.direction]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {format(new Date(doc.document_date + 'T00:00:00'), 'dd/MM/yyyy', { locale: pt })}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor(doc.status)}`}>
                                                    {documentStatusLabels[doc.status]}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => openTimeline(doc)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-400 rounded-lg hover:bg-blue-500/10 transition-colors"
                                                        title="Linha do tempo"
                                                    >
                                                        <Clock className="w-4 h-4" />
                                                    </button>
                                                    {permissions.canManageDocuments && (
                                                        <>
                                                            <Link
                                                                to={`/documents/${doc.id}/edit`}
                                                                className="p-1.5 text-gray-400 hover:text-amber-400 rounded-lg hover:bg-amber-500/10 transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Link>
                                                            {permissions.canDelete && (
                                                                <button
                                                                    onClick={() => setDeleteModal(doc)}
                                                                    className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                                                                    title="Eliminar"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700/50">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
                            </p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage(p => Math.max(0, p - 1))}
                                    disabled={page === 0}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-400 px-2">{page + 1} / {totalPages}</span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                                    disabled={page >= totalPages - 1}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </Card>

                {/* Timeline Modal */}
                {timelineModal && (
                    <Modal
                        isOpen={!!timelineModal}
                        onClose={() => setTimelineModal(null)}
                        title={`Linha do Tempo — ${timelineModal.protocol_number}`}
                    >
                        <div className="mb-4">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{timelineModal.subject}</p>
                        </div>
                        {loadingMovements ? (
                            <div className="space-y-3">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-12 bg-gray-700/50 rounded animate-pulse" />
                                ))}
                            </div>
                        ) : movements.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-6">Sem movimentações registadas</p>
                        ) : (
                            <div className="relative">
                                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-700" />
                                <div className="space-y-4">
                                    {movements.map((mov, i) => (
                                        <div key={mov.id} className="flex items-start gap-4 relative">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${i === movements.length - 1
                                                ? 'bg-blue-500/20 border-2 border-blue-500'
                                                : 'bg-gray-700 border-2 border-gray-600'
                                                }`}>
                                                <div className={`w-2 h-2 rounded-full ${i === movements.length - 1 ? 'bg-blue-400' : 'bg-gray-400'}`} />
                                            </div>
                                            <div className="flex-1 min-w-0 pb-2">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{mov.action}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {mov.performer?.full_name || 'Sistema'} • {format(new Date(mov.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: pt })}
                                                </p>
                                                {mov.notes && (
                                                    <p className="text-xs text-gray-400 mt-1">{mov.notes}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="mt-6 flex justify-end">
                            <Button variant="secondary" onClick={() => setTimelineModal(null)}>
                                Fechar
                            </Button>
                        </div>
                    </Modal>
                )}

                {/* Delete Confirmation Modal */}
                {deleteModal && (
                    <Modal
                        isOpen={!!deleteModal}
                        onClose={() => setDeleteModal(null)}
                        title="Eliminar Documento"
                    >
                        <p className="text-sm text-gray-400 mb-4">
                            Tem certeza que deseja eliminar o documento <strong className="text-white">{deleteModal.protocol_number}</strong>? Esta acção não pode ser desfeita.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="secondary" onClick={() => setDeleteModal(null)}>
                                Cancelar
                            </Button>
                            <Button variant="danger" onClick={handleDelete}>
                                <Trash2 className="w-4 h-4 mr-1.5" />
                                Eliminar
                            </Button>
                        </div>
                    </Modal>
                )}
            </div>

            {/* Report Export Modal */}
            {showExportModal && (
                <ReportExportModal
                    reportType="documents"
                    columns={reportColumns}
                    rows={reportRows}
                    charts={reportCharts}
                    stats={reportStats}
                    chartData={chartData}
                    onClose={() => setShowExportModal(false)}
                />
            )}
        </DashboardLayout>
    )
}
