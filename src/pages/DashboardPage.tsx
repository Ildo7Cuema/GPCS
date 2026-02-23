import { lazy } from 'react'
import type { ReactElement } from 'react'
import { useAuth } from '../contexts/AuthContext'
import DashboardLayout from '../components/layout/DashboardLayout'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import { SkeletonStatCard } from '../components/ui/Skeleton'
import { AlertCircle } from 'lucide-react'

const DashboardSuperAdmin = lazy(() => import('./dashboard/DashboardSuperAdmin'))
const DashboardMunicipal = lazy(() => import('./dashboard/DashboardMunicipal'))
const DashboardProvincial = lazy(() => import('./dashboard/DashboardProvincial'))
const DashboardDepartamentoComunicacao = lazy(() => import('./dashboard/DashboardDepartamentoComunicacao'))
const DashboardDepartamentoInformacao = lazy(() => import('./dashboard/DashboardDepartamentoInformacao'))

/**
 * Dashboard Router — renders the appropriate dashboard based on user role.
 * Shows a stat-card skeleton immediately while the profile loads in background.
 */
export default function DashboardPage() {
    const { profile } = useAuth()

    // Show meaningful skeleton while profile is being fetched in background
    if (!profile) {
        return (
            <DashboardLayout>
                <Header title="A carregar..." subtitle="A verificar permissões" />
                <div className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                        {Array.from({ length: 6 }).map((_, i) => <SkeletonStatCard key={i} />)}
                    </div>
                </div>
            </DashboardLayout>
        )
    }

    const dashboardMap: Record<string, ReactElement> = {
        superadmin: <DashboardSuperAdmin />,
        admin_municipal: <DashboardMunicipal />,
        tecnico: <DashboardMunicipal />,
        leitor: <DashboardMunicipal />,
        direccao_provincial: <DashboardProvincial />,
        departamento_comunicacao: <DashboardDepartamentoComunicacao />,
        departamento_informacao: <DashboardDepartamentoInformacao />,
    }

    const dashboardComponent = dashboardMap[profile.role]

    if (dashboardComponent) {
        // Suspense is already provided by App.tsx — no need to double-wrap
        return dashboardComponent
    }

    // Fallback for unknown roles
    return (
        <DashboardLayout>
            <Header
                title="Perfil Desconhecido"
                subtitle="Contacte o administrador"
            />
            <div className="p-6">
                <Card>
                    <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-amber-600 mx-auto mb-3" />
                        <p className="text-gray-400">
                            O seu perfil ({profile.role}) não tem um dashboard configurado.
                        </p>
                        <p className="text-sm text-gray-500 mt-2">
                            Por favor, contacte o administrador do sistema.
                        </p>
                    </div>
                </Card>
            </div>
        </DashboardLayout>
    )
}
