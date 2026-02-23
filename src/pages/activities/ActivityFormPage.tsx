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
} from 'lucide-react'
import DashboardLayout from '../../components/layout/DashboardLayout'
import Header from '../../components/layout/Header'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../../components/ui/Toast'
import {
    getActivity,
    createActivity,
    updateActivity,
    uploadAttachment,
    getAttachments,
    deleteAttachment,
    getMediaTypes,
} from '../../lib/activities'
import { getMunicipios } from '../../lib/supabase'
import type { ActivityFormData, Municipio, MediaTypeRecord, Attachment } from '../../lib/types'
import { rolePermissions, formatFileSize } from '../../lib/types'

const ACTIVITY_TYPES = [
    'Reunião',
    'Conferência',
    'Visita',
    'Inauguração',
    'Formação',
    'Evento Cultural',
    'Evento Desportivo',
    'Assembleia',
    'Cerimónia',
    'Outro',
]

export default function ActivityFormPage() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user, profile } = useAuth()
    const toast = useToast()
    const permissions = profile?.role ? rolePermissions[profile.role] : rolePermissions.leitor
    const isEditing = !!id

    const [loading, setLoading] = useState(false)
    const [saving, setSaving] = useState(false)
    const [municipios, setMunicipios] = useState<Municipio[]>([])
    const [mediaTypes, setMediaTypes] = useState<MediaTypeRecord[]>([])
    const [existingAttachments, setExistingAttachments] = useState<Attachment[]>([])
    const [newFiles, setNewFiles] = useState<File[]>([])
    const [uploadingFiles, setUploadingFiles] = useState(false)

    const [formData, setFormData] = useState<ActivityFormData>({
        municipio_id: profile?.municipio_id || '',
        title: '',
        activity_type: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        promoter: '',
        minister_present: false,
        governor_present: false,
        administrator_present: false,
        minister_name: '',
        governor_name: '',
        administrator_name: '',
        media_type_id: '',
        media_outlet: '',
        news_published: false,
        program_page: '',
        publication_link: '',
        observations: '',
        // Contexto Provincial (auto-preenchido)
        source_type: profile?.source_type || 'municipio',
        governo_provincial_id: profile?.governo_provincial_id || undefined,
        direccao_provincial_id: profile?.direccao_provincial_id || undefined,
        departamento_provincial_id: profile?.departamento_provincial_id || undefined,
    })

    useEffect(() => {
        Promise.all([
            getMunicipios(),
            getMediaTypes(),
        ]).then(([m, mt]) => {
            setMunicipios(m)
            setMediaTypes(mt)
        }).catch(console.error)
    }, [])

    useEffect(() => {
        if (isEditing && id) {
            setLoading(true)
            Promise.all([
                getActivity(id),
                getAttachments(id),
            ]).then(([activity, attachments]) => {
                if (activity) {
                    setFormData({
                        municipio_id: activity.municipio_id || '',
                        title: activity.title,
                        activity_type: activity.activity_type,
                        date: activity.date,
                        time: activity.time || '',
                        promoter: activity.promoter || '',
                        minister_present: activity.minister_present,
                        minister_name: activity.minister_name || '',
                        governor_present: activity.governor_present,
                        governor_name: activity.governor_name || '',
                        administrator_present: activity.administrator_present,
                        administrator_name: activity.administrator_name || '',
                        media_type_id: activity.media_type_id || '',
                        media_outlet: activity.media_outlet || '',
                        news_published: activity.news_published,
                        program_page: activity.program_page || '',
                        publication_link: activity.publication_link || '',
                        observations: activity.observations || '',
                        // Contexto Provincial
                        source_type: activity.source_type,
                        governo_provincial_id: activity.governo_provincial_id || undefined,
                        direccao_provincial_id: activity.direccao_provincial_id || undefined,
                        departamento_provincial_id: activity.departamento_provincial_id || undefined,
                    })
                }
                setExistingAttachments(attachments)
            }).catch(console.error).finally(() => setLoading(false))
        }
    }, [id, isEditing])

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setNewFiles(prev => [...prev, ...acceptedFiles])
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': [],
            'video/*': [],
            'application/pdf': [],
            'application/msword': [],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [],
        },
        maxSize: 50 * 1024 * 1024, // 50MB
    })

    const removeNewFile = (index: number) => {
        setNewFiles(prev => prev.filter((_, i) => i !== index))
    }

    const handleRemoveExisting = async (attachment: Attachment) => {
        try {
            await deleteAttachment(attachment.id, attachment.file_path)
            setExistingAttachments(prev => prev.filter(a => a.id !== attachment.id))
            toast.success('Ficheiro removido')
        } catch (err) {
            console.error('Error removing attachment:', err)
            toast.error('Erro ao remover ficheiro')
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!user) return

        console.log('[DEBUG] Submitting Activity Form')
        console.log('[DEBUG] User Profile (Full):', JSON.stringify(profile, null, 2))
        console.log('[DEBUG] Provincial IDs in Profile:', {
            source_type: profile.source_type,
            governo: profile.governo_provincial_id,
            direccao: profile.direccao_provincial_id,
            departamento: profile.departamento_provincial_id
        })
        console.log('[DEBUG] Form Data State:', formData)

        // Validação: Municipio obrigatório apenas se não for provincial ou se o user quiser forçar (?)
        // Na verdade, se o user for provincial, município pode ser opcional.
        // Se o user for municipal, profile.municipio_id estará preenchido e bloqueado.
        // Se profile.source_type === 'provincial', permitimos municipio vazio.
        const isMunicipalityRequired = profile?.source_type !== 'provincial'

        if (!formData.title || !formData.activity_type || !formData.date || (isMunicipalityRequired && !formData.municipio_id)) {
            toast.error('Preencha os campos obrigatórios')
            return
        }

        setSaving(true)
        try {
            let activityId = id

            // Clean up empty optional fields
            const cleanData = {
                ...formData,
                municipio_id: formData.municipio_id || null, // Convert empty string to null if allowed
                time: formData.time || undefined,
                promoter: formData.promoter || undefined,
                media_type_id: formData.media_type_id || undefined,
                media_outlet: formData.media_outlet || undefined,
                program_page: formData.program_page || undefined,
                publication_link: formData.publication_link || undefined,
                observations: formData.observations || undefined,
                minister_name: formData.minister_present ? (formData.minister_name || undefined) : undefined,
                governor_name: formData.governor_present ? (formData.governor_name || undefined) : undefined,
                administrator_name: formData.administrator_present ? (formData.administrator_name || undefined) : undefined,
                // Ensure provincial fields are passed (fallback to profile if form state missed it)
                source_type: formData.source_type || profile?.source_type || 'municipio',
                governo_provincial_id: formData.governo_provincial_id || profile?.governo_provincial_id || undefined,
                direccao_provincial_id: formData.direccao_provincial_id || profile?.direccao_provincial_id || undefined,
                departamento_provincial_id: formData.departamento_provincial_id || profile?.departamento_provincial_id || undefined,
            }

            console.log('[DEBUG] Payload to save (cleanData):', cleanData)

            if (isEditing && id) {
                await updateActivity(id, cleanData)
            } else {
                const created = await createActivity(cleanData, user.id)
                activityId = created.id
            }

            // Upload new files
            if (newFiles.length > 0 && activityId) {
                setUploadingFiles(true)
                for (const file of newFiles) {
                    await uploadAttachment(activityId, file, user.id)
                }
                setUploadingFiles(false)
            }

            toast.success(
                isEditing ? 'Actividade actualizada com sucesso' : 'Actividade criada com sucesso'
            )
            navigate('/activities')
        } catch (err) {
            console.error('Error saving activity:', err)
            toast.error('Erro ao guardar actividade')
        } finally {
            setSaving(false)
        }
    }

    const updateField = <K extends keyof ActivityFormData>(key: K, value: ActivityFormData[K]) => {
        setFormData(prev => ({ ...prev, [key]: value }))
    }

    if (loading) {
        return (
            <DashboardLayout>
                <Header title="A carregar..." subtitle="Actividades Institucionais" />
                <div className="p-6 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout>
            <Header
                title={isEditing ? 'Editar Actividade' : 'Nova Actividade'}
                subtitle="Actividades Institucionais"
            />

            <div className="p-4 sm:p-6">
                <button
                    onClick={() => navigate('/activities')}
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar à listagem
                </button>

                <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
                    {/* Basic Info */}
                    <Card>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Informações Gerais</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Título <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => updateField('title', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    placeholder="Nome da actividade"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Tipo de Actividade <span className="text-red-400">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.activity_type}
                                    onChange={(e) => updateField('activity_type', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                >
                                    <option value="">Seleccionar tipo</option>
                                    {ACTIVITY_TYPES.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Município <span className="text-red-400">*</span>
                                </label>
                                <select
                                    required
                                    value={formData.municipio_id || ''}
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
                                    Data <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="date"
                                    required
                                    value={formData.date}
                                    onChange={(e) => updateField('date', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora</label>
                                <input
                                    type="time"
                                    value={formData.time || ''}
                                    onChange={(e) => updateField('time', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Promotor</label>
                                <input
                                    type="text"
                                    value={formData.promoter || ''}
                                    onChange={(e) => updateField('promoter', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    placeholder="Nome do promotor"
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Presence */}
                    <Card>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Presenças</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {[
                                {
                                    key: 'minister_present' as const,
                                    nameKey: 'minister_name' as const,
                                    label: 'Ministro Presente',
                                    placeholder: 'Nome do Ministro'
                                },
                                {
                                    key: 'governor_present' as const,
                                    nameKey: 'governor_name' as const,
                                    label: 'Governador Presente',
                                    placeholder: 'Nome do Governador'
                                },
                                {
                                    key: 'administrator_present' as const,
                                    nameKey: 'administrator_name' as const,
                                    label: 'Administrador Presente',
                                    placeholder: 'Nome do Administrador'
                                },
                            ].map(({ key, nameKey, label, placeholder }) => (
                                <div
                                    key={key}
                                    className={`p-3 rounded-lg border transition-all ${formData[key]
                                        ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800'
                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                                        }`}
                                >
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={formData[key]}
                                            onChange={(e) => updateField(key, e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500/40"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                                    </label>

                                    {formData[key] && (
                                        <div className="mt-3 pl-7">
                                            <input
                                                type="text"
                                                value={formData[nameKey] || ''}
                                                onChange={(e) => updateField(nameKey, e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 animate-in fade-in slide-in-from-top-1 duration-200"
                                                placeholder={placeholder}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Card>

                    {/* Media Coverage */}
                    <Card>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Cobertura Mediática</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Mídia</label>
                                <select
                                    value={formData.media_type_id || ''}
                                    onChange={(e) => updateField('media_type_id', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                >
                                    <option value="">Nenhum</option>
                                    {mediaTypes.map(mt => (
                                        <option key={mt.id} value={mt.id}>{mt.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Órgão de Comunicação</label>
                                <input
                                    type="text"
                                    value={formData.media_outlet || ''}
                                    onChange={(e) => updateField('media_outlet', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    placeholder="Nome do órgão"
                                />
                            </div>

                            <label className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={formData.news_published}
                                    onChange={(e) => updateField('news_published', e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500/40"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Notícia Publicada</span>
                            </label>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Página do Programa</label>
                                <input
                                    type="text"
                                    value={formData.program_page || ''}
                                    onChange={(e) => updateField('program_page', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Link da Publicação</label>
                                <input
                                    type="url"
                                    value={formData.publication_link || ''}
                                    onChange={(e) => updateField('publication_link', e.target.value)}
                                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                                    placeholder="https://..."
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
                            rows={4}
                            className="w-full px-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
                            placeholder="Notas adicionais sobre a actividade..."
                        />
                    </Card>

                    {/* File Upload */}
                    <Card>
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Evidências / Anexos</h3>

                        {/* Existing attachments */}
                        {existingAttachments.length > 0 && (
                            <div className="space-y-2 mb-4">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ficheiros existentes</p>
                                {existingAttachments.map(att => (
                                    <div key={att.id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FileIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{att.file_name}</span>
                                            <span className="text-xs text-gray-500">{formatFileSize(att.size_bytes)}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveExisting(att)}
                                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Dropzone */}
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
                                {isDragActive ? 'Solte os ficheiros aqui...' : 'Arraste ficheiros ou clique para seleccionar'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">Imagens, vídeos, PDFs, DOC (max 50MB)</p>
                        </div>

                        {/* New files preview */}
                        {newFiles.length > 0 && (
                            <div className="space-y-2 mt-4">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Novos ficheiros ({newFiles.length})</p>
                                {newFiles.map((file, i) => (
                                    <div key={i} className="flex items-center justify-between p-2.5 bg-blue-50 dark:bg-blue-500/5 rounded-lg border border-blue-200 dark:border-blue-500/20">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FileIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                            <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{file.name}</span>
                                            <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeNewFile(i)}
                                            className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    {/* Submit */}
                    <div className="flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate('/activities')}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving || uploadingFiles}
                        >
                            {saving || uploadingFiles ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                                    {uploadingFiles ? 'A enviar ficheiros...' : 'A guardar...'}
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-1.5" />
                                    {isEditing ? 'Actualizar' : 'Criar Actividade'}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    )
}
