import { createContext, useContext, useEffect, useState, useRef, useMemo, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, getProfile, signIn, signUp, signOut } from '../lib/supabase'
import { cache } from '../lib/cache'
import type { Profile } from '../lib/types'

/** Supabase AuthApiError has status (HTTP) and code (e.g. over_email_send_rate_limit) */
function getSupabaseAuthError(err: unknown): { code?: string; status?: number; message: string } | null {
    if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
        const obj = err as { message: string; code?: string; status?: number }
        return { code: obj.code, status: obj.status, message: obj.message }
    }
    return null
}

function normalizeAuthError(err: unknown, fallback: string) {
    const raw = err instanceof Error ? err.message : String(err ?? fallback)
    const api = getSupabaseAuthError(err)
    const code = api?.code ?? ''
    const status = api?.status
    const lowered = raw.toLowerCase()

    if (status === 429 || code === 'over_email_send_rate_limit' || lowered.includes('email rate limit exceeded')) {
        return 'Limite de envio de emails excedido. O limite pode levar até 1 hora a repor. Tente mais tarde ou contacte o administrador.'
    }
    if (code === 'over_request_rate_limit') {
        return 'Muitas tentativas a partir do seu endereço. Aguarde alguns minutos e tente novamente.'
    }
    if (code === 'invalid_credentials' || lowered.includes('invalid login credentials')) {
        return 'Email não cadastrado ou palavra-passe incorreta.'
    }
    if (code === 'email_exists' || code === 'user_already_exists') {
        return 'Este email já está registado. Use outro email ou faça login.'
    }
    if (code === 'email_address_not_authorized') {
        return 'Envio de emails não autorizado para este endereço. Contacte o administrador do sistema.'
    }
    if (code === 'email_provider_disabled' || code === 'signup_disabled') {
        return 'Registo desativado. Contacte o administrador.'
    }
    if (code === 'weak_password') {
        return 'Palavra-passe fraca. Use pelo menos 6 caracteres e uma combinação mais forte.'
    }

    return raw
}

interface AuthContextType {
    user: User | null
    profile: Profile | null
    session: Session | null
    loading: boolean        // true only during initial session check
    profileLoading: boolean // true while fetching profile in background
    error: string | null
    login: (email: string, password: string) => Promise<void>
    register: (email: string, password: string, fullName: string, municipioId?: string, province?: string) => Promise<void>
    logout: () => Promise<void>
    refreshProfile: () => Promise<void>
}

const missingProviderError = new Error('O hook useAuth deve ser usado dentro de um AuthProvider.')

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    profileLoading: false,
    error: null,
    login: async () => { throw missingProviderError },
    register: async () => { throw missingProviderError },
    logout: async () => { throw missingProviderError },
    refreshProfile: async () => { throw missingProviderError },
})

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)
    const [profileLoading, setProfileLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const mountedRef = useRef(true)

    const fetchProfile = async (userId: string, retryCount = 0): Promise<void> => {
        if (!mountedRef.current) return
        setProfileLoading(true)
        try {
            const cacheKey = `profile:${userId}`
            // Check in-memory cache first — avoids an extra round-trip on hot navigations
            const cached = cache.get<Profile>(cacheKey)
            if (cached) {
                if (mountedRef.current) setProfile(cached)
                return
            }

            const profileData = await Promise.race([
                getProfile(userId),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Profile fetch timeout')), 10000)
                ),
            ])

            if (profileData && mountedRef.current) {
                cache.set(cacheKey, profileData, 120_000) // cache 2 minutes
                setProfile(profileData)
            }
        } catch (err) {
            if (retryCount < 2) {
                console.log(`Retrying profile fetch (attempt ${retryCount + 1})...`)
                await new Promise(resolve => setTimeout(resolve, 1000))
                return fetchProfile(userId, retryCount + 1)
            }
            console.warn('Error fetching profile after retries:', err)
        } finally {
            if (mountedRef.current) setProfileLoading(false)
        }
    }

    useEffect(() => {
        mountedRef.current = true

        const initializeAuth = async () => {
            try {
                // Race the session check with a 5s timeout
                const result = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Auth timeout')), 5000)
                    ),
                ]) as Awaited<ReturnType<typeof supabase.auth.getSession>>

                if (mountedRef.current && result.data?.session) {
                    setSession(result.data.session)
                    setUser(result.data.session.user)
                    // ✅ KEY OPTIMIZATION: release the loading gate immediately,
                    // then fetch profile in background without blocking the UI
                    setLoading(false)
                    fetchProfile(result.data.session.user.id)
                    return
                }
            } catch (err) {
                console.warn('Auth initialization warning:', err)
            }
            if (mountedRef.current) setLoading(false)
        }

        initializeAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!mountedRef.current) return

                setSession(session)
                setUser(session?.user ?? null)

                if (session?.user) {
                    // Don't await — fetch profile in background
                    fetchProfile(session.user.id)
                } else {
                    setProfile(null)
                    // Clear profile cache on logout
                    cache.invalidate('profile:')
                }

                setLoading(false)
            }
        )

        return () => {
            mountedRef.current = false
            subscription.unsubscribe()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const login = async (email: string, password: string) => {
        try {
            setLoading(true)
            setError(null)
            await signIn(email, password)
        } catch (err) {
            const message = normalizeAuthError(err, 'Erro ao fazer login')
            setError(message)
            throw new Error(message)
        } finally {
            setLoading(false)
        }
    }

    const register = async (email: string, password: string, fullName: string, municipioId?: string, province?: string) => {
        try {
            setLoading(true)
            setError(null)
            await signUp(email, password, fullName, municipioId, province)
        } catch (err) {
            const message = normalizeAuthError(err, 'Erro ao registar')
            setError(message)
            throw new Error(message)
        } finally {
            setLoading(false)
        }
    }

    const logout = async () => {
        try {
            setLoading(true)
            setError(null)
            await signOut()
            setUser(null)
            setProfile(null)
            setSession(null)
            cache.clear()
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao terminar sessão'
            setError(message)
            throw err
        } finally {
            setLoading(false)
        }
    }

    const refreshProfile = async () => {
        if (user) {
            // Invalidate cache so fresh data is fetched
            cache.invalidate(`profile:${user.id}`)
            await fetchProfile(user.id)
        }
    }

    const value = useMemo(() => ({
        user,
        profile,
        session,
        loading,
        profileLoading,
        error,
        login,
        register,
        logout,
        refreshProfile,
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [user, profile, session, loading, profileLoading, error])

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
