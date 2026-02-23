import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    CalendarCheck,
    TrendingUp,
    Clock,
    Upload,
    Download,
    LogIn,
    Trash2,
    BarChart3,
    Tv,
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import { SkeletonStatCard } from '../../components/ui/Skeleton'
import { useAuth } from '../../contexts/AuthContext'
import { getActivityLogs } from '../../lib/supabase'
import { getActivityStats } from '../../lib/activities'
import type { ActivityLog } from '../../lib/types'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

export default function DashboardDepartamentoInformacao() {
    const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([])
    const [activityStats, setActivityStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const { profile } = useAuth()

    useEffect(() => {
        if (profile) {
            loadDashboardData()
        }
    }, [profile])

    const loadDashboardData = async () => {
        if (!profile) return

        try {
            // As RLS policies já filtram automaticamente
            const [activityData, actStats] = await Promise.all([
                getActivityLogs(10),
                getActivityStats(),
            ])

            setRecentActivity(activityData)
            setActivityStats(actStats)
        } catch (err) {
            console.error('Error loading dashboard:', err)
        } finally {
            setLoading(false)
        }
    }

    const getActivityIcon = (action: string) => {
        switch (action) {
            case 'upload': return Upload
            case 'download': return Download
            case 'delete': return Trash2
            case 'login': return LogIn
            default: return Clock
        }
    }

    const getActivityColor = (action: string) => {
        switch (action) {
            case 'upload': return 'text-emerald-400'
            case 'download': return 'text-blue-400'
            case 'delete': return 'text-red-400'
            case 'login': return 'text-amber-400'
            default: return 'text-gray-400'
        }
    }

    const getActivityText = (action: string) => {
        switch (action) {
            case 'upload': return 'fez upload de um ficheiro'
            case 'download': return 'descarregou um ficheiro'
            case 'delete': return 'eliminou um ficheiro'
            case 'login': return 'iniciou sessão'
            case 'logout': return 'terminou sessão'
            default: return action
        }
    }

    const mediaCoverage = activityStats?.total > 0
        ? Math.round((activityStats.withMedia / activityStats.total) * 100)
        : 0

    if (loading) {
        return (
            <DashboardLayout>
                <Header
                    title="A carregar..."
                    subtitle="Dashboard - Departamento de Informação"
                />
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <SkeletonStatCard key={i} />
                        ))}
                    </div>
                </div>
            </DashboardLayout>
        )
    }



    return (
        <DashboardLayout>
            <Header
                title={`Olá, ${profile?.full_name?.split(' ')[0] || 'Utilizador'}`}
                subtitle="Dashboard - Departamento de Informação"
            />

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Stats Grid - Focus on Activities */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="relative overflow-hidden border-l-4 border-blue-500">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-500/10 rounded-lg">
                                <CalendarCheck className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Total Atividades</p>
                                <p className="text-2xl font-bold text-white">{activityStats?.total || 0}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="relative overflow-hidden border-l-4 border-emerald-500">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-emerald-500/10 rounded-lg">
                                <Tv className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Com Publicação</p>
                                <p className="text-2xl font-bold text-white">{activityStats?.withMedia || 0}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="relative overflow-hidden border-l-4 border-amber-500">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-500/10 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Cobertura Mediática</p>
                                <p className="text-2xl font-bold text-white">{mediaCoverage}%</p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Activity Types Chart */}
                {activityStats?.byType && Object.keys(activityStats.byType).length > 0 && (
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-blue-400" />
                                Atividades por Tipo
                            </h3>
                        </div>
                        <div className="space-y-3">
                            {Object.entries(activityStats.byType)
                                .sort(([, a]: any, [, b]: any) => b - a)
                                .map(([type, count]: any) => {
                                    const pct = Math.round((count / activityStats.total) * 100)
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
                    </Card>
                )}

                {/* Media Coverage by Municipality (if available) */}
                {activityStats?.byMunicipio && activityStats.byMunicipio.length > 0 && (
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-emerald-400" />
                                Atividades por Município
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700/50">
                                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">#</th>
                                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Município</th>
                                        <th className="text-right px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Atividades</th>
                                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-1/3">Distribuição</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                                    {activityStats.byMunicipio.slice(0, 10).map((item: any, i: number) => {
                                        const pct = Math.round((item.count / activityStats.total) * 100)
                                        return (
                                            <tr key={item.municipio_name} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                                <td className="px-4 py-2.5 text-sm text-gray-500">{i + 1}</td>
                                                <td className="px-4 py-2.5 text-sm font-medium text-gray-900 dark:text-white">{item.municipio_name}</td>
                                                <td className="px-4 py-2.5 text-sm text-right font-semibold text-gray-900 dark:text-white">{item.count}</td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 bg-gray-200 dark:bg-gray-700/50 rounded-full h-1.5">
                                                            <div
                                                                className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-1.5 rounded-full transition-all duration-500"
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

                {/* Recent Activity */}
                <Card padding="none">
                    <div className="px-6 py-4 border-b border-gray-700/50">
                        <h2 className="text-lg font-semibold text-white">Atividade Recente</h2>
                    </div>

                    {recentActivity.length === 0 ? (
                        <div className="p-8 text-center">
                            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">Nenhuma atividade registada</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-700/50">
                            {recentActivity.map((activity) => {
                                const Icon = getActivityIcon(activity.action)
                                return (
                                    <div key={activity.id} className="px-4 sm:px-6 py-3 flex items-start gap-3">
                                        <div className={`mt-0.5 ${getActivityColor(activity.action)}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-300">
                                                <span className="text-white font-medium">
                                                    {activity.user?.full_name || 'Utilizador'}
                                                </span>{' '}
                                                {getActivityText(activity.action)}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                {format(new Date(activity.created_at), "dd MMM 'às' HH:mm", { locale: pt })}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </Card>

                {/* Quick Links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Link to="/activities">
                        <Card hover className="border-l-4 border-blue-500">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-500/10 rounded-lg">
                                    <CalendarCheck className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Gerir Atividades</p>
                                    <p className="text-xs text-gray-400">Criar e gerir atividades</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to="/media">
                        <Card hover className="border-l-4 border-emerald-500">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-500/10 rounded-lg">
                                    <Upload className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Media</p>
                                    <p className="text-xs text-gray-400">Carregar ficheiros</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                </div>
            </div>
        </DashboardLayout>
    )
}
