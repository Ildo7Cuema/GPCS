import { useState, useEffect, createContext, useContext, type ReactNode } from 'react'
import Sidebar from './Sidebar'
import { clsx } from 'clsx'

interface MobileMenuContextType {
    openMobileMenu: () => void
}

const MobileMenuContext = createContext<MobileMenuContextType | null>(null)

export function useMobileMenu() {
    const context = useContext(MobileMenuContext)
    return context
}

interface DashboardLayoutProps {
    children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Close mobile menu on window resize to desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setMobileMenuOpen(false)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [mobileMenuOpen])

    const openMobileMenu = () => setMobileMenuOpen(true)

    return (
        <MobileMenuContext.Provider value={{ openMobileMenu }}>
            <div className="min-h-screen transition-colors duration-300">
                {/* Mobile backdrop */}
                <div
                    className={clsx(
                        'sidebar-backdrop lg:hidden',
                        mobileMenuOpen && 'open'
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-hidden="true"
                />

                <Sidebar
                    collapsed={sidebarCollapsed}
                    onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                    mobileOpen={mobileMenuOpen}
                    onMobileClose={() => setMobileMenuOpen(false)}
                    onMobileOpen={() => setMobileMenuOpen(true)}
                />

                <main
                    className={clsx(
                        'transition-all duration-300 ease-in-out min-h-screen',
                        // Mobile: no margin (sidebar is overlay drawer)
                        // Desktop: use sidebar margin
                        'lg:ml-64',
                        sidebarCollapsed && 'lg:ml-20'
                    )}
                >
                    {children}
                </main>
            </div>
        </MobileMenuContext.Provider>
    )
}
