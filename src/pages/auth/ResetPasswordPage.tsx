import { useState, useEffect, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, CheckCircle, AlertCircle } from 'lucide-react'
import { updatePassword, supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [validSession, setValidSession] = useState<boolean | null>(null)
    const navigate = useNavigate()

    useEffect(() => {
        // Check if user has a valid recovery session
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            setValidSession(!!session)
        }
        checkSession()
    }, [])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError('As palavras-passe não coincidem')
            return
        }

        if (password.length < 6) {
            setError('A palavra-passe deve ter pelo menos 6 caracteres')
            return
        }

        setLoading(true)

        try {
            await updatePassword(password)
            setSuccess(true)
            // Redirect to login after 3 seconds
            setTimeout(() => {
                navigate('/login')
            }, 3000)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao atualizar palavra-passe')
        } finally {
            setLoading(false)
        }
    }

    if (validSession === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    if (!validSession) {
        return (
            <div className="min-h-screen flex items-center justify-center p-8">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-4">Link Inválido ou Expirado</h2>
                    <p className="text-gray-400 mb-8">
                        O link de recuperação que utilizou é inválido ou já expirou.
                        Por favor, solicite um novo link de recuperação.
                    </p>
                    <Link
                        to="/forgot-password"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                    >
                        Solicitar Novo Link
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex relative">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800" />
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
                            Nova Palavra-passe
                        </h1>
                        <p className="text-xl text-emerald-100/80 max-w-md">
                            Escolha uma palavra-passe forte para proteger a sua conta.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Mínimo 6 Caracteres</h3>
                                <p className="text-emerald-100/70 text-sm">Use letras, números e símbolos</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Senha Única</h3>
                                <p className="text-emerald-100/70 text-sm">Não reutilize senhas de outros sites</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <img
                                src="/images/angola-coat-of-arms.png"
                                alt="República de Angola"
                                className="w-14 h-14 object-contain"
                            />
                            <img
                                src="/images/gov-ao-logo.png"
                                alt="gov.ao"
                                className="h-10 object-contain"
                            />
                        </div>
                        <h1 className="text-2xl font-bold text-white">GPCS Media System</h1>
                    </div>

                    {success ? (
                        <div className="text-center">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-4">Palavra-passe Atualizada!</h2>
                            <p className="text-gray-400 mb-8">
                                A sua palavra-passe foi atualizada com sucesso.
                                Será redirecionado para o login em breve.
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                            >
                                Ir para Login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-white">Criar Nova Palavra-passe</h2>
                                <p className="text-gray-400 mt-2">Escolha uma palavra-passe segura</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <p className="text-red-400 text-sm">{error}</p>
                                    </div>
                                )}

                                <Input
                                    label="Nova Palavra-passe"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    icon={<Lock className="w-5 h-5" />}
                                    required
                                />

                                <Input
                                    label="Confirmar Palavra-passe"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    icon={<Lock className="w-5 h-5" />}
                                    required
                                />

                                <Button
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    loading={loading}
                                >
                                    Atualizar Palavra-passe
                                </Button>
                            </form>
                        </>
                    )}
                </div>
            </div>

            {/* Footer */}
            <footer className="absolute bottom-0 left-0 right-0 px-6 py-4 flex items-center justify-between border-t border-gray-800/50 bg-gray-900/50 backdrop-blur-sm">
                <div className="text-xs text-gray-500">
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
    )
}
