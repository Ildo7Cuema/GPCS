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
        <header
            className="h-16 backdrop-blur-sm px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300 safe-area-inset-top"
            style={{
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                borderBottom: '1px solid #e2e8f0',
            }}
        >
            {/* Left - Menu Button (mobile) + Title */}
            <div className="flex items-center gap-3">
                {/* Mobile Menu Toggle */}
                {handleMenuClick && (
                    <button
                        onClick={handleMenuClick}
                        className="p-2 -ml-2 text-gray-500 hover:text-slate-800 hover:bg-gray-100 rounded-lg transition-colors lg:hidden touch-target"
                        aria-label="Abrir menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}

                <div className="min-w-0">
                    <h1 className="text-lg sm:text-xl font-semibold text-slate-800 truncate">{title}</h1>
                    {subtitle && <p className="text-xs sm:text-sm text-gray-500 truncate hidden sm:block">{subtitle}</p>}
                </div>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
                {/* Desktop Search */}
                <form onSubmit={handleSearch} className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Pesquisar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-64 pl-10 pr-4 py-2 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
                        style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b' }}
                    />
                </form>

                {/* Mobile Search Toggle */}
                <button
                    onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                    className="p-2 text-gray-500 hover:text-slate-800 hover:bg-gray-100 rounded-lg transition-colors md:hidden touch-target"
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
                <div
                    className="absolute left-0 right-0 top-full border-b p-4 md:hidden animate-fade-in"
                    style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
                >
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Pesquisar ficheiros..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                            className="w-full pl-10 pr-4 py-3 rounded-xl text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                            style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b' }}
                        />
                    </form>
                </div>
            )}
        </header>
    )
}
