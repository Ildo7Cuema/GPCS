import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import {
    ArrowLeft,
    Save,
    Upload,
    X,
    FileIcon,
    Loader2,
    Plus,
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import {
    getDocument,
    createDocument,
    updateDocument,
    uploadDocumentFile,
    addDocumentMovement,
} from '../../lib/documents'
import { getMunicipios } from '../../lib/supabase'
import type { DocumentFormData, Municipio } from '../../lib/types'
import { rolePermissions, documentTypeLabels, documentStatusLabels, documentDirectionLabels, formatFileSize } from '../../lib/types'
import type { DocumentType, DocumentDirection, DocumentStatus } from '../../lib/types'

export default function DocumentFormPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user, profile } = useAuth()
    const toast = useToast()
    const permissions = profile?.role ? rolePermissions[profile.role] : rolePermissions.leitor
    const isEditing = !!id

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [municipios, setMunicipios] = useState<Municipio[]>([])
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [existingFileUrl, setExistingFileUrl] = useState<string>('')
    const [movementNote, setMovementNote] = useState('')
    const [addingMovement, setAddingMovement] = useState(false)

    const [formData, setFormData] = useState<DocumentFormData>({
        municipio_id: profile?.municipio_id || '',
        type: 'oficio',
        subject: '',
        origin: '',
        destination: '',
        direction: 'received',
        status: 'em_tramitacao',
        document_date: new Date().toISOString().split('T')[0],
        deadline: '',
        observations: '',
    })

    useEffect(() => {
        getMunicipios().then(setMunicipios).catch(console.error)
    }, [])

    useEffect(() => {
        if (isEditing && id) {
            setLoading(true)
            getDocument(id).then(doc => {
                if (doc) {
                    setFormData({
                        municipio_id: doc.municipio_id || '',
                        type: doc.type,
                        subject: doc.subject,
                        origin: doc.origin,
                        destination: doc.destination,
                        direction: doc.direction,
                        status: doc.status,
                        document_date: doc.document_date,
                        deadline: doc.deadline || '',
                        observations: doc.observations || '',
                    })
                    setExistingFileUrl(doc.file_url || '')
                }
            }).catch(console.error).finally(() => setLoading(false))
        }
    }, [id, isEditing])

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            setSelectedFile(acceptedFiles[0])
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': [] },
        maxFiles: 1,
        maxSize: 25 * 1024 * 1024,
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        if (!formData.subject || !formData.origin || !formData.destination || !formData.municipio_id) {
            toast.error('Preencha os campos obrigatórios')
            return
        }

        setSaving(true)
        try {
            const cleanData = {
                ...formData,
                deadline: formData.deadline || undefined,
                observations: formData.observations || undefined,
            }

            let documentId = id

            if (isEditing && id) {
                await updateDocument(id, cleanData)
            } else {
                const created = await createDocument(cleanData, user.id)
                documentId = created.id
            }

            // Upload file
            if (selectedFile && documentId) {
                await uploadDocumentFile(documentId, selectedFile, user.id)
            }

            toast.success(
                isEditing ? 'Documento actualizado com sucesso' : 'Documento registado com sucesso'
            )
            navigate('/documents')
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : (err as any)?.message || JSON.stringify(err)
            console.error('Error saving document:', errMsg)
            toast.error(`Erro ao guardar documento: ${errMsg}`)
        } finally {
            setSaving(false)
        }
    }

    const handleAddMovement = async () => {
        if (!id || !user || !movementNote.trim()) return
        setAddingMovement(true)
        try {
            await addDocumentMovement(id, movementNote.trim(), user.id)
            toast.success('Movimentação adicionada')
            setMovementNote('')
        } catch (err) {
            console.error('Error adding movement:', err)
            toast.error('Erro ao adicionar movimentação')
        } finally {
            setAddingMovement(false)
        }
    }

    const updateField = <K extends keyof DocumentFormData>(key: K, value: DocumentFormData[K]) => {
        setFormData(prev => ({ ...prev, [key]: value }))
    }

    if (loading) {
        return (
            <DashboardLayout>
                <Header title="A carregar..." subtitle="Gestão Documental" />
                <div className="p-6 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <Header
                title={isEditing ? 'Editar Documento' : 'Novo Documento'}
                subtitle="Gestão Documental"
            />

            <div className="p-4 sm:p-6">
                <button
                    onClick={() => navigate('/documents')}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar à listagem
                </button>

                <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
                    {/* Document Info */}
                    <Card>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Informações do Documento</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Assunto <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.subject}
                                    onChange={(e) => updateField('subject', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    placeholder="Assunto do documento"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Tipo <span className="text-red-400">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.type}
                                    onChange={(e) => updateField('type', e.target.value as DocumentType)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                >
                                    {(Object.entries(documentTypeLabels) as [DocumentType, string][]).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Município <span className="text-red-400">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.municipio_id}
                                    onChange={(e) => updateField('municipio_id', e.target.value)}
                                    disabled={permissions.scopeToMunicipio}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
                                >
                                    <option value="">Seleccionar município</option>
                                    {municipios.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Origem <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.origin}
                                    onChange={(e) => updateField('origin', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    placeholder="Remetente"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Destino <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.destination}
                                    onChange={(e) => updateField('destination', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    placeholder="Destinatário"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Direcção</label>
                                <select
                                    value={formData.direction}
                                    onChange={(e) => updateField('direction', e.target.value as DocumentDirection)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                >
                                    {(Object.entries(documentDirectionLabels) as [DocumentDirection, string][]).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                                <select
                                    value={formData.status}
                                    onChange={(e) => updateField('status', e.target.value as DocumentStatus)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                >
                                    {(Object.entries(documentStatusLabels) as [DocumentStatus, string][]).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data do Documento</label>
                                <input
                                    type="date"
                                    value={formData.document_date}
                                    onChange={(e) => updateField('document_date', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prazo</label>
                                <input
                                    type="date"
                                    value={formData.deadline || ''}
                                    onChange={(e) => updateField('deadline', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Observations */}
                    <Card>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Observações</h3>
                        <textarea
                            value={formData.observations || ''}
                            onChange={(e) => updateField('observations', e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                            placeholder="Notas adicionais..."
                        />
                    </Card>

                    {/* PDF Upload */}
                    <Card>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Ficheiro PDF</h3>

                        {existingFileUrl && !selectedFile && (
                            <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                <FileIcon className="w-4 h-4 text-red-400" />
                                <a href={existingFileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300">
                                    Ficheiro anexado
                                </a>
                            </div>
                        )}

                        {selectedFile ? (
                            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-500/5 rounded-lg border border-blue-200 dark:border-blue-500/20">
                                <div className="flex items-center gap-2 min-w-0">
                                    <FileIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                    <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{selectedFile.name}</span>
                                    <span className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedFile(null)}
                                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div
                                {...getRootProps()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive
                                    ? 'border-blue-400 bg-blue-500/5'
                                    : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                                    }`}
                            >
                                <input {...getInputProps()} />
                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {isDragActive ? 'Solte o ficheiro aqui...' : 'Arraste um PDF ou clique para seleccionar'}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Apenas PDF (max 25MB)</p>
                            </div>
                        )}
                    </Card>

                    {/* Add Movement (only when editing) */}
                    {isEditing && (
                        <Card>
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Adicionar Movimentação</h3>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={movementNote}
                                    onChange={(e) => setMovementNote(e.target.value)}
                                    className="flex-1 px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    placeholder="Ex: Encaminhado ao Gabinete do Administrador"
                                />
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={handleAddMovement}
                                    disabled={!movementNote.trim() || addingMovement}
                                >
                                    {addingMovement ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Plus className="w-4 h-4 mr-1" />
                                            Adicionar
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Submit */}
                    <div className="flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate('/documents')}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                    A guardar...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-1.5" />
                                    {isEditing ? 'Actualizar' : 'Registar Documento'}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    )
}
