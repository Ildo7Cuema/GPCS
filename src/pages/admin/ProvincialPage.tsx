import { useState, useEffect } from 'react'
import { Briefcase, Plus, Trash2, ChevronRight, Folder, Edit2 } from 'lucide-react'
import { PROVINCES } from '../../lib/constants'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import {
    getGovernoProvincial,
    getDireccoesProvinciais,
    getDepartamentosProvinciais,
    createDireccaoProvincial,
    createDepartamentoProvincial,
    deleteDireccaoProvincial,
    deleteDepartamentoProvincial,
    updateDireccaoProvincial
} from '../../lib/supabase'
// @ts-ignore
import type { GovernoProvincial, DireccaoProvincial, DepartamentoProvincial } from '../../lib/types'
import { clsx } from 'clsx'

export default function ProvincialPage() {
    const [governo, setGoverno] = useState<GovernoProvincial | null>(null)
    const [direccoes, setDireccoes] = useState<DireccaoProvincial[]>([])
    const [departamentos, setDepartamentos] = useState<DepartamentoProvincial[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedDireccao, setSelectedDireccao] = useState<DireccaoProvincial | null>(null)

    // Modals
    const [showAddDireccao, setShowAddDireccao] = useState(false)
    const [showEditDireccao, setShowEditDireccao] = useState(false)
    const [showAddDepartamento, setShowAddDepartamento] = useState(false)
    const [deletingDireccao, setDeletingDireccao] = useState<DireccaoProvincial | null>(null)
    const [deletingDepartamento, setDeletingDepartamento] = useState<DepartamentoProvincial | null>(null)
    const [editingDireccao, setEditingDireccao] = useState<DireccaoProvincial | null>(null)

    // Form states
    const [direccaoName, setDireccaoName] = useState('')
    const [direccaoAbbr, setDireccaoAbbr] = useState('')
    const [direccaoProvince, setDireccaoProvince] = useState('Cabinda')
    const [newDepartamentoName, setNewDepartamentoName] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [governoData, direccoesData, departamentosData] = await Promise.all([
                getGovernoProvincial(),
                getDireccoesProvinciais(),
                getDepartamentosProvinciais(),
            ])
            setGoverno(governoData)
            setDireccoes(direccoesData)
            setDepartamentos(departamentosData)

            // Set default province from governo if available
            if (governoData) {
                setDireccaoProvince(governoData.province)
            }
        } catch (err) {
            console.error('Error loading data:', err)
        } finally {
            setLoading(false)
        }
    }

    const getDepartamentosForDireccao = (direccaoId: string) => {
        return departamentos.filter(d => d.direccao_id === direccaoId)
    }

    const handleCreateDireccao = async () => {
        if (!direccaoName.trim() || !governo) return

        setSaving(true)
        try {
            const newDireccao = await createDireccaoProvincial(
                direccaoName.trim(),
                direccaoAbbr.trim() || null,
                direccaoProvince.trim() || governo.province,
                governo.id
            )
            setDireccoes([...direccoes, newDireccao])
            setDireccaoName('')
            setDireccaoAbbr('')
            setShowAddDireccao(false)
        } catch (err) {
            console.error('Error creating direccao:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateDireccao = async () => {
        if (!editingDireccao || !direccaoName.trim()) return

        setSaving(true)
        try {
            const updatedDireccao = await updateDireccaoProvincial(editingDireccao.id, {
                name: direccaoName.trim(),
                abbreviation: direccaoAbbr.trim() || null,
                province: direccaoProvince.trim()
            })

            setDireccoes(direccoes.map(d => d.id === updatedDireccao.id ? updatedDireccao : d))

            if (selectedDireccao?.id === updatedDireccao.id) {
                setSelectedDireccao(updatedDireccao)
            }

            setEditingDireccao(null)
            setDireccaoName('')
            setDireccaoAbbr('')
            setShowEditDireccao(false)
        } catch (err) {
            console.error('Error updating direccao:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleCreateDepartamento = async () => {
        if (!newDepartamentoName.trim() || !selectedDireccao) return

        setSaving(true)
        try {
            const newDepartamento = await createDepartamentoProvincial(
                newDepartamentoName.trim(),
                selectedDireccao.id
            )
            setDepartamentos([...departamentos, newDepartamento])
            setNewDepartamentoName('')
            setShowAddDepartamento(false)
        } catch (err) {
            console.error('Error creating departamento:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteDireccao = async () => {
        if (!deletingDireccao) return

        setSaving(true)
        try {
            await deleteDireccaoProvincial(deletingDireccao.id)
            setDireccoes(direccoes.filter(d => d.id !== deletingDireccao.id))
            setDepartamentos(departamentos.filter(d => d.direccao_id !== deletingDireccao.id))
            if (selectedDireccao?.id === deletingDireccao.id) {
                setSelectedDireccao(null)
            }
            setDeletingDireccao(null)
        } catch (err) {
            console.error('Error deleting direccao:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteDepartamento = async () => {
        if (!deletingDepartamento) return

        setSaving(true)
        try {
            await deleteDepartamentoProvincial(deletingDepartamento.id)
            setDepartamentos(departamentos.filter(d => d.id !== deletingDepartamento.id))
            setDeletingDepartamento(null)
        } catch (err) {
            console.error('Error deleting departamento:', err)
        } finally {
            setSaving(false)
        }
    }

    const openEditDireccao = (direccao: DireccaoProvincial) => {
        setEditingDireccao(direccao)
        setDireccaoName(direccao.name)
        setDireccaoAbbr(direccao.abbreviation || '')
        setDireccaoProvince(direccao.province)
        setShowEditDireccao(true)
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

    return (
        <DashboardLayout>
            <Header
                title="Direcções & Departamentos"
                subtitle={governo ? `${governo.name} - ${governo.province}` : 'Gestão da estrutura provincial'}
            />

            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Direccoes List */}
                    <Card padding="none">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
                            <h2 className="text-lg font-semibold text-white">Direcções Provinciais</h2>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setDireccaoName('')
                                    setDireccaoAbbr('')
                                    if (governo) setDireccaoProvince(governo.province)
                                    setShowAddDireccao(true)
                                }}
                                icon={<Plus className="w-4 h-4" />}
                            >
                                Adicionar
                            </Button>
                        </div>

                        {direccoes.length === 0 ? (
                            <div className="p-8 text-center">
                                <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400">Nenhuma direcção registada</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-700/50">
                                {direccoes.map((direccao) => {
                                    const direccaoDeps = getDepartamentosForDireccao(direccao.id)
                                    const isSelected = selectedDireccao?.id === direccao.id

                                    return (
                                        <div
                                            key={direccao.id}
                                            onClick={() => setSelectedDireccao(isSelected ? null : direccao)}
                                            className={clsx(
                                                'px-6 py-4 flex items-center justify-between cursor-pointer transition-colors',
                                                isSelected ? 'bg-emerald-600/10' : 'hover:bg-gray-800/30'
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={clsx(
                                                    'w-10 h-10 rounded-lg flex items-center justify-center',
                                                    isSelected ? 'bg-emerald-600' : 'bg-gray-700'
                                                )}>
                                                    <Briefcase className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">
                                                        {direccao.abbreviation && (
                                                            <span className="text-emerald-400 mr-2">{direccao.abbreviation}</span>
                                                        )}
                                                        {direccao.name}
                                                    </p>
                                                    <p className="text-sm text-gray-400">
                                                        {direccaoDeps.length} departamento{direccaoDeps.length !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditDireccao(direccao);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDeletingDireccao(direccao) }}
                                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <ChevronRight className={clsx(
                                                    'w-5 h-5 text-gray-400 transition-transform',
                                                    isSelected && 'rotate-90'
                                                )} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </Card>

                    {/* Departamentos List */}
                    <Card padding="none">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
                            <h2 className="text-lg font-semibold text-white">
                                Departamentos {selectedDireccao && `- ${selectedDireccao.abbreviation || selectedDireccao.name}`}
                            </h2>
                            {selectedDireccao && (
                                <Button
                                    size="sm"
                                    onClick={() => setShowAddDepartamento(true)}
                                    icon={<Plus className="w-4 h-4" />}
                                >
                                    Adicionar
                                </Button>
                            )}
                        </div>

                        {!selectedDireccao ? (
                            <div className="p-8 text-center">
                                <Folder className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400">Seleccione uma direcção para ver os departamentos</p>
                            </div>
                        ) : (
                            <>
                                {getDepartamentosForDireccao(selectedDireccao.id).length === 0 ? (
                                    <div className="p-8 text-center">
                                        <Folder className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                        <p className="text-gray-400">Nenhum departamento nesta direcção</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-700/50">
                                        {getDepartamentosForDireccao(selectedDireccao.id).map((departamento) => (
                                            <div
                                                key={departamento.id}
                                                className="px-6 py-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                                                        <Folder className="w-5 h-5 text-emerald-400" />
                                                    </div>
                                                    <p className="text-white font-medium">{departamento.name}</p>
                                                </div>

                                                <button
                                                    onClick={() => setDeletingDepartamento(departamento)}
                                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </Card>
                </div>
            </div>

            {/* Add Direccao Modal */}
            <Modal
                isOpen={showAddDireccao}
                onClose={() => { setShowAddDireccao(false); setDireccaoName(''); setDireccaoAbbr('') }}
                title="Adicionar Direcção Provincial"
                size="sm"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Província
                        </label>
                        <select
                            value={direccaoProvince}
                            onChange={(e) => setDireccaoProvince(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-600 transition-all duration-200"
                        >
                            <option value="">Seleccione a província</option>
                            {PROVINCES.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                    <Input
                        label="Nome da Direcção"
                        value={direccaoName}
                        onChange={(e) => setDireccaoName(e.target.value)}
                        placeholder="Ex: Direcção Provincial da Saúde"
                    />
                    <Input
                        label="Sigla (opcional)"
                        value={direccaoAbbr}
                        onChange={(e) => setDireccaoAbbr(e.target.value)}
                        placeholder="Ex: DPS"
                    />
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => { setShowAddDireccao(false); setDireccaoName(''); setDireccaoAbbr('') }}
                            className="flex-1"
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateDireccao}
                            className="flex-1"
                            loading={saving}
                            disabled={!direccaoName.trim()}
                        >
                            Criar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Direccao Modal */}
            <Modal
                isOpen={showEditDireccao}
                onClose={() => {
                    setShowEditDireccao(false)
                    setEditingDireccao(null)
                    if (governo) setDireccaoProvince(governo.province)
                }}
                title="Editar Direcção Provincial"
                size="sm"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Província
                        </label>
                        <select
                            value={direccaoProvince}
                            onChange={(e) => setDireccaoProvince(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-600 transition-all duration-200"
                        >
                            <option value="">Seleccione a província</option>
                            {PROVINCES.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                    <Input
                        label="Nome da Direcção"
                        value={direccaoName}
                        onChange={(e) => setDireccaoName(e.target.value)}
                        placeholder="Ex: Direcção Provincial da Saúde"
                    />
                    <Input
                        label="Sigla (opcional)"
                        value={direccaoAbbr}
                        onChange={(e) => setDireccaoAbbr(e.target.value)}
                        placeholder="Ex: DPS"
                    />
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => { setShowEditDireccao(false); setEditingDireccao(null) }}
                            className="flex-1"
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleUpdateDireccao}
                            className="flex-1"
                            loading={saving}
                            disabled={!direccaoName.trim()}
                        >
                            Salvar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Add Departamento Modal */}
            <Modal
                isOpen={showAddDepartamento}
                onClose={() => { setShowAddDepartamento(false); setNewDepartamentoName('') }}
                title={`Adicionar Departamento - ${selectedDireccao?.abbreviation || selectedDireccao?.name}`}
                size="sm"
            >
                <div className="space-y-4">
                    <Input
                        label="Nome do Departamento"
                        value={newDepartamentoName}
                        onChange={(e) => setNewDepartamentoName(e.target.value)}
                        placeholder="Ex: Recursos Humanos"
                    />
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => { setShowAddDepartamento(false); setNewDepartamentoName('') }}
                            className="flex-1"
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateDepartamento}
                            className="flex-1"
                            loading={saving}
                            disabled={!newDepartamentoName.trim()}
                        >
                            Criar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Direccao Confirmation */}
            <Modal
                isOpen={!!deletingDireccao}
                onClose={() => setDeletingDireccao(null)}
                title="Eliminar Direcção"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Tem a certeza que deseja eliminar <span className="text-white font-medium">{deletingDireccao?.name}</span>?
                    </p>
                    <p className="text-sm text-amber-400">
                        ⚠️ Todos os departamentos e ficheiros associados serão também eliminados.
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setDeletingDireccao(null)}
                            className="flex-1"
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteDireccao}
                            className="flex-1"
                            loading={saving}
                        >
                            Eliminar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Departamento Confirmation */}
            <Modal
                isOpen={!!deletingDepartamento}
                onClose={() => setDeletingDepartamento(null)}
                title="Eliminar Departamento"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Tem a certeza que deseja eliminar <span className="text-white font-medium">{deletingDepartamento?.name}</span>?
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setDeletingDepartamento(null)}
                            className="flex-1"
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteDepartamento}
                            className="flex-1"
                            loading={saving}
                        >
                            Eliminar
                        </Button>
                    </div>
                </div>
            </Modal>
        </DashboardLayout>
    )
}
