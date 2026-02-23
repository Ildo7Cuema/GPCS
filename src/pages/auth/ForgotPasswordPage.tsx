import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { resetPassword } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setError(null)
        setLoading(true)

        try {
            await resetPassword(email)
            setSuccess(true)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao enviar email de recuperação')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex relative">
            {/* Left Side - Branding */}
            <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900" />
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
                            Recuperar Acesso
                        </h1>
                        <p className="text-xl text-blue-100/80 max-w-md">
                            Não se preocupe, acontece com todos. Vamos ajudá-lo a recuperar o acesso à sua conta.
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Email de Recuperação</h3>
                                <p className="text-blue-100/70 text-sm">Receberá um link seguro no seu email</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-white font-semibold">Processo Seguro</h3>
                                <p className="text-blue-100/70 text-sm">Verificação com link temporário</p>
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
                            <h2 className="text-2xl font-bold text-white mb-4">Email Enviado!</h2>
                            <p className="text-gray-400 mb-8">
                                Enviámos um link de recuperação para <span className="text-white font-medium">{email}</span>.
                                Verifique a sua caixa de entrada e siga as instruções.
                            </p>
                            <p className="text-gray-500 text-sm mb-6">
                                Não recebeu o email? Verifique a pasta de spam ou tente novamente.
                            </p>
                            <Link
                                to="/login"
                                className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Voltar ao login
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-white">Recuperar Palavra-passe</h2>
                                <p className="text-gray-400 mt-2">Introduza o email associado à sua conta</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
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

                                <Button
                                    type="submit"
                                    className="w-full"
                                    size="lg"
                                    loading={loading}
                                >
                                    Enviar Link de Recuperação
                                </Button>
                            </form>

                            <p className="text-center text-gray-400 mt-8">
                                Lembrou-se da palavra-passe?{' '}
                                <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
                                    Voltar ao login
                                </Link>
                            </p>
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
