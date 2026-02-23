import { useState, useEffect } from 'react'
import { Building2, Plus, Trash2, ChevronRight, Folder, Edit2 } from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import { getMunicipios, getAreas, createMunicipio, createArea, deleteMunicipio, deleteArea, updateMunicipio, getProfileCountByMunicipio, getMediaCountByMunicipio } from '../../lib/supabase'
import { PROVINCES } from '../../lib/constants'
import type { Municipio, Area } from '../../lib/types'
import { clsx } from 'clsx'

export default function MunicipiosPage() {
    const [municipios, setMunicipios] = useState<Municipio[]>([])
    const [areas, setAreas] = useState<Area[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMunicipio, setSelectedMunicipio] = useState<Municipio | null>(null)

    // Modals
    const [showAddMunicipio, setShowAddMunicipio] = useState(false)
    const [showEditMunicipio, setShowEditMunicipio] = useState(false)
    const [showAddArea, setShowAddArea] = useState(false)
    const [deletingMunicipio, setDeletingMunicipio] = useState<Municipio | null>(null)
    const [deletingArea, setDeletingArea] = useState<Area | null>(null)
    const [editingMunicipio, setEditingMunicipio] = useState<Municipio | null>(null)

    // Form states
    const [municipioName, setMunicipioName] = useState('')
    const [municipioProvince, setMunicipioProvince] = useState<string>('')
    const [newAreaName, setNewAreaName] = useState('')
    const [saving, setSaving] = useState(false)
    const [deleteError, setDeleteError] = useState<string | null>(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [municipiosData, areasData] = await Promise.all([
                getMunicipios(),
                getAreas(),
            ])
            setMunicipios(municipiosData)
            setAreas(areasData)
        } catch (err) {
            console.error('Error loading data:', err)
        } finally {
            setLoading(false)
        }
    }

    const getAreasForMunicipio = (municipioId: string) => {
        return areas.filter(a => a.municipio_id === municipioId)
    }

    const handleCreateMunicipio = async () => {
        if (!municipioName.trim() || !municipioProvince) return

        setSaving(true)
        try {
            const newMunicipio = await createMunicipio(municipioName.trim(), municipioProvince)
            setMunicipios([...municipios, newMunicipio])
            setMunicipioName('')
            setMunicipioProvince('')
            setShowAddMunicipio(false)
        } catch (err) {
            console.error('Error creating municipio:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateMunicipio = async () => {
        if (!editingMunicipio || !municipioName.trim() || !municipioProvince) return

        setSaving(true)
        try {
            const updatedMunicipio = await updateMunicipio(editingMunicipio.id, {
                name: municipioName.trim(),
                province: municipioProvince
            })

            setMunicipios(municipios.map(m => m.id === updatedMunicipio.id ? updatedMunicipio : m))
            if (selectedMunicipio?.id === updatedMunicipio.id) {
                setSelectedMunicipio(updatedMunicipio)
            }

            setEditingMunicipio(null)
            setMunicipioName('')
            setMunicipioProvince('')
            setShowEditMunicipio(false)
        } catch (err) {
            console.error('Error updating municipio:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleCreateArea = async () => {
        if (!newAreaName.trim() || !selectedMunicipio) return

        setSaving(true)
        try {
            const newArea = await createArea(newAreaName.trim(), selectedMunicipio.id)
            setAreas([...areas, newArea])
            setNewAreaName('')
            setShowAddArea(false)
        } catch (err) {
            console.error('Error creating area:', err)
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteMunicipio = async () => {
        if (!deletingMunicipio) return

        setSaving(true)
        setDeleteError(null)
        try {
            // Check for associated users and media first
            const [userCount, mediaCount] = await Promise.all([
                getProfileCountByMunicipio(deletingMunicipio.id),
                getMediaCountByMunicipio(deletingMunicipio.id)
            ])

            if (userCount > 0 || mediaCount > 0) {
                const parts = []
                if (userCount > 0) parts.push(`${userCount} utilizador(es)`)
                if (mediaCount > 0) parts.push(`${mediaCount} ficheiro(s) de multimédia`)

                setDeleteError(`Não é possível eliminar este município pois existem ${parts.join(' e ')} associados. Por favor, reatribua ou elimine estes itens primeiro.`)
                return
            }

            await deleteMunicipio(deletingMunicipio.id)
            setMunicipios(municipios.filter(m => m.id !== deletingMunicipio.id))
            setAreas(areas.filter(a => a.municipio_id !== deletingMunicipio.id))
            if (selectedMunicipio?.id === deletingMunicipio.id) {
                setSelectedMunicipio(null)
            }
            setDeletingMunicipio(null)
        } catch (err) {
            console.error('Error deleting municipio:', err)
            setDeleteError('Ocorreu um erro ao eliminar o município. Por favor tente novamente.')
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteArea = async () => {
        if (!deletingArea) return

        setSaving(true)
        try {
            await deleteArea(deletingArea.id)
            setAreas(areas.filter(a => a.id !== deletingArea.id))
            setDeletingArea(null)
        } catch (err) {
            console.error('Error deleting area:', err)
        } finally {
            setSaving(false)
        }
    }

    const openEditMunicipio = (municipio: Municipio) => {
        setEditingMunicipio(municipio)
        setMunicipioName(municipio.name)
        setMunicipioProvince(municipio.province)
        setShowEditMunicipio(true)
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
                title="Municípios & Áreas"
                subtitle="Gestão da estrutura organizacional"
            />

            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Municipios List */}
                    <Card padding="none">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
                            <h2 className="text-lg font-semibold text-white">Municípios</h2>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setMunicipioName('')
                                    setMunicipioProvince('')
                                    setShowAddMunicipio(true)
                                }}
                                icon={<Plus className="w-4 h-4" />}
                            >
                                Adicionar
                            </Button>
                        </div>

                        {municipios.length === 0 ? (
                            <div className="p-8 text-center">
                                <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400">Nenhum município registado</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-700/50">
                                {municipios.map((municipio) => {
                                    const municipioAreas = getAreasForMunicipio(municipio.id)
                                    const isSelected = selectedMunicipio?.id === municipio.id

                                    return (
                                        <div
                                            key={municipio.id}
                                            onClick={() => setSelectedMunicipio(isSelected ? null : municipio)}
                                            className={clsx(
                                                'px-6 py-4 flex items-center justify-between cursor-pointer transition-colors',
                                                isSelected ? 'bg-blue-600/10' : 'hover:bg-gray-800/30'
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={clsx(
                                                    'w-10 h-10 rounded-lg flex items-center justify-center',
                                                    isSelected ? 'bg-blue-600' : 'bg-gray-700'
                                                )}>
                                                    <Building2 className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-white font-medium">{municipio.name}</p>
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">
                                                            {municipio.province}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-gray-400">
                                                        {municipioAreas.length} área{municipioAreas.length !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        openEditMunicipio(municipio);
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDeletingMunicipio(municipio) }}
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

                    {/* Areas List */}
                    <Card padding="none">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
                            <h2 className="text-lg font-semibold text-white">
                                Áreas {selectedMunicipio && `- ${selectedMunicipio.name}`}
                            </h2>
                            {selectedMunicipio && (
                                <Button
                                    size="sm"
                                    onClick={() => setShowAddArea(true)}
                                    icon={<Plus className="w-4 h-4" />}
                                >
                                    Adicionar
                                </Button>
                            )}
                        </div>

                        {!selectedMunicipio ? (
                            <div className="p-8 text-center">
                                <Folder className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-400">Seleccione um município para ver as áreas</p>
                            </div>
                        ) : (
                            <>
                                {getAreasForMunicipio(selectedMunicipio.id).length === 0 ? (
                                    <div className="p-8 text-center">
                                        <Folder className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                                        <p className="text-gray-400">Nenhuma área neste município</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-700/50">
                                        {getAreasForMunicipio(selectedMunicipio.id).map((area) => (
                                            <div
                                                key={area.id}
                                                className="px-6 py-4 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-amber-600/20 rounded-lg flex items-center justify-center">
                                                        <Folder className="w-5 h-5 text-amber-400" />
                                                    </div>
                                                    <p className="text-white font-medium">{area.name}</p>
                                                </div>

                                                <button
                                                    onClick={() => setDeletingArea(area)}
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

            {/* Add Municipio Modal */}
            <Modal
                isOpen={showAddMunicipio}
                onClose={() => { setShowAddMunicipio(false); setMunicipioName(''); setMunicipioProvince('') }}
                title="Adicionar Município"
                size="sm"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Província
                        </label>
                        <select
                            value={municipioProvince}
                            onChange={(e) => setMunicipioProvince(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-600 transition-all duration-200"
                        >
                            <option value="">Seleccione a província</option>
                            {PROVINCES.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Nome do Município"
                        value={municipioName}
                        onChange={(e) => setMunicipioName(e.target.value)}
                        placeholder="Ex: Luanda"
                    />

                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => { setShowAddMunicipio(false); setMunicipioName(''); setMunicipioProvince('') }}
                            className="flex-1"
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateMunicipio}
                            className="flex-1"
                            loading={saving}
                            disabled={!municipioName.trim() || !municipioProvince}
                        >
                            Criar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Edit Municipio Modal */}
            <Modal
                isOpen={showEditMunicipio}
                onClose={() => { setShowEditMunicipio(false); setEditingMunicipio(null) }}
                title="Editar Município"
                size="sm"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Província
                        </label>
                        <select
                            value={municipioProvince}
                            onChange={(e) => setMunicipioProvince(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-600 transition-all duration-200"
                        >
                            <option value="">Seleccione a província</option>
                            {PROVINCES.map((p) => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Nome do Município"
                        value={municipioName}
                        onChange={(e) => setMunicipioName(e.target.value)}
                        placeholder="Ex: Luanda"
                    />

                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => { setShowEditMunicipio(false); setEditingMunicipio(null) }}
                            className="flex-1"
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleUpdateMunicipio}
                            className="flex-1"
                            loading={saving}
                            disabled={!municipioName.trim() || !municipioProvince}
                        >
                            Salvar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Add Area Modal */}
            <Modal
                isOpen={showAddArea}
                onClose={() => { setShowAddArea(false); setNewAreaName('') }}
                title={`Adicionar Área - ${selectedMunicipio?.name}`}
                size="sm"
            >
                <div className="space-y-4">
                    <Input
                        label="Nome da Área"
                        value={newAreaName}
                        onChange={(e) => setNewAreaName(e.target.value)}
                        placeholder="Ex: Comunicação Social"
                    />
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => { setShowAddArea(false); setNewAreaName('') }}
                            className="flex-1"
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateArea}
                            className="flex-1"
                            loading={saving}
                            disabled={!newAreaName.trim()}
                        >
                            Criar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Municipio Confirmation */}
            <Modal
                isOpen={!!deletingMunicipio}
                onClose={() => { setDeletingMunicipio(null); setDeleteError(null) }}
                title="Eliminar Município"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Tem a certeza que deseja eliminar <span className="text-white font-medium">{deletingMunicipio?.name}</span>?
                    </p>
                    {deleteError ? (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-sm text-red-400">{deleteError}</p>
                        </div>
                    ) : (
                        <p className="text-sm text-amber-400">
                            ⚠️ Todas as áreas e ficheiros associados serão também eliminados.
                        </p>
                    )}
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => { setDeletingMunicipio(null); setDeleteError(null) }}
                            className="flex-1"
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteMunicipio}
                            className="flex-1"
                            loading={saving}
                        >
                            Eliminar
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Area Confirmation */}
            <Modal
                isOpen={!!deletingArea}
                onClose={() => setDeletingArea(null)}
                title="Eliminar Área"
                size="sm"
            >
                <div className="space-y-4">
                    <p className="text-gray-300">
                        Tem a certeza que deseja eliminar <span className="text-white font-medium">{deletingArea?.name}</span>?
                    </p>
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setDeletingArea(null)}
                            className="flex-1"
                            disabled={saving}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="danger"
                            onClick={handleDeleteArea}
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
