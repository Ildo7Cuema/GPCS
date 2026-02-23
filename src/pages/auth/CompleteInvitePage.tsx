import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Lock, CheckCircle, AlertCircle, Building2 } from 'lucide-react'
import { getInvitationByToken, completeInvitation } from '../../lib/supabase'
import type { UserInvitation } from '../../lib/types'
import { roleDisplayNames } from '../../lib/types'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { LoadingScreen } from '../../components/ui/Spinner'
import { useToast } from '../../components/ui/Toast'

export default function CompleteInvitePage() {
    const { token } = useParams<{ token: string }>()
    const navigate = useNavigate()
    const toast = useToast()

    const [invitation, setInvitation] = useState<UserInvitation | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [completed, setCompleted] = useState(false)

    useEffect(() => {
        if (token) {
            validateToken(token)
        } else {
            setError('Token de convite não fornecido.')
            setLoading(false)
        }
    }, [token])

    const validateToken = async (tokenValue: string) => {
        try {
            const data = await getInvitationByToken(tokenValue)
            if (data) {
                setInvitation(data)
            } else {
                setError('Este convite é inválido ou já expirou.')
            }
        } catch (err) {
            console.error('Error validating invitation:', err)
            setError('Erro ao validar o convite. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)

        if (password !== confirmPassword) {
            setError('As palavras-passe não coincidem.')
            return
        }

        if (password.length < 6) {
            setError('A palavra-passe deve ter pelo menos 6 caracteres.')
            return
        }

        if (!token) return

        setSubmitting(true)
        try {
            await completeInvitation(token, password)
            setCompleted(true)
            toast.success('Conta criada com sucesso!', 'Agora pode fazer login.')
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao criar conta.'
            setError(message)
            toast.error('Erro', message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return <LoadingScreen message="A validar convite..." />
    }

    // Success state
    if (completed) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
                <div className="w-full max-w-md text-center">
                    <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Conta Criada com Sucesso!</h1>
                    <p className="text-gray-400 mb-8">
                        A sua conta foi criada. Agora pode fazer login com o seu email e palavra-passe.
                    </p>
                    <Button onClick={() => navigate('/login')} className="w-full" size="lg">
                        Ir para Login
                    </Button>
                </div>
            </div>
        )
    }

    // Error state (invalid/expired token)
    if (!invitation) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
                <div className="w-full max-w-md text-center">
                    <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Convite Inválido</h1>
                    <p className="text-gray-400 mb-8">
                        {error || 'Este link de convite é inválido ou já expirou. Contacte o administrador para obter um novo convite.'}
                    </p>
                    <Link to="/login">
                        <Button variant="secondary" className="w-full" size="lg">
                            Voltar ao Login
                        </Button>
                    </Link>
                </div>
            </div>
        )
    }

    // Form state
    return (
        <div className="min-h-screen flex">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-green-800" />
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
                            Bem-vindo à Equipa!
                        </h1>
                        <p className="text-xl text-emerald-100/80 max-w-md">
                            Foi convidado para participar no GPCS Media System. Complete o seu registo para começar.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                                <CheckCircle className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Acesso Aprovado</h3>
                                <p className="text-emerald-100/70 text-sm">O seu acesso foi pré-aprovado pelo administrador</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center shrink-0">
                                <Lock className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Defina a sua Senha</h3>
                                <p className="text-emerald-100/70 text-sm">Apenas precisa de definir a sua palavra-passe</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-900">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl font-bold text-white">G</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white">GPCS Media System</h1>
                    </div>

                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-bold text-white">Complete o seu Registo</h2>
                        <p className="text-gray-400 mt-2">Defina a sua palavra-passe para activar a conta</p>
                    </div>

                    {/* Invitation Details */}
                    <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Nome</p>
                                <p className="text-white font-medium">{invitation.full_name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Role</p>
                                <p className="text-white font-medium">{roleDisplayNames[invitation.role]}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Email</p>
                                <p className="text-white font-medium truncate">{invitation.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">Município</p>
                                <p className="text-white font-medium flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-gray-400" />
                                    {invitation.municipio?.name || invitation.province || '-'}
                                </p>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        )}

                        <Input
                            label="Palavra-passe"
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
                            loading={submitting}
                            icon={<CheckCircle className="w-5 h-5" />}
                        >
                            Activar Conta
                        </Button>
                    </form>

                    <p className="text-center text-gray-400 mt-8">
                        Já tem uma conta?{' '}
                        <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                            Entrar
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
