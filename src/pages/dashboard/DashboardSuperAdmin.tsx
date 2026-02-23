import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    Image,
    Video,
    FileText,
    Music,
    HardDrive,
    TrendingUp,
    Clock,
    ArrowUpRight,
    Upload,
    Download,
    LogIn,
    Trash2,
    CalendarCheck,
    FileStack,
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import { FileTypeBadge } from '../../components/ui/Badge'
import { SkeletonStatCard, SkeletonListItem, SkeletonActivityItem } from '../../components/ui/Skeleton'
import { useAuth } from '../../contexts/AuthContext'
import { getDashboardStats, getMediaFiles, getActivityLogs } from '../../lib/supabase'
import { getActivityStats } from '../../lib/activities'
import { getDocumentStats } from '../../lib/documents'
import { formatFileSize } from '../../lib/types'
import type { MediaFile, ActivityLog } from '../../lib/types'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

interface Stats {
    totalFiles: number
    totalImages: number
    totalVideos: number
    totalDocuments: number
    totalAudio: number
    totalStorageBytes: number
}

export default function DashboardSuperAdmin() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [recentFiles, setRecentFiles] = useState<MediaFile[]>([])
    const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([])
    const [activityStats, setActivityStats] = useState<any>(null)
    const [documentStats, setDocumentStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const { profile } = useAuth()

    useEffect(() => {
        loadDashboardData()
    }, [])

    const loadDashboardData = async () => {
        try {
            const [statsData, filesResponse, activityData, actStats, docStats] = await Promise.all([
                getDashboardStats(),
                getMediaFiles({ limit: 6 }),
                getActivityLogs(10),
                getActivityStats(),
                getDocumentStats(),
            ])

            setStats(statsData)
            setRecentFiles(filesResponse.data)
            setRecentActivity(activityData)
            setActivityStats(actStats)
            setDocumentStats(docStats)
        } catch (err) {
            console.error('Error loading dashboard:', err)
        } finally {
            setLoading(false)
        }
    }

    const statsCards = stats ? [
        {
            label: 'Total de Ficheiros',
            value: stats.totalFiles,
            icon: HardDrive,
            color: 'blue',
            gradient: 'from-blue-500 to-blue-700',
        },
        {
            label: 'Imagens',
            value: stats.totalImages,
            icon: Image,
            color: 'emerald',
            gradient: 'from-emerald-500 to-emerald-700',
        },
        {
            label: 'Vídeos',
            value: stats.totalVideos,
            icon: Video,
            color: 'amber',
            gradient: 'from-amber-500 to-amber-700',
        },
        {
            label: 'Documentos',
            value: stats.totalDocuments,
            icon: FileText,
            color: 'purple',
            gradient: 'from-purple-500 to-purple-700',
        },
        {
            label: 'Áudios',
            value: stats.totalAudio,
            icon: Music,
            color: 'pink',
            gradient: 'from-pink-500 to-pink-700',
        },
        {
            label: 'Armazenamento',
            value: formatFileSize(stats.totalStorageBytes),
            icon: TrendingUp,
            color: 'cyan',
            gradient: 'from-cyan-500 to-cyan-700',
            isStorage: true,
        },
    ] : []

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

    if (loading) {
        return (
            <DashboardLayout>
                <Header
                    title="A carregar..."
                    subtitle="Painel do Super Administrador"
                />
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                        {Array.from({ length: 6 }).map((_, i) => (
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
                title={`Olá, ${profile?.full_name?.split(' ')[0] || 'Super Admin'}`}
                subtitle="Painel do Super Administrador - Visão Global"
            />

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                    {statsCards.map((stat, index) => {
                        const Icon = stat.icon
                        return (
                            <Card key={index} className="relative overflow-hidden group" hover>
                                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient}`} />
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs sm:text-sm text-gray-400 mb-1 truncate">{stat.label}</p>
                                        <p className="text-xl sm:text-2xl font-bold text-white">
                                            {stat.isStorage ? stat.value : stat.value.toLocaleString()}
                                        </p>
                                    </div>
                                    <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient} bg-opacity-20 flex-shrink-0`}>
                                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-l-4 border-blue-500">
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

                    <Card className="border-l-4 border-emerald-500">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-emerald-500/10 rounded-lg">
                                <TrendingUp className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Com Cobertura</p>
                                <p className="text-2xl font-bold text-white">{activityStats?.withMedia || 0}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="border-l-4 border-amber-500">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-amber-500/10 rounded-lg">
                                <FileStack className="w-6 h-6 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Docs Recebidos</p>
                                <p className="text-2xl font-bold text-white">{documentStats?.received || 0}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="border-l-4 border-purple-500">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-purple-500/10 rounded-lg">
                                <FileStack className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-400">Docs Enviados</p>
                                <p className="text-2xl font-bold text-white">{documentStats?.sent || 0}</p>
                            </div>
                        </div>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Files */}
                    <div className="lg:col-span-2">
                        <Card padding="none">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
                                <h2 className="text-lg font-semibold text-white">Ficheiros Recentes</h2>
                                <Link
                                    to="/media"
                                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                >
                                    Ver todos
                                    <ArrowUpRight className="w-4 h-4" />
                                </Link>
                            </div>

                            {recentFiles.length === 0 ? (
                                <div className="p-8 text-center">
                                    <Image className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400">Nenhum ficheiro carregado</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-700/50">
                                    {recentFiles.map((file) => (
                                        <div key={file.id} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 hover:bg-gray-800/30 active:bg-gray-800/40 transition-colors touch-feedback">
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                                                {file.file_type === 'image' && <Image className="w-6 h-6 text-emerald-400" />}
                                                {file.file_type === 'video' && <Video className="w-6 h-6 text-amber-400" />}
                                                {file.file_type === 'document' && <FileText className="w-6 h-6 text-blue-400" />}
                                                {file.file_type === 'audio' && <Music className="w-6 h-6 text-purple-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-white truncate">{file.title}</p>
                                                <p className="text-xs text-gray-400">
                                                    {formatFileSize(file.size_bytes)} • {format(new Date(file.created_at), 'dd MMM yyyy', { locale: pt })}
                                                </p>
                                            </div>
                                            <FileTypeBadge type={file.file_type} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Recent Activity */}
                    <div>
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
                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Link to="/consolidated">
                        <Card hover className="border-l-4 border-blue-500">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-500/10 rounded-lg">
                                    <TrendingUp className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Painel Consolidado</p>
                                    <p className="text-xs text-gray-400">Visão global dos serviços</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to="/users">
                        <Card hover className="border-l-4 border-emerald-500">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-emerald-500/10 rounded-lg">
                                    <Upload className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Gestão de Utilizadores</p>
                                    <p className="text-xs text-gray-400">Administrar perfis e permissões</p>
                                </div>
                            </div>
                        </Card>
                    </Link>

                    <Link to="/municipios">
                        <Card hover className="border-l-4 border-amber-500">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-500/10 rounded-lg">
                                    <HardDrive className="w-6 h-6 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">Municípios</p>
                                    <p className="text-xs text-gray-400">Gestão de municípios</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                </div>
            </div>
        </DashboardLayout>
    )
}
