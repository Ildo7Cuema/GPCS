import { useState } from 'react'
import { Search, Plus, Menu } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import Button from '../ui/Button'
import NotificationsDropdown from '../notifications/NotificationsDropdown'
import { useMobileMenu } from './DashboardLayout'

interface HeaderProps {
    title: string
    subtitle?: string
    showUploadButton?: boolean
    onUploadClick?: () => void
    onMenuClick?: () => void
}

export default function Header({ title, subtitle, showUploadButton, onUploadClick, onMenuClick }: HeaderProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
    const { profile } = useAuth()
    const navigate = useNavigate()
    const mobileMenu = useMobileMenu()

    // Use prop if provided, otherwise use context
    const handleMenuClick = onMenuClick || mobileMenu?.openMobileMenu

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchQuery.trim()) {
            navigate(`/media?search=${encodeURIComponent(searchQuery)}`)
            setMobileSearchOpen(false)
        }
    }

    return (
        <header className="h-16 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300 safe-area-inset-top">
            {/* Left - Menu Button (mobile) + Title */}
            <div className="flex items-center gap-3">
                {/* Mobile Menu Toggle */}
                {handleMenuClick && (
                    <button
                        onClick={handleMenuClick}
                        className="p-2 -ml-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden touch-target"
                        aria-label="Abrir menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}

                <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white truncate">{title}</h1>
                    {subtitle && <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate hidden sm:block">{subtitle}</p>}
                </div>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
                {/* Desktop Search */}
                <form onSubmit={handleSearch} className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <input
                        type="text"
                        placeholder="Pesquisar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64 pl-10 pr-4 py-2 rounded-lg bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    />
                </form>

                {/* Mobile Search Toggle */}
                <button
                    onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors md:hidden touch-target"
                    aria-label="Pesquisar"
                >
                    <Search className="w-5 h-5" />
                </button>

                {/* Upload Button */}
                {showUploadButton && (
                    <Button
                        onClick={onUploadClick}
                        size="sm"
                        icon={<Plus className="w-4 h-4" />}
                        className="touch-target"
                    >
                        <span className="hidden sm:inline">Upload</span>
                    </Button>
                )}

                {/* Notifications */}
                <NotificationsDropdown />

                {/* Profile Avatar */}
                <div className="flex items-center">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center touch-target">
                        <span className="text-sm font-medium text-white">
                            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Mobile Search Overlay */}
            {mobileSearchOpen && (
                <div className="absolute left-0 right-0 top-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 md:hidden animate-fade-in">
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <input
                            type="text"
                            placeholder="Pesquisar ficheiros..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white text-base placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                        />
                    </form>
                </div>
            )}
        </header>
    )
}
