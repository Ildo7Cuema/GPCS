import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
    Plus,
    Search,
    Filter,
    Download,
    FileBarChart2,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Trash2,
    CalendarCheck,
    Eye,
    Tv,
    CheckCircle2,
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import ReportExportModal from '../../components/ui/ReportExportModal'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { getActivities, deleteActivity, exportActivitiesCsv } from '../../lib/activities'
import { getMunicipios } from '../../lib/supabase'
import type { Activity, ActivityFilters, Municipio } from '../../lib/types'
import { rolePermissions } from '../../lib/types'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

const PAGE_SIZE = 15

const ACTIVITY_TYPES = [
    'Reunião',
    'Conferência',
    'Visita',
    'Inauguração',
    'Formação',
    'Evento Cultural',
    'Evento Desportivo',
    'Assembleia',
    'Cerimónia',
    'Outro',
]

export default function ActivitiesPage() {
    const { profile } = useAuth()
    const toast = useToast()
    const permissions = profile?.role ? rolePermissions[profile.role] : rolePermissions.leitor

    const [activities, setActivities] = useState<Activity[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(0)
    const [municipios, setMunicipios] = useState<Municipio[]>([])
    const [showFilters, setShowFilters] = useState(false)
    const [deleteModal, setDeleteModal] = useState<Activity | null>(null)
    const [detailModal, setDetailModal] = useState<Activity | null>(null)
    const [showExportModal, setShowExportModal] = useState(false)

    const currentYear = new Date().getFullYear()
    const [filters, setFilters] = useState<ActivityFilters>({
        municipio_id: permissions.scopeToMunicipio ? profile?.municipio_id || '' : '',
        year: currentYear,
    })

    const loadActivities = useCallback(async () => {
        setLoading(true)
        try {
            const { data, count } = await getActivities({
                ...filters,
                limit: PAGE_SIZE,
                offset: page * PAGE_SIZE,
                profile,
            })
            setActivities(data)
            setTotalCount(count)
        } catch (err) {
            console.error('Error loading activities:', err)
            toast.error('Erro ao carregar actividades')
        } finally {
            setLoading(false)
        }
    }, [filters, page, profile, toast])

    useEffect(() => {
        loadActivities()
    }, [loadActivities])

    useEffect(() => {
        getMunicipios().then(setMunicipios).catch(console.error)
    }, [])

    const handleDelete = async () => {
        if (!deleteModal) return
        try {
            await deleteActivity(deleteModal.id)
            toast.success('Actividade eliminada com sucesso')
            setDeleteModal(null)
            loadActivities()
        } catch (err) {
            console.error('Error deleting activity:', err)
            toast.error('Erro ao eliminar actividade')
        }
    }

    const handleExportCsv = async () => {
        try {
            const csv = await exportActivitiesCsv(filters)
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `actividades_${filters.year || 'todas'}.csv`
            link.click()
            URL.revokeObjectURL(url)
            toast.success('CSV exportado com sucesso')
        } catch (err) {
            console.error('Error exporting CSV:', err)
            toast.error('Erro ao exportar CSV')
        }
    }

    // Build report data from loaded activities
    const reportColumns = [
        { header: 'Título', key: 'title', width: 30 },
        { header: 'Tipo', key: 'activity_type', width: 16 },
        { header: 'Data', key: 'date', width: 12 },
        { header: 'Hora', key: 'time', width: 8 },
        { header: 'Município', key: 'municipio', width: 18 },
        { header: 'Promotor', key: 'promoter', width: 20 },
        { header: 'Ministro', key: 'minister', width: 14 },
        { header: 'Governador', key: 'governor', width: 14 },
        { header: 'Administrador', key: 'administrator', width: 14 },
        { header: 'Órgão de Comunicação', key: 'media_outlet', width: 22 },
        { header: 'Notícia Publicada', key: 'news_published', width: 16 },
        { header: 'Observações', key: 'observations', width: 28 },
    ]

    const reportRows = activities.map(a => ({
        title: a.title,
        activity_type: a.activity_type,
        date: format(new Date(a.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: pt }),
        time: a.time || '—',
        municipio: a.municipio?.name || '—',
        promoter: a.promoter || '—',
        minister: a.minister_present ? `Sim${a.minister_name ? ` (${a.minister_name})` : ''}` : 'Não',
        governor: a.governor_present ? `Sim${a.governor_name ? ` (${a.governor_name})` : ''}` : 'Não',
        administrator: a.administrator_present ? `Sim${a.administrator_name ? ` (${a.administrator_name})` : ''}` : 'Não',
        media_outlet: a.media_outlet || '—',
        news_published: a.news_published ? 'Sim' : 'Não',
        observations: a.observations || '—',
    }))

    // Chart: activities by type
    const byType = activities.reduce<Record<string, number>>((acc, a) => {
        acc[a.activity_type] = (acc[a.activity_type] || 0) + 1
        return acc
    }, {})
    const chartLabels = Object.keys(byType)
    const chartValues = Object.values(byType)

    const reportCharts = chartLabels.length > 0 ? [{
        title: 'Actividades por Tipo',
        type: 'bar' as const,
        labels: chartLabels,
        datasets: [{ label: 'Actividades', data: chartValues, color: '#1a3a5c' }],
        width: 700, height: 280,
    }] : []

    const reportStats = [
        { label: 'Total de Actividades', value: totalCount },
        { label: 'Com Cobertura Mediática', value: activities.filter(a => a.news_published).length },
        { label: 'Tipos de Actividade', value: chartLabels.length },
        { label: 'Municípios Cobertos', value: new Set(activities.map(a => a.municipio?.name).filter(Boolean)).size },
    ]

    const totalPages = Math.ceil(totalCount / PAGE_SIZE)

    const months = [
        { value: '', label: 'Todos os meses' },
        { value: '1', label: 'Janeiro' },
        { value: '2', label: 'Fevereiro' },
        { value: '3', label: 'Março' },
        { value: '4', label: 'Abril' },
        { value: '5', label: 'Maio' },
        { value: '6', label: 'Junho' },
        { value: '7', label: 'Julho' },
        { value: '8', label: 'Agosto' },
        { value: '9', label: 'Setembro' },
        { value: '10', label: 'Outubro' },
        { value: '11', label: 'Novembro' },
        { value: '12', label: 'Dezembro' },
    ]

    const years = Array.from({ length: 5 }, (_, i) => currentYear - i)

    return (
        <DashboardLayout>
            <Header
                title="Actividades Institucionais"
                subtitle="Gestão e monitorização de actividades municipais"
            />

            <div className="p-4 sm:p-6 space-y-4">
                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Pesquisar actividades..."
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
                            onClick={handleExportCsv}
                            variant="secondary"
                            size="sm"
                        >
                            <Download className="w-4 h-4 mr-1.5" />
                            CSV
                        </Button>
                        <Button
                            onClick={() => setShowExportModal(true)}
                            variant="secondary"
                            size="sm"
                            className="bg-blue-900/20 border-blue-700/40 text-blue-400 hover:bg-blue-900/40"
                        >
                            <FileBarChart2 className="w-4 h-4 mr-1.5" />
                            Exportar Relatório
                        </Button>
                        {permissions.canManageActivities && (
                            <Link to="/activities/new">
                                <Button size="sm">
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    Nova Actividade
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <Card className="animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">Ano</label>
                                <select
                                    value={filters.year || ''}
                                    onChange={(e) => {
                                        setFilters(prev => ({ ...prev, year: e.target.value ? Number(e.target.value) : undefined }))
                                        setPage(0)
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                >
                                    <option value="">Todos</option>
                                    {years.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">Mês</label>
                                <select
                                    value={filters.month || ''}
                                    onChange={(e) => {
                                        setFilters(prev => ({ ...prev, month: e.target.value ? Number(e.target.value) : undefined }))
                                        setPage(0)
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                >
                                    {months.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1.5">Tipo</label>
                                <select
                                    value={filters.activity_type || ''}
                                    onChange={(e) => {
                                        setFilters(prev => ({ ...prev, activity_type: e.target.value || undefined }))
                                        setPage(0)
                                    }}
                                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                >
                                    <option value="">Todos</option>
                                    {ACTIVITY_TYPES.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
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
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Título</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Tipo</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Município</th>
                                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Mídia</th>
                                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acções</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            <td colSpan={6} className="px-4 py-4">
                                                <div className="h-4 bg-gray-200 dark:bg-gray-700/50 rounded animate-pulse" />
                                            </td>
                                        </tr>
                                    ))
                                ) : activities.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center">
                                            <CalendarCheck className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                                            <p className="text-gray-500 dark:text-gray-400">Nenhuma actividade encontrada</p>
                                            {permissions.canManageActivities && (
                                                <Link to="/activities/new" className="text-blue-400 text-sm hover:text-blue-300 mt-2 inline-block">
                                                    Registar primeira actividade
                                                </Link>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    activities.map((activity) => (
                                        <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                                        <CalendarCheck className="w-4 h-4 text-blue-400" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">{activity.title}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 sm:hidden">{activity.activity_type}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 hidden sm:table-cell">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                                    {activity.activity_type}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {format(new Date(activity.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: pt })}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                                    {activity.municipio?.name || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center hidden lg:table-cell">
                                                {activity.news_published ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-400">
                                                        <Tv className="w-3.5 h-3.5" />
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-500">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => setDetailModal(activity)}
                                                        className="p-1.5 text-gray-400 hover:text-blue-400 rounded-lg hover:bg-blue-500/10 transition-colors"
                                                        title="Ver detalhes"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    {permissions.canManageActivities && (
                                                        <>
                                                            <Link
                                                                to={`/activities/${activity.id}/edit`}
                                                                className="p-1.5 text-gray-400 hover:text-amber-400 rounded-lg hover:bg-amber-500/10 transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Link>
                                                            {permissions.canDelete && (
                                                                <button
                                                                    onClick={() => setDeleteModal(activity)}
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

                {/* Detail Modal */}
                {detailModal && (
                    <Modal
                        isOpen={!!detailModal}
                        onClose={() => setDetailModal(null)}
                        title="Detalhes da Actividade"
                    >
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{detailModal.title}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{detailModal.activity_type}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Data:</span>
                                    <p className="text-gray-900 dark:text-white">{format(new Date(detailModal.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: pt })}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Hora:</span>
                                    <p className="text-gray-900 dark:text-white">{detailModal.time || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Município:</span>
                                    <p className="text-gray-900 dark:text-white">{detailModal.municipio?.name || '—'}</p>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-400">Promotor:</span>
                                    <p className="text-gray-900 dark:text-white">{detailModal.promoter || '—'}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${detailModal.minister_present ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                                    <span className="text-gray-700 dark:text-gray-300">Ministro</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${detailModal.governor_present ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                                    <span className="text-gray-700 dark:text-gray-300">Governador</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${detailModal.administrator_present ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                                    <span className="text-gray-700 dark:text-gray-300">Administrador</span>
                                </div>
                            </div>
                            {detailModal.media_outlet && (
                                <div className="text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Cobertura mediática:</span>
                                    <p className="text-gray-900 dark:text-white">
                                        {detailModal.media_type?.name} — {detailModal.media_outlet}
                                        {detailModal.news_published && ' ✓ Publicada'}
                                    </p>
                                </div>
                            )}
                            {detailModal.observations && (
                                <div className="text-sm">
                                    <span className="text-gray-500 dark:text-gray-400">Observações:</span>
                                    <p className="text-gray-900 dark:text-white mt-1">{detailModal.observations}</p>
                                </div>
                            )}

                        </div>
                        <div className="mt-6 flex justify-end">
                            <Button variant="secondary" onClick={() => setDetailModal(null)}>
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
                        title="Eliminar Actividade"
                    >
                        <p className="text-sm text-gray-400 mb-4">
                            Tem certeza que deseja eliminar a actividade <strong className="text-white">"{deleteModal.title}"</strong>? Esta acção não pode ser desfeita.
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
                    reportType="activities"
                    columns={reportColumns}
                    rows={reportRows}
                    charts={reportCharts}
                    stats={reportStats}
                    chartData={[{ title: 'Actividades por Tipo', labels: chartLabels, values: chartValues }]}
                    onClose={() => setShowExportModal(false)}
                />
            )}
        </DashboardLayout>
    )
}
