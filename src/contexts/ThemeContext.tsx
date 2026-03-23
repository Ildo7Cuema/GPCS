import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light'

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    resolvedTheme: 'light'
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>('light')

    const [resolvedTheme, setResolvedTheme] = useState<'light'>('light')

    useEffect(() => {
        const root = window.document.documentElement

        root.classList.remove('dark')
        root.classList.add('light')
        setResolvedTheme('light')
        localStorage.setItem('gpcs-theme', 'light')
    }, [theme])

    const setTheme = (t: Theme) => {
        setThemeState(t)
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
