import { useState, useEffect, useCallback } from 'react'
import {
    BarChart3,
    CalendarCheck,
    FileStack,
    TrendingUp,
    ArrowDownLeft,
    ArrowUpRight,
    Tv,
    Users,
    Loader2,
    FileBarChart2,
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import ReportExportModal from '../../components/ui/ReportExportModal'
import { useAuth } from '../../contexts/AuthContext'
import { getActivityStats } from '../../lib/activities'
import { getDocumentStats } from '../../lib/documents'
import { getMunicipios } from '../../lib/supabase'
import { rolePermissions } from '../../lib/types'
import type { Municipio } from '../../lib/types'

interface DashboardStats {
    activities: {
        total: number
        withMedia: number
        byType: Record<string, number>
        byMunicipio: { municipio_name: string; count: number }[]
    }
    documents: {
        total: number
        received: number
        sent: number
        byStatus: Record<string, number>
        byType: Record<string, number>
    }
}

const STAT_BOX_CLASSES = 'relative overflow-hidden rounded-xl bg-gradient-to-br p-5 border'

export default function ConsolidatedDashboardPage() {
    const { profile } = useAuth()
    const permissions = profile?.role ? rolePermissions[profile.role] : rolePermissions.leitor

    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [municipios, setMunicipios] = useState<Municipio[]>([])
    const [selectedMunicipio, setSelectedMunicipio] = useState<string>(
        permissions.scopeToMunicipio ? profile?.municipio_id || '' : ''
    )
    const [showExportModal, setShowExportModal] = useState(false)

    const loadStats = useCallback(async () => {
        setLoading(true)
        try {
            const [actStats, docStats] = await Promise.all([
                getActivityStats(selectedMunicipio || undefined),
                getDocumentStats(selectedMunicipio || undefined),
            ])
            setStats({ activities: actStats, documents: docStats })
        } catch (err) {
            console.error('Error loading dashboard stats:', err)
        } finally {
            setLoading(false)
        }
    }, [selectedMunicipio])

    useEffect(() => {
        loadStats()
    }, [loadStats])

    useEffect(() => {
        getMunicipios().then(setMunicipios).catch(console.error)
    }, [])

    if (loading) {
        return (
            <DashboardLayout>
                <Header title="Painel Consolidado" subtitle="Visão global dos serviços" />
                <div className="p-6 flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                </div>
            </DashboardLayout>
        )
    }

    const actStats = stats?.activities || { total: 0, withMedia: 0, byType: {}, byMunicipio: [] }
    const docStats = stats?.documents || { total: 0, received: 0, sent: 0, byStatus: {}, byType: {} }
    const mediaCoverage = actStats.total > 0 ? Math.round((actStats.withMedia / actStats.total) * 100) : 0

    // Report data
    const COLORS = ['#1a3a5c', '#2d6a4f', '#d62828', '#f77f00', '#4361ee', '#7209b7', '#06d6a0', '#e63946', '#457b9d', '#a8dadc']

    const consolidatedColumns = [
        { header: 'Município', key: 'municipio', width: 22 },
        { header: 'Nº Actividades', key: 'activities', width: 14 },
        { header: '% do Total', key: 'pct', width: 12 },
    ]
    const consolidatedRows = actStats.byMunicipio.map(m => ({
        municipio: m.municipio_name,
        activities: m.count,
        pct: actStats.total > 0 ? `${Math.round((m.count / actStats.total) * 100)}%` : '0%',
    }))

    const reportStats = [
        { label: 'Total Actividades', value: actStats.total },
        { label: 'Cobertura Mediática', value: `${mediaCoverage}%` },
        { label: 'Docs Recebidos', value: docStats.received },
        { label: 'Docs Enviados', value: docStats.sent },
    ]

    const actTypeLabels = Object.keys(actStats.byType)
    const actTypeValues = Object.values(actStats.byType)
    const docStatusLabels = Object.keys(docStats.byStatus)
    const docStatusValues = Object.values(docStats.byStatus)

    const reportCharts = [
        ...(actTypeLabels.length > 0 ? [{
            title: 'Actividades por Tipo',
            type: 'bar' as const,
            labels: actTypeLabels,
            datasets: [{ label: 'Actividades', data: actTypeValues, color: '#1a3a5c' }],
            width: 700, height: 280,
        }] : []),
        ...(docStatusLabels.length > 0 ? [{
            title: 'Documentos por Estado',
            type: 'pie' as const,
            labels: docStatusLabels,
            datasets: [{ label: 'Estado', data: docStatusValues, color: COLORS[0] }],
        }] : []),
        ...(actStats.byMunicipio.length > 0 ? [{
            title: 'Actividades por Município',
            type: 'bar' as const,
            labels: actStats.byMunicipio.slice(0, 8).map(m => m.municipio_name),
            datasets: [{ label: 'Actividades', data: actStats.byMunicipio.slice(0, 8).map(m => m.count), color: '#2d6a4f' }],
            width: 700, height: 250,
        }] : []),
    ]

    const chartData = [
        { title: 'Actividades por Tipo', labels: actTypeLabels, values: actTypeValues },
        { title: 'Documentos por Estado', labels: docStatusLabels, values: docStatusValues },
    ]

    return (
        <DashboardLayout>
            <Header
                title="Painel Consolidado"
                subtitle="Visão global dos serviços institucionais"
            />

            <div className="p-4 sm:p-6 space-y-6">
                {/* Filter + Export Bar */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    {!permissions.scopeToMunicipio && (
                        <Card>
                            <div className="flex items-center gap-4">
                                <label className="text-sm font-medium text-gray-400">Filtrar por município:</label>
                                <select
                                    value={selectedMunicipio}
                                    onChange={(e) => setSelectedMunicipio(e.target.value)}
                                    className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                >
                                    <option value="">Todos os municípios</option>
                                    {municipios.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        </Card>
                    )}
                    <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-400 bg-blue-900/20 border border-blue-700/40 rounded-xl hover:bg-blue-900/40 transition-colors"
                    >
                        <FileBarChart2 className="w-4 h-4" />
                        Exportar Relatório Consolidado
                    </button>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className={`${STAT_BOX_CLASSES} from-blue-500/10 to-blue-600/5 border-blue-500/20`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Total Actividades</p>
                                <p className="text-3xl font-bold text-white mt-2">{actStats.total}</p>
                            </div>
                            <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                                <CalendarCheck className="w-5 h-5 text-blue-400" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                            <TrendingUp className="w-3 h-3" />
                            <span>{Object.keys(actStats.byType).length} tipos registados</span>
                        </div>
                    </div>

                    <div className={`${STAT_BOX_CLASSES} from-emerald-500/10 to-emerald-600/5 border-emerald-500/20`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Cobertura Mediática</p>
                                <p className="text-3xl font-bold text-white mt-2">{mediaCoverage}%</p>
                            </div>
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                                <Tv className="w-5 h-5 text-emerald-400" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                            <span>{actStats.withMedia} de {actStats.total} com publicação</span>
                        </div>
                    </div>

                    <div className={`${STAT_BOX_CLASSES} from-amber-500/10 to-amber-600/5 border-amber-500/20`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Documentos Recebidos</p>
                                <p className="text-3xl font-bold text-white mt-2">{docStats.received}</p>
                            </div>
                            <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                                <ArrowDownLeft className="w-5 h-5 text-amber-400" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                            <span>de {docStats.total} documentos totais</span>
                        </div>
                    </div>

                    <div className={`${STAT_BOX_CLASSES} from-purple-500/10 to-purple-600/5 border-purple-500/20`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">Documentos Enviados</p>
                                <p className="text-3xl font-bold text-white mt-2">{docStats.sent}</p>
                            </div>
                            <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                                <ArrowUpRight className="w-5 h-5 text-purple-400" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                            <span>{docStats.total} documentos processados</span>
                        </div>
                    </div>
                </div>

                {/* Middle Section: Activity Types + Document Status */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Activity Types */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-400" />
                                Actividades por Tipo
                            </h3>
                        </div>
                        {Object.entries(actStats.byType).length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-6">Sem dados disponíveis</p>
                        ) : (
                            <div className="space-y-3">
                                {Object.entries(actStats.byType)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([type, count]) => {
                                        const pct = Math.round((count / actStats.total) * 100)
                                        return (
                                            <div key={type}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{type}</span>
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700/50 rounded-full h-2">
                                                    <div
                                                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        )}
                    </Card>

                    {/* Document Status */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <FileStack className="w-4 h-4 text-amber-400" />
                                Estado dos Documentos
                            </h3>
                        </div>
                        {Object.entries(docStats.byStatus).length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-6">Sem dados disponíveis</p>
                        ) : (
                            <div className="space-y-4">
                                {Object.entries(docStats.byStatus)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([status, count]) => {
                                        const pct = docStats.total > 0 ? Math.round((count / docStats.total) * 100) : 0
                                        const statusLabels: Record<string, string> = {
                                            em_tramitacao: 'Em Tramitação',
                                            respondido: 'Respondido',
                                            arquivado: 'Arquivado',
                                        }
                                        const statusColors: Record<string, string> = {
                                            em_tramitacao: 'from-amber-500 to-amber-400',
                                            respondido: 'from-emerald-500 to-emerald-400',
                                            arquivado: 'from-gray-500 to-gray-400',
                                        }
                                        return (
                                            <div key={status}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{statusLabels[status] || status}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-500">{pct}%</span>
                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{count}</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700/50 rounded-full h-2">
                                                    <div
                                                        className={`bg-gradient-to-r ${statusColors[status] || 'from-gray-500 to-gray-400'} h-2 rounded-full transition-all duration-500`}
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Bottom Section: Municipality Comparison */}
                {!permissions.scopeToMunicipio && actStats.byMunicipio.length > 0 && (
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <Users className="w-4 h-4 text-purple-400" />
                                Actividades por Município
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700/50">
                                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Município</th>
                                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actividades</th>
                                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/3">Distribuição</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                                    {actStats.byMunicipio.slice(0, 10).map((item, i) => {
                                        const pct = Math.round((item.count / actStats.total) * 100)
                                        return (
                                            <tr key={item.municipio_name} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                                <td className="px-4 py-2.5 text-sm text-gray-500">{i + 1}</td>
                                                <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{item.municipio_name}</td>
                                                <td className="px-4 py-2.5 text-sm text-right font-semibold text-gray-900 dark:text-white">{item.count}</td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-gray-200 dark:bg-gray-700/50 rounded-full h-1.5">
                                                            <div
                                                                className="bg-gradient-to-r from-purple-500 to-purple-400 h-1.5 rounded-full transition-all duration-500"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            {/* Consolidated Report Modal */}
            {showExportModal && (
                <ReportExportModal
                    reportType="consolidated"
                    columns={consolidatedColumns}
                    rows={consolidatedRows}
                    charts={reportCharts}
                    stats={reportStats}
                    chartData={chartData}
                    onClose={() => setShowExportModal(false)}
                />
            )}
        </DashboardLayout>
    )
}
