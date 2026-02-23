import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, LogIn } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { useToast } from '../../components/ui/Toast'

const REMEMBERED_EMAIL_KEY = 'gpcs_remembered_email'

function getLoginErrorMessage(err: unknown) {
    const raw = err instanceof Error ? err.message : 'Erro ao fazer login'
    const lowered = raw.toLowerCase()

    // Supabase common message when email doesn't exist or password is wrong
    if (lowered.includes('invalid login credentials')) {
        return 'Email não cadastrado ou palavra-passe incorreta.'
    }

    return raw
}

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const navigate = useNavigate()
    const toast = useToast()

    // Load remembered email on mount
    useEffect(() => {
        const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY)
        if (rememberedEmail) {
            setEmail(rememberedEmail)
            setRememberMe(true)
        }
    }, [])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            // Save or remove email based on "remember me" checkbox
            if (rememberMe) {
                localStorage.setItem(REMEMBERED_EMAIL_KEY, email)
            } else {
                localStorage.removeItem(REMEMBERED_EMAIL_KEY)
            }

            await login(email, password)
            navigate('/dashboard')
        } catch (err) {
            const message = getLoginErrorMessage(err)
            setError(message)
            toast.error('Erro ao fazer login', message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col lg:flex-row overflow-auto">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 bg-linear-to-br from-blue-600 via-blue-700 to-blue-900" />
                <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />

                <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
                    <div className="mb-8">
                        <div className="flex items-center gap-4 mb-6">
                            <img
                                src="/images/angola-coat-of-arms.png"
                                alt="República de Angola"
                                className="w-20 h-20 object-contain"
                            />
                            <img
                                src="/images/gov-ao-logo.png"
                                alt="gov.ao"
                                className="h-14 object-contain"
                            />
                        </div>
                        <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4">
                            GPCS - Gestão de Mídia
                        </h1>
                        <p className="text-xl text-blue-100/80 max-w-md">
                            Sistema de Gestão de Media do Gabinete Provincial de Comunicação Social
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Arquivo Digital</h3>
                                <p className="text-blue-100/70 text-sm">Armazene e organize todos os seus ficheiros multimédia</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Acesso Controlado</h3>
                                <p className="text-blue-100/70 text-sm">Gestão de permissões por município e função</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Pesquisa Rápida</h3>
                                <p className="text-blue-100/70 text-sm">Encontre qualquer ficheiro em segundos</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col min-h-screen lg:min-h-0">
                <div className="flex-1 flex items-center justify-center p-6 sm:p-8 pb-24 lg:pb-8">
                    <div className="w-full max-w-md">
                        {/* Mobile Logo */}
                        <div className="lg:hidden text-center mb-8">
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <span className="text-3xl font-bold text-white">G</span>
                            </div>
                            <h1 className="text-2xl font-bold text-white">GPCS Media System</h1>
                        </div>

                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-white">Bem-vindo de volta</h2>
                            <p className="text-gray-400 mt-2">Introduza as suas credenciais para aceder</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                    <p className="text-red-400 text-sm">{error}</p>
                                </div>
                            )}

                            <Input
                                label="Email"
                                type="email"
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                icon={<Mail className="w-5 h-5" />}
                                required
                            />

                            <Input
                                label="Palavra-passe"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                icon={<Lock className="w-5 h-5" />}
                                required
                            />

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                                    />
                                    <span className="text-sm text-gray-400">Lembrar-me</span>
                                </label>
                                <Link to="/forgot-password" className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                                    Esqueceu a palavra-passe?
                                </Link>
                            </div>

                            <Button
                                type="submit"
                                className="w-full"
                                size="lg"
                                loading={loading}
                                icon={<LogIn className="w-5 h-5" />}
                            >
                                Entrar
                            </Button>
                        </form>

                        <p className="text-center text-gray-500 mt-8 text-sm">
                            O acesso a este sistema é por convite.<br />
                            Contacte o administrador para obter acesso.
                        </p>
                    </div>
                </div>

                {/* Footer - Mobile: at bottom of content, Desktop: absolute */}
                <footer className="lg:absolute lg:bottom-0 lg:left-0 lg:right-0 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-800/50 bg-gray-900/50 backdrop-blur-sm safe-area-inset-bottom">
                    <div className="text-xs text-gray-500 text-center sm:text-left">
                        <p>© {new Date().getFullYear()} Gabinete Provincial de Comunicação Social da Huíla.</p>
                        <p>Todos os direitos reservados. República de Angola.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <img
                            src="/images/angola-coat-of-arms.png"
                            alt="República de Angola"
                            className="h-8 w-8 object-contain opacity-60"
                        />
                        <img
                            src="/images/gov-ao-logo.png"
                            alt="gov.ao"
                            className="h-6 object-contain opacity-60"
                        />
                    </div>
                </footer>
            </div>
        </div>
    )
}

