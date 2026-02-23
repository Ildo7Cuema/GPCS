import { memo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { clsx } from 'clsx'
import {
    LayoutDashboard,
    Image,
    Users,
    Building2,
    Briefcase,
    Settings,
    LogOut,
    ChevronLeft,
    Menu,
    X,
    CalendarCheck,
    FileStack,
    BarChart3,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { rolePermissions } from '../../lib/types'

interface SidebarProps {
    collapsed: boolean
    onToggle: () => void
    mobileOpen?: boolean
    onMobileClose?: () => void
    onMobileOpen?: () => void
}

const Sidebar = memo(function Sidebar({
    collapsed,
    onToggle,
    mobileOpen = false,
    onMobileClose,
}: SidebarProps) {
    const location = useLocation()
    const { profile, logout } = useAuth()

    const userPermissions = profile?.role ? rolePermissions[profile.role] : rolePermissions.leitor

    const menuItems = [
        {
            icon: LayoutDashboard,
            label: 'Dashboard',
            href: '/dashboard',
            visible: true,
        },
        {
            icon: BarChart3,
            label: 'Painel Consolidado',
            href: '/consolidated',
            visible: profile?.role === 'superadmin',
        },
        {
            icon: CalendarCheck,
            label: 'Actividades',
            href: '/activities',
            visible: userPermissions.canManageActivities,
        },
        {
            icon: FileStack,
            label: 'Documentos',
            href: '/documents',
            visible: userPermissions.canManageDocuments,
        },
        {
            icon: Image,
            label: 'Media',
            href: '/media',
            visible: true,
        },
        {
            icon: Users,
            label: 'Utilizadores',
            href: '/users',
            visible: userPermissions.canManageUsers,
        },
        {
            icon: Building2,
            label: 'Municípios',
            href: '/municipios',
            visible: userPermissions.canManageMunicipios,
        },
        {
            icon: Briefcase,
            label: 'Provincial',
            href: '/provincial',
            visible: userPermissions.canManageMunicipios,
        },
        {
            icon: Settings,
            label: 'Definições',
            href: '/settings',
            visible: true,
        },
    ]

    const handleLogout = async () => {
        try {
            await logout()
        } catch (err) {
            console.error('Error logging out:', err)
        }
    }

    const handleNavClick = () => {
        // Close mobile menu when navigating
        if (onMobileClose) {
            onMobileClose()
        }
    }

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={clsx(
                    'fixed left-0 top-0 z-40 h-screen flex-col',
                    'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200 dark:border-gray-800',
                    'transition-all duration-300 ease-in-out',
                    // Hidden on mobile, visible on desktop
                    'hidden lg:flex',
                    collapsed ? 'w-20' : 'w-64'
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
                    <Link to="/dashboard" className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                            <img src="/images/angola-coat-of-arms.png" alt="GPCS Logo" className="w-10 h-10 object-contain" />
                        </div>
                        {!collapsed && (
                            <span className="font-semibold text-gray-900 dark:text-white text-lg animate-fade-in">
                                GPCS
                            </span>
                        )}
                    </Link>
                    <button
                        onClick={onToggle}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors touch-target"
                        aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
                    >
                        {collapsed ? (
                            <Menu className="w-5 h-5" />
                        ) : (
                            <ChevronLeft className="w-5 h-5" />
                        )}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {menuItems
                        .filter((item) => item.visible)
                        .map((item) => {
                            const isActive = location.pathname === item.href
                            const Icon = item.icon

                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    className={clsx(
                                        'sidebar-item touch-target',
                                        isActive && 'active'
                                    )}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0" />
                                    {!collapsed && (
                                        <span className="font-medium animate-fade-in">{item.label}</span>
                                    )}
                                </Link>
                            )
                        })}
                </nav>

                {/* User Section */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom">
                    {profile && !collapsed && (
                        <div className="flex items-center gap-3 px-3 py-3 mb-2 animate-fade-in">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-200 dark:from-gray-600 to-gray-300 dark:to-gray-700 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-white">
                                    {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {profile.full_name || 'Utilizador'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
                                    {profile.role?.replace('_', ' ')}
                                </p>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        className={clsx(
                            'flex items-center gap-3 w-full px-3 py-3 rounded-lg touch-target',
                            'text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200'
                        )}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        {!collapsed && <span className="font-medium">Terminar Sessão</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar (Drawer) */}
            <aside
                className={clsx(
                    'fixed left-0 top-0 z-50 h-screen w-72 flex flex-col',
                    'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
                    'transform transition-transform duration-300 ease-in-out',
                    'lg:hidden',
                    mobileOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* Mobile Header */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-800">
                    <Link to="/dashboard" className="flex items-center gap-3" onClick={handleNavClick}>
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                            <img src="/images/angola-coat-of-arms.png" alt="GPCS Logo" className="w-10 h-10 object-contain" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white text-lg">
                            GPCS
                        </span>
                    </Link>
                    <button
                        onClick={onMobileClose}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors touch-target"
                        aria-label="Fechar menu"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Mobile Navigation */}
                <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                    {menuItems
                        .filter((item) => item.visible)
                        .map((item) => {
                            const isActive = location.pathname === item.href
                            const Icon = item.icon

                            return (
                                <Link
                                    key={item.href}
                                    to={item.href}
                                    onClick={handleNavClick}
                                    className={clsx(
                                        'sidebar-item touch-target',
                                        isActive && 'active'
                                    )}
                                >
                                    <Icon className="w-5 h-5 flex-shrink-0" />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            )
                        })}
                </nav>

                {/* Mobile User Section */}
                <div className="p-3 border-t border-gray-200 dark:border-gray-800 safe-area-inset-bottom">
                    {profile && (
                        <div className="flex items-center gap-3 px-3 py-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-gray-200 dark:from-gray-600 to-gray-300 dark:to-gray-700 rounded-full flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-white">
                                    {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {profile.full_name || 'Utilizador'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
                                    {profile.role?.replace('_', ' ')}
                                </p>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleLogout}
                        className={clsx(
                            'flex items-center gap-3 w-full px-3 py-3 rounded-lg touch-target',
                            'text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all duration-200'
                        )}
                    >
                        <LogOut className="w-5 h-5 flex-shrink-0" />
                        <span className="font-medium">Terminar Sessão</span>
                    </button>
                </div>
            </aside>
        </>
    )
})

export default Sidebar

