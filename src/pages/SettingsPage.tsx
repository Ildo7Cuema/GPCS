import { useState, useEffect, type FormEvent } from 'react'
import { User, Lock, Mail, Bell, Shield, Palette, Save, Check, AlertCircle } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import Header from '../components/layout/Header'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useSettings } from '../contexts/SettingsContext'
import { updateProfile, updatePassword, getNotificationPreferences, updateNotificationPreferences } from '../lib/supabase'
import { RoleBadge } from '../components/ui/Badge'

type SettingsTab = 'profile' | 'security' | 'notifications' | 'appearance' | 'system'

export default function SettingsPage() {
    const { profile, user, refreshProfile } = useAuth()
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile')

    // Profile form state
    const [fullName, setFullName] = useState(profile?.full_name || '')
    const [email] = useState(user?.email || '')
    const [profileLoading, setProfileLoading] = useState(false)
    const [profileSuccess, setProfileSuccess] = useState(false)
    const [profileError, setProfileError] = useState<string | null>(null)

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordLoading, setPasswordLoading] = useState(false)
    const [passwordSuccess, setPasswordSuccess] = useState(false)
    const [passwordError, setPasswordError] = useState<string | null>(null)

    // Notification settings
    const [emailNotifications, setEmailNotifications] = useState(true)
    const [uploadNotifications, setUploadNotifications] = useState(true)
    const [securityAlerts, setSecurityAlerts] = useState(true)
    const [notifSaved, setNotifSaved] = useState(false)

    // Appearance settings
    const { theme, setTheme } = useTheme()
    const { compactMode, setCompactMode } = useSettings()

    const isSuperadmin = profile?.role === 'superadmin'

    // Load notification preferences on mount
    useEffect(() => {
        if (user) {
            loadNotificationPreferences()
        }
    }, [user])

    const loadNotificationPreferences = async () => {
        if (!user) return
        try {
            const prefs = await getNotificationPreferences(user.id)
            if (prefs) {
                setEmailNotifications(prefs.email_notifications)
                setUploadNotifications(prefs.upload_notifications)
                setSecurityAlerts(prefs.security_alerts)
            }
        } catch (err) {
            console.error('Error loading preferences:', err)
        }
    }

    const handleNotificationChange = async (
        field: 'email_notifications' | 'upload_notifications' | 'security_alerts',
        value: boolean
    ) => {
        // Update local state immediately
        if (field === 'email_notifications') setEmailNotifications(value)
        if (field === 'upload_notifications') setUploadNotifications(value)
        if (field === 'security_alerts') setSecurityAlerts(value)

        // Save to database
        if (!user) return
        try {
            await updateNotificationPreferences(user.id, { [field]: value })
            setNotifSaved(true)
            setTimeout(() => setNotifSaved(false), 2000)
        } catch (err) {
            console.error('Error saving preference:', err)
            // Revert on error
            if (field === 'email_notifications') setEmailNotifications(!value)
            if (field === 'upload_notifications') setUploadNotifications(!value)
            if (field === 'security_alerts') setSecurityAlerts(!value)
        }
    }

    const tabs = [
        { id: 'profile' as SettingsTab, label: 'Perfil', icon: User },
        { id: 'security' as SettingsTab, label: 'Segurança', icon: Lock },
        { id: 'notifications' as SettingsTab, label: 'Notificações', icon: Bell },
        { id: 'appearance' as SettingsTab, label: 'Aparência', icon: Palette },
        ...(isSuperadmin ? [{ id: 'system' as SettingsTab, label: 'Sistema', icon: Shield }] : []),
    ]

    const handleProfileSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setProfileLoading(true)
        setProfileError(null)
        setProfileSuccess(false)

        try {
            if (user) {
                await updateProfile(user.id, { full_name: fullName })
                await refreshProfile()
                setProfileSuccess(true)
                setTimeout(() => setProfileSuccess(false), 3000)
            }
        } catch (err) {
            setProfileError(err instanceof Error ? err.message : 'Erro ao atualizar perfil')
        } finally {
            setProfileLoading(false)
        }
    }

    const handlePasswordSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setPasswordLoading(true)
        setPasswordError(null)
        setPasswordSuccess(false)

        if (newPassword !== confirmPassword) {
            setPasswordError('As palavras-passe não coincidem')
            setPasswordLoading(false)
            return
        }

        if (newPassword.length < 6) {
            setPasswordError('A palavra-passe deve ter pelo menos 6 caracteres')
            setPasswordLoading(false)
            return
        }

        try {
            await updatePassword(newPassword)
            setPasswordSuccess(true)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
            setTimeout(() => setPasswordSuccess(false), 3000)
        } catch (err) {
            setPasswordError(err instanceof Error ? err.message : 'Erro ao atualizar palavra-passe')
        } finally {
            setPasswordLoading(false)
        }
    }

    const renderProfileTab = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informações do Perfil</h3>
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                    {profileError && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <p className="text-red-400 text-sm">{profileError}</p>
                        </div>
                    )}

                    {profileSuccess && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3">
                            <Check className="w-5 h-5 text-emerald-400" />
                            <p className="text-emerald-400 text-sm">Perfil atualizado com sucesso!</p>
                        </div>
                    )}

                    <Input
                        label="Nome Completo"
                        type="text"
                        placeholder="Seu nome completo"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        icon={<User className="w-5 h-5" />}
                    />

                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        disabled
                        icon={<Mail className="w-5 h-5" />}
                    />

                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Função</label>
                            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <RoleBadge role={profile?.role || 'leitor'} />
                                <span className="text-gray-600 dark:text-gray-400 text-sm">
                                    {profile?.role === 'superadmin' && 'Acesso total ao sistema'}
                                    {profile?.role === 'admin_municipal' && 'Administração municipal'}
                                    {profile?.role === 'tecnico' && 'Gestão de conteúdo'}
                                    {profile?.role === 'leitor' && 'Apenas visualização'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {profile?.municipio && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Município</label>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white">
                                {profile.municipio.name}
                            </div>
                        </div>
                    )}

                    <div className="pt-4">
                        <Button
                            type="submit"
                            loading={profileLoading}
                            icon={<Save className="w-5 h-5" />}
                        >
                            Guardar Alterações
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )

    const renderSecurityTab = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Alterar Palavra-passe</h3>
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    {passwordError && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400" />
                            <p className="text-red-400 text-sm">{passwordError}</p>
                        </div>
                    )}

                    {passwordSuccess && (
                        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-3">
                            <Check className="w-5 h-5 text-emerald-400" />
                            <p className="text-emerald-400 text-sm">Palavra-passe atualizada com sucesso!</p>
                        </div>
                    )}

                    <Input
                        label="Palavra-passe Atual"
                        type="password"
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        icon={<Lock className="w-5 h-5" />}
                    />

                    <Input
                        label="Nova Palavra-passe"
                        type="password"
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        icon={<Lock className="w-5 h-5" />}
                    />

                    <Input
                        label="Confirmar Nova Palavra-passe"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        icon={<Lock className="w-5 h-5" />}
                    />

                    <div className="pt-4">
                        <Button
                            type="submit"
                            loading={passwordLoading}
                            icon={<Lock className="w-5 h-5" />}
                        >
                            Atualizar Palavra-passe
                        </Button>
                    </div>
                </form>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Sessões Ativas</h3>
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                                <Shield className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-gray-900 dark:text-white font-medium">Sessão Atual</p>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Navegador • {new Date().toLocaleDateString('pt-PT')}</p>
                            </div>
                        </div>
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                            Ativa
                        </span>
                    </div>
                </Card>
            </div>
        </div>
    )

    const renderNotificationsTab = () => (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Preferências de Notificações</h3>
                {notifSaved && (
                    <span className="text-emerald-500 dark:text-emerald-400 text-sm flex items-center gap-1">
                        <Check className="w-4 h-4" /> Guardado
                    </span>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <div>
                            <p className="text-gray-900 dark:text-white font-medium">Notificações por Email</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Receber atualizações por email</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={emailNotifications}
                            onChange={(e) => handleNotificationChange('email_notifications', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <div>
                            <p className="text-gray-900 dark:text-white font-medium">Novos Uploads</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Notificar quando novos ficheiros forem carregados</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={uploadNotifications}
                            onChange={(e) => handleNotificationChange('upload_notifications', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <div>
                            <p className="text-gray-900 dark:text-white font-medium">Alertas de Segurança</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Receber alertas sobre atividades suspeitas</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={securityAlerts}
                            onChange={(e) => handleNotificationChange('security_alerts', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            </div>
        </div>
    )

    const renderAppearanceTab = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Aparência</h3>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tema</label>
                <div className="grid grid-cols-3 gap-3">
                    {(['dark', 'light', 'system'] as const).map((t) => (
                        <button
                            key={t}
                            type="button"
                            onClick={() => setTheme(t)}
                            className={`p-4 rounded-lg border-2 transition-all ${theme === t
                                ? 'border-blue-500 bg-blue-500/10'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                        >
                            <div className={`w-full h-16 rounded mb-2 border border-gray-200 dark:border-gray-700 ${t === 'dark' ? 'bg-gray-900' : t === 'light' ? 'bg-white' : 'bg-gradient-to-r from-gray-900 to-white'
                                }`} />
                            <p className="text-gray-900 dark:text-white text-sm font-medium capitalize">
                                {t === 'dark' ? 'Escuro' : t === 'light' ? 'Claro' : 'Sistema'}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <div>
                    <p className="text-gray-900 dark:text-white font-medium">Modo Compacto</p>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Reduzir espaçamento para ver mais conteúdo</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={compactMode}
                        onChange={(e) => setCompactMode(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
            </div>
        </div>
    )

    const renderSystemTab = () => (
        <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white mb-4">Configurações do Sistema</h3>
            <p className="text-gray-400">Apenas disponível para Superadministradores</p>

            <div className="grid gap-4">
                <Card className="p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h4 className="text-gray-900 dark:text-white font-medium">Informações do Sistema</h4>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">GPCS Media System v1.0.0</p>
                        </div>
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                            Online
                        </span>
                    </div>
                </Card>

                <Card className="p-4">
                    <h4 className="text-gray-900 dark:text-white font-medium mb-3">Base de Dados</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">Fornecedor</p>
                            <p className="text-gray-900 dark:text-white">Supabase (PostgreSQL)</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">Região</p>
                            <p className="text-gray-900 dark:text-white">EU West</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <h4 className="text-gray-900 dark:text-white font-medium mb-3">Armazenamento</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">Serviço</p>
                            <p className="text-gray-900 dark:text-white">Supabase Storage</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">Bucket</p>
                            <p className="text-gray-900 dark:text-white">media-archive</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4">
                    <h4 className="text-gray-900 dark:text-white font-medium mb-3">Licença</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">Tipo</p>
                            <p className="text-gray-900 dark:text-white">Institucional</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">Validade</p>
                            <p className="text-gray-900 dark:text-white">Ilimitada</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">Organização</p>
                            <p className="text-gray-900 dark:text-white">Gabinete Provincial de Comunicação Social</p>
                        </div>
                        <div>
                            <p className="text-gray-500 dark:text-gray-400">Província</p>
                            <p className="text-gray-900 dark:text-white">Huíla</p>
                        </div>
                    </div>
                </Card>

                <Card className="p-4 border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-amber-400 font-medium">Zona de Administração</h4>
                            <p className="text-gray-400 text-sm mt-1">
                                As configurações avançadas do sistema podem ser acedidas através do painel do Supabase.
                            </p>
                            <a
                                href="https://supabase.com/dashboard"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block"
                            >
                                Abrir Dashboard Supabase →
                            </a>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    )

    return (
        <DashboardLayout>
            <Header
                title="Definições"
                subtitle="Gerir as suas preferências e configurações da conta"
            />

            <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar Tabs */}
                    <div className="lg:w-64 flex-shrink-0">
                        <nav className="space-y-1">
                            {tabs.map((tab) => {
                                const Icon = tab.icon
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === tab.id
                                            ? 'bg-blue-600/20 text-blue-500 dark:text-blue-400 border-l-2 border-blue-500'
                                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800/50'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="font-medium">{tab.label}</span>
                                    </button>
                                )
                            })}
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <Card className="p-6">
                            {activeTab === 'profile' && renderProfileTab()}
                            {activeTab === 'security' && renderSecurityTab()}
                            {activeTab === 'notifications' && renderNotificationsTab()}
                            {activeTab === 'appearance' && renderAppearanceTab()}
                            {activeTab === 'system' && renderSystemTab()}
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    )
}
