import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

interface SettingsContextType {
    compactMode: boolean
    setCompactMode: (value: boolean) => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

const STORAGE_KEY = 'gpcs-compact-mode'

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [compactMode, setCompactModeState] = useState<boolean>(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY)
            return stored === 'true'
        }
        return false
    })

    const isFirstRun = useRef(true)

    useEffect(() => {
        const root = window.document.documentElement

        // On subsequent toggles (not initial load), enable transition briefly
        if (isFirstRun.current) {
            isFirstRun.current = false
        } else {
            root.classList.add('compact-transitioning')
            setTimeout(() => root.classList.remove('compact-transitioning'), 250)
        }

        if (compactMode) {
            root.classList.add('compact')
        } else {
            root.classList.remove('compact')
        }

        localStorage.setItem(STORAGE_KEY, String(compactMode))
    }, [compactMode])

    // Sync across browser tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) {
                setCompactModeState(e.newValue === 'true')
            }
        }

        window.addEventListener('storage', handleStorageChange)
        return () => window.removeEventListener('storage', handleStorageChange)
    }, [])

    const setCompactMode = (value: boolean) => {
        setCompactModeState(value)
    }

    return (
        <SettingsContext.Provider value={{ compactMode, setCompactMode }}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings() {
    const context = useContext(SettingsContext)
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}
