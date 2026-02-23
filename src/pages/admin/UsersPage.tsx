import { useState, useEffect } from 'react'
import { Search, Edit2, Trash2, UserPlus, Copy, Clock, X, Building2 } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Header from '../../components/layout/Header'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import { RoleBadge } from '../../components/ui/Badge'
import { getUsers, updateUserRole, updateProfile, getMunicipios, getAreas, deleteUser, createInvitation, getPendingInvitations, cancelInvitation, getDireccoesProvinciais, getDepartamentosProvinciais } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { roleDisplayNames, type UserInvitation } from '../../lib/types'
import { PROVINCES } from '../../lib/constants'
import type { Profile, Municipio, Area, UserRole, DireccaoProvincial, DepartamentoProvincial, SourceType } from '../../lib/types'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

export default function UsersPage() {
    const [users, setUsers] = useState<Profile[]>([])
    const [municipios, setMunicipios] = useState<Municipio[]>([])
    const [areas, setAreas] = useState<Area[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [editUser, setEditUser] = useState<Profile | null>(null)
    const [editRole, setEditRole] = useState<UserRole>('leitor')
    const [editSourceType, setEditSourceType] = useState<string>('municipio')
    const [editDireccaoId, setEditDireccaoId] = useState('')
    const [editDepartamentoId, setEditDepartamentoId] = useState('')
    const [editMunicipioId, setEditMunicipioId] = useState('')
    const [editProvince, setEditProvince] = useState('')
    const [saving, setSaving] = useState(false)
    const [deleteUserModal, setDeleteUserModal] = useState<Profile | null>(null)
    const [deleting, setDeleting] = useState(false)
    const { profile: currentUser, user } = useAuth()
    const toast = useToast()

    // Invitation states
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteFullName, setInviteFullName] = useState('')
    const [inviteRole, setInviteRole] = useState<UserRole>('leitor')
    const [inviteProvince, setInviteProvince] = useState('')
    const [inviteMunicipioId, setInviteMunicipioId] = useState('')
    const [inviteDireccaoId, setInviteDireccaoId] = useState('')
    const [inviteDepartamentoId, setInviteDepartamentoId] = useState('')

    // Provincial Data
    const [direccoes, setDireccoes] = useState<DireccaoProvincial[]>([])
    const [departamentos, setDepartamentos] = useState<DepartamentoProvincial[]>([])

    const [sendingInvite, setSendingInvite] = useState(false)
    const [pendingInvitations, setPendingInvitations] = useState<UserInvitation[]>([])
    const [copiedLink, setCopiedLink] = useState<string | null>(null)
    const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    useEffect(() => {
        if (inviteRole === 'direccao_provincial' || inviteRole === 'departamento_comunicacao' || inviteRole === 'departamento_informacao') {
            loadProvincialData()
        }
    }, [inviteRole])

    // Also load provincial data when editing a provincial role
    useEffect(() => {
        if (editRole === 'direccao_provincial' || editRole === 'departamento_comunicacao' || editRole === 'departamento_informacao') {
            loadProvincialData()
        }
    }, [editRole])

    // Load departments when edit direccao changes
    useEffect(() => {
        if (editDireccaoId) {
            getDepartamentosProvinciais(editDireccaoId)
                .then(setDepartamentos)
                .catch(console.error)
        }
    }, [editDireccaoId])

    const loadData = async () => {
        try {
            const [usersData, municipiosData, areasData, invitationsData] = await Promise.all([
                getUsers(),
                getMunicipios(),
                getAreas(),
                currentUser?.role === 'superadmin' ? getPendingInvitations() : Promise.resolve([]),
            ])
            setUsers(usersData)
            setMunicipios(municipiosData)
            setAreas(areasData)
            setPendingInvitations(invitationsData)
        } catch (err) {
            console.error('Error loading data:', err)
        } finally {
            setLoading(false)
        }
    }

    const loadProvincialData = async () => {
        try {
            const direccoesData = await getDireccoesProvinciais()
            setDireccoes(direccoesData)
            if (inviteDireccaoId) {
                const depData = await getDepartamentosProvinciais(inviteDireccaoId)
                setDepartamentos(depData)
            }
        } catch (err) {
            console.error('Error loading provincial data:', err)
        }
    }

    // Load departments when direccao changes
    useEffect(() => {
        if (inviteDireccaoId) {
            getDepartamentosProvinciais(inviteDireccaoId)
                .then(setDepartamentos)
                .catch(console.error)
        } else {
            setDepartamentos([])
        }
    }, [inviteDireccaoId])

    const filteredUsers = users.filter(user =>
        user.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        user.role?.toLowerCase().includes(search.toLowerCase())
    )

    const handleEditClick = (user: Profile) => {
        setEditUser(user)
        setEditRole(user.role)
        setEditSourceType(user.source_type || 'municipio')
        setEditDireccaoId(user.direccao_provincial_id || '')
        setEditDepartamentoId(user.departamento_provincial_id || '')
        setEditMunicipioId(user.municipio_id || '')
        setEditProvince(user.province || '')
    }

    const handleSaveRole = async () => {
        if (!editUser) return

        setSaving(true)
        try {
            const isEditProvincial = editRole === 'direccao_provincial' || editRole === 'departamento_comunicacao' || editRole === 'departamento_informacao'

            // Update role
            await updateUserRole(editUser.id, editRole)

            // Update provincial/municipal fields
            await updateProfile(editUser.id, {
                source_type: isEditProvincial ? 'provincial' : 'municipio',
                direccao_provincial_id: isEditProvincial ? (editDireccaoId || null) : null,
                departamento_provincial_id: isEditProvincial ? (editDepartamentoId || null) : null,
                municipio_id: !isEditProvincial ? (editMunicipioId || null) : null,
                province: editProvince || null,
            } as Partial<Profile>)

            setUsers(users.map(u => u.id === editUser.id ? {
                ...u,
                role: editRole,
                source_type: isEditProvincial ? 'provincial' : 'municipio',
                direccao_provincial_id: isEditProvincial ? (editDireccaoId || null) : null,
                departamento_provincial_id: isEditProvincial ? (editDepartamentoId || null) : null,
            } as Profile : u))
            setEditUser(null)
            toast.success('Utilizador atualizado com sucesso')
        } catch (err) {
            console.error('Error updating user:', err)
            toast.error('Erro ao atualizar utilizador')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteClick = (user: Profile) => {
        setDeleteUserModal(user)
    }

    const handleConfirmDelete = async () => {
        if (!deleteUserModal) return

        setDeleting(true)
        try {
            await deleteUser(deleteUserModal.id)
            setUsers(users.filter(u => u.id !== deleteUserModal.id))
            setDeleteUserModal(null)
        } catch (err) {
            console.error('Error deleting user:', err)
            toast.error('Erro ao eliminar utilizador', err instanceof Error ? err.message : 'Não foi possível eliminar o utilizador')
        } finally {
            setDeleting(false)
        }
    }

    const canManageUser = (user: Profile) => {
        if (!currentUser || user.id === currentUser.id) return false
        if (currentUser.role === 'superadmin') return true
        if (currentUser.role === 'admin_municipal' && currentUser.municipio_id === user.municipio_id) {
            return user.role !== 'superadmin' && user.role !== 'admin_municipal'
        }
        return false
    }

    const getMunicipioName = (id: string | null) => {
        if (!id) return '-'
        return municipios.find(m => m.id === id)?.name || '-'
    }

    const getAreaName = (id: string | null) => {
        if (!id) return '-'
        return areas.find(a => a.id === id)?.name || '-'
    }

    // Invitation handlers
    const resetInviteForm = () => {
        setInviteEmail('')
        setInviteFullName('')
        setInviteRole('leitor')
        setInviteProvince('')
        setInviteMunicipioId('')
        setInviteDireccaoId('')
        setInviteDepartamentoId('')
        setCreatedInviteLink(null)
    }

    const handleOpenInviteModal = () => {
        resetInviteForm()
        setShowInviteModal(true)
    }

    const handleSendInvite = async () => {
        if (!user || !inviteEmail || !inviteFullName) return

        setSendingInvite(true)
        try {
            const isProvincial = inviteRole === 'direccao_provincial' || inviteRole === 'departamento_comunicacao' || inviteRole === 'departamento_informacao'
            const sourceType: SourceType = isProvincial ? 'provincial' : 'municipio'

            const invitation = await createInvitation(
                inviteEmail,
                inviteFullName,
                inviteRole,
                user.id,
                // Municipal Params
                !isProvincial ? (inviteMunicipioId || null) : null,
                // Province matches for both but simplified logic here
                inviteProvince || null,
                // Provincial Params
                sourceType,
                isProvincial ? inviteDireccaoId || null : null,
                isProvincial ? inviteDepartamentoId || null : null
            )
            const link = `${window.location.origin}/invite/${invitation.token}`
            setCreatedInviteLink(link)
            setPendingInvitations([invitation, ...pendingInvitations])
            toast.success('Convite criado!', 'Copie o link e envie ao utilizador.')
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao criar convite'
            toast.error('Erro', message)
        } finally {
            setSendingInvite(false)
        }
    }

    const handleCancelInvitation = async (id: string) => {
        try {
            await cancelInvitation(id)
            setPendingInvitations(pendingInvitations.filter(i => i.id !== id))
            toast.success('Convite cancelado')
        } catch (err) {
            console.error('Error canceling invitation:', err)
            toast.error('Erro', 'Não foi possível cancelar o convite')
        }
    }

    const copyInviteLink = async (token: string) => {
        const link = `${window.location.origin}/invite/${token}`
        try {
            await navigator.clipboard.writeText(link)
            setCopiedLink(token)
            toast.success('Link copiado!')
            setTimeout(() => setCopiedLink(null), 2000)
        } catch (err) {
            console.error('Error copying link:', err)
        }
    }

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-screen">
                    <Spinner size="lg" />
                </div>
            </DashboardLayout>
        )
    }

    const isProvincialRole = inviteRole === 'direccao_provincial' || inviteRole === 'departamento_comunicacao' || inviteRole === 'departamento_informacao'

    return (
        <DashboardLayout>
            <Header
                title="Utilizadores"
                subtitle={`${users.length} utilizadores registados`}
            />

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Search Bar and Invite Button */}
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Pesquisar utilizadores..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-800/50 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all min-h-[44px]"
                        />
                    </div>
                    {currentUser?.role === 'superadmin' && (
                        <Button
                            onClick={handleOpenInviteModal}
                            icon={<UserPlus className="w-5 h-5" />}
                        >
                            <span className="hidden sm:inline">Convidar</span>
                        </Button>
                    )}
                </div>

                {/* Pending Invitations */}
                {currentUser?.role === 'superadmin' && pendingInvitations.length > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <h3 className="text-amber-400 font-medium flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4" />
                            Convites Pendentes ({pendingInvitations.length})
                        </h3>
                        <div className="space-y-2">
                            {pendingInvitations.slice(0, 5).map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate">{inv.full_name}</p>
                                        <p className="text-xs text-gray-400 truncate">{inv.email} • {roleDisplayNames[inv.role]}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => copyInviteLink(inv.token)}
                                            className={`p-2 rounded-lg transition-colors ${copiedLink === inv.token
                                                ? 'bg-emerald-500/20 text-emerald-400'
                                                : 'text-gray-400 hover:text-blue-400 hover:bg-blue-500/10'
                                                }`}
                                            title="Copiar link do convite"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleCancelInvitation(inv.id)}
                                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                            title="Cancelar convite"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Mobile: Card Layout */}
                <div className="md:hidden space-y-3">
                    {filteredUsers.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-gray-400">Nenhum utilizador encontrado</p>
                        </div>
                    ) : (
                        filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                className="mobile-card flex items-center gap-3"
                            >
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-sm font-medium text-white">
                                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-white font-medium truncate">{user.full_name || 'Sem nome'}</p>
                                        <RoleBadge role={user.role} />
                                    </div>
                                    <p className="text-xs text-gray-400">
                                        {getMunicipioName(user.municipio_id)} • {format(new Date(user.created_at), 'dd MMM yyyy', { locale: pt })}
                                    </p>
                                </div>
                                {canManageUser(user) && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleEditClick(user)}
                                            className="p-3 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors touch-target"
                                            aria-label="Editar role"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClick(user)}
                                            className="p-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors touch-target"
                                            aria-label="Eliminar utilizador"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Desktop: Table Layout */}
                <div className="hidden md:block table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Utilizador</th>
                                <th>Role</th>
                                <th>Município</th>
                                <th>Área</th>
                                <th>Data de Registo</th>
                                <th className="text-right">Acções</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                                                <span className="text-sm font-medium text-white">
                                                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{user.full_name || 'Sem nome'}</p>
                                                <p className="text-xs text-gray-500">{user.id.slice(0, 8)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <RoleBadge role={user.role} />
                                    </td>
                                    <td className="text-gray-300">
                                        {getMunicipioName(user.municipio_id)}
                                    </td>
                                    <td className="text-gray-300">
                                        {getAreaName(user.area_id)}
                                    </td>
                                    <td className="text-gray-400">
                                        {format(new Date(user.created_at), 'dd MMM yyyy', { locale: pt })}
                                    </td>
                                    <td>
                                        <div className="flex items-center justify-end gap-2">
                                            {canManageUser(user) && (
                                                <>
                                                    <button
                                                        onClick={() => handleEditClick(user)}
                                                        className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                        title="Editar role"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClick(user)}
                                                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Eliminar utilizador"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filteredUsers.length === 0 && (
                        <div className="p-8 text-center">
                            <p className="text-gray-400">Nenhum utilizador encontrado</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={!!editUser}
                onClose={() => setEditUser(null)}
                title="Editar Utilizador"
                size="md"
            >
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-gray-400 mb-1">Utilizador</p>
                        <p className="text-white font-medium">{editUser?.full_name}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Role
                        </label>
                        <select
                            value={editRole}
                            onChange={(e) => {
                                const newRole = e.target.value as UserRole
                                setEditRole(newRole)
                                const isProvRole = newRole === 'direccao_provincial' || newRole === 'departamento_comunicacao' || newRole === 'departamento_informacao'
                                setEditSourceType(isProvRole ? 'provincial' : 'municipio')
                                if (!isProvRole) {
                                    setEditDireccaoId('')
                                    setEditDepartamentoId('')
                                }
                            }}
                            className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        >
                            {Object.entries(roleDisplayNames).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Província */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Província
                        </label>
                        <select
                            value={editProvince}
                            onChange={(e) => {
                                setEditProvince(e.target.value)
                                if (editSourceType !== 'provincial') {
                                    setEditMunicipioId('')
                                }
                            }}
                            className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        >
                            <option value="">Seleccione a província</option>
                            {PROVINCES.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    {/* Provincial fields */}
                    {(editRole === 'direccao_provincial' || editRole === 'departamento_comunicacao' || editRole === 'departamento_informacao') ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Direcção Provincial
                                </label>
                                <select
                                    value={editDireccaoId}
                                    onChange={(e) => {
                                        setEditDireccaoId(e.target.value)
                                        setEditDepartamentoId('')
                                    }}
                                    className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                >
                                    <option value="">Seleccione a direcção</option>
                                    {direccoes
                                        .filter(d => !editProvince || d.province === editProvince)
                                        .map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                </select>
                            </div>

                            {(editRole === 'departamento_comunicacao' || editRole === 'departamento_informacao') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Departamento (Opcional)
                                    </label>
                                    <select
                                        value={editDepartamentoId}
                                        onChange={(e) => setEditDepartamentoId(e.target.value)}
                                        disabled={!editDireccaoId}
                                        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                                    >
                                        <option value="">
                                            {!editDireccaoId ? 'Seleccione a direcção primeiro' : 'Seleccione o departamento'}
                                        </option>
                                        {departamentos.map((d) => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Município
                            </label>
                            <select
                                value={editMunicipioId}
                                onChange={(e) => setEditMunicipioId(e.target.value)}
                                disabled={!editProvince}
                                className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                            >
                                <option value="">
                                    {!editProvince ? 'Seleccione a província primeiro' : 'Seleccione o município'}
                                </option>
                                {municipios
                                    .filter(m => !editProvince || m.province === editProvince)
                                    .map((m) => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                            </select>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="secondary"
                            onClick={() => setEditUser(null)}
                            className="flex-1"
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSaveRole}
                            className="flex-1"
                            loading={saving}
                        >
                            Guardar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!deleteUserModal}
                onClose={() => setDeleteUserModal(null)}
                title="Eliminar Utilizador"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Tem a certeza que deseja eliminar o utilizador <span className="font-medium text-white">{deleteUserModal?.full_name}</span>?
                    </p>
                    <p className="text-sm text-red-400">
                        Esta acção não pode ser revertida.
                    </p>

                    <div className="flex gap-3 pt-2">
                        <Button
                            variant="secondary"
                            onClick={() => setDeleteUserModal(null)}
                            className="flex-1"
                            disabled={deleting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleConfirmDelete}
                            className="flex-1"
                            loading={deleting}
                        >
                            Eliminar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Invite User Modal */}
            <Modal
                isOpen={showInviteModal}
                onClose={() => setShowInviteModal(false)}
                title="Convidar Novo Utilizador"
                size="md"
            >
                <div className="space-y-4">
                    {createdInviteLink ? (
                        // Success state - show link
                        <div className="space-y-4">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                                <p className="text-emerald-400 text-sm mb-2">Convite criado com sucesso!</p>
                                <p className="text-gray-300 text-sm">Copie o link abaixo e envie ao utilizador:</p>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    readOnly
                                    value={createdInviteLink}
                                    className="w-full px-4 py-3 pr-12 rounded-lg bg-gray-800/50 border border-gray-700 text-white text-sm"
                                />
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(createdInviteLink)
                                        toast.success('Link copiado!')
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-blue-400 transition-colors"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        resetInviteForm()
                                        setShowInviteModal(false)
                                    }}
                                    className="flex-1"
                                >
                                    Fechar
                                </Button>
                                <Button onClick={resetInviteForm} className="flex-1">
                                    Novo Convite
                                </Button>
                            </div>
                        </div>
                    ) : (
                        // Form state
                        <>
                            <Input
                                label="Nome Completo"
                                type="text"
                                placeholder="Nome do utilizador"
                                value={inviteFullName}
                                onChange={(e) => setInviteFullName(e.target.value)}
                                required
                            />

                            <Input
                                label="Email"
                                type="email"
                                placeholder="email@exemplo.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                required
                            />

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Role
                                </label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                                    className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                >
                                    {Object.entries(roleDisplayNames).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Província
                                </label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <select
                                        value={inviteProvince}
                                        onChange={(e) => {
                                            setInviteProvince(e.target.value)
                                            if (!isProvincialRole) {
                                                setInviteMunicipioId('')
                                            }
                                        }}
                                        className="w-full pl-10 pr-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                                    >
                                        <option value="">Seleccione a província</option>
                                        {PROVINCES.map((p) => (
                                            <option key={p} value={p}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Conditional Fields based on Role */}
                            {!isProvincialRole ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Município
                                    </label>
                                    <select
                                        value={inviteMunicipioId}
                                        onChange={(e) => setInviteMunicipioId(e.target.value)}
                                        disabled={!inviteProvince}
                                        className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                                    >
                                        <option value="">
                                            {!inviteProvince ? 'Seleccione a província primeiro' : 'Seleccione o município'}
                                        </option>
                                        {municipios
                                            .filter(m => !inviteProvince || m.province === inviteProvince)
                                            .map((m) => (
                                                <option key={m.id} value={m.id}>{m.name}</option>
                                            ))}
                                    </select>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Direcção Provincial
                                        </label>
                                        <select
                                            value={inviteDireccaoId}
                                            onChange={(e) => setInviteDireccaoId(e.target.value)}
                                            disabled={!inviteProvince}
                                            className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                                        >
                                            <option value="">
                                                {!inviteProvince ? 'Seleccione a província primeiro' : 'Seleccione a direcção'}
                                            </option>
                                            {direccoes
                                                .filter(d => !inviteProvince || d.province === inviteProvince)
                                                .map((d) => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                        </select>
                                    </div>

                                    {(inviteRole === 'departamento_comunicacao' || inviteRole === 'departamento_informacao') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                                Departamento (Opcional)
                                            </label>
                                            <select
                                                value={inviteDepartamentoId}
                                                onChange={(e) => setInviteDepartamentoId(e.target.value)}
                                                disabled={!inviteDireccaoId}
                                                className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all disabled:opacity-50"
                                            >
                                                <option value="">
                                                    {!inviteDireccaoId ? 'Seleccione a direcção primeiro' : 'Seleccione o departamento'}
                                                </option>
                                                {departamentos.map((d) => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    variant="secondary"
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1"
                                    disabled={sendingInvite}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleSendInvite}
                                    className="flex-1"
                                    loading={sendingInvite}
                                    disabled={!inviteEmail || !inviteFullName || (!isProvincialRole && !inviteMunicipioId) || (isProvincialRole && !inviteDireccaoId)}
                                >
                                    Criar Convite
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </Modal>
        </DashboardLayout>
    )
}
