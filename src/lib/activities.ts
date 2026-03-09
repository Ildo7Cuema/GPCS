import { supabase } from './supabase'
import { notifySuperAdmins } from './supabase'
import { withCache, TTL } from './cache'
import type { Activity, ActivityFilters, ActivityFormData, Attachment, MediaTypeRecord } from './types'
// ============ Media Types ============

export async function getMediaTypes(): Promise<MediaTypeRecord[]> {
    const { data, error } = await supabase
        .from('media_types')
        .select('*')
        .order('name')

    if (error) throw error
    return data as MediaTypeRecord[]
}

// ============ Activities ============

export async function getActivities(
    filters?: ActivityFilters & { limit?: number; offset?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
): Promise<{ data: Activity[]; count: number }> {
    const limit = filters?.limit ?? 20
    const offset = filters?.offset ?? 0
    const sortBy = filters?.sortBy ?? 'date'
    const sortOrder = filters?.sortOrder ?? 'desc'
    const profile = filters?.profile

    let query = supabase
        .from('activities')
        .select(`
            *,
            municipio:municipios(*),
            media_type:media_types(*),
            creator:profiles!activities_created_by_fkey(*)
        `, { count: 'exact' })
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1)

    // Apply strict access controls based on user profile
    if (profile && profile.role !== 'superadmin') {
        if (profile.role === 'admin_municipal' || profile.role === 'tecnico' || profile.role === 'leitor') {
            query = query.eq('source_type', 'municipio').eq('municipio_id', profile.municipio_id)
        } else if (profile.role === 'direccao_provincial') {
            query = query.eq('source_type', 'provincial').eq('direccao_provincial_id', profile.direccao_provincial_id)
        } else if (profile.role === 'departamento_comunicacao' || profile.role === 'departamento_informacao') {
            query = query.eq('source_type', 'provincial').eq('departamento_provincial_id', profile.departamento_provincial_id)
        }
    }

    if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,promoter.ilike.%${filters.search}%,observations.ilike.%${filters.search}%`)
    }

    if (filters?.municipio_id) {
        query = query.eq('municipio_id', filters.municipio_id)
    }

    if (filters?.activity_type) {
        query = query.eq('activity_type', filters.activity_type)
    }

    if (filters?.year) {
        const startDate = `${filters.year}-01-01`
        const endDate = `${filters.year}-12-31`
        query = query.gte('date', startDate).lte('date', endDate)
    }

    if (filters?.month && filters?.year) {
        const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`
        const lastDay = new Date(filters.year, filters.month, 0).getDate()
        const endDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-${lastDay}`
        query = query.gte('date', startDate).lte('date', endDate)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data as Activity[], count: count ?? 0 }
}

export async function getActivity(id: string): Promise<Activity | null> {
    const { data, error } = await supabase
        .from('activities')
        .select(`
            *,
            municipio:municipios(*),
            media_type:media_types(*),
            creator:profiles!activities_created_by_fkey(*)
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching activity:', error)
        return null
    }

    const activity = data as Activity

    // Resolver nomes dos tipos de mídia (array)
    if (activity.media_type_ids && activity.media_type_ids.length > 0) {
        const { data: mtData } = await supabase
            .from('media_types')
            .select('*')
            .in('id', activity.media_type_ids)
        activity.media_types_data = (mtData as MediaTypeRecord[]) || []
    } else if (activity.media_type) {
        // fallback legado: se só existe o tipo singular, normalizar para array
        activity.media_types_data = [activity.media_type]
        activity.media_type_ids = activity.media_type_id ? [activity.media_type_id] : []
    } else {
        activity.media_types_data = []
    }

    return activity
}

export async function createActivity(formData: ActivityFormData, userId: string): Promise<Activity> {
    console.log('[DEBUG] createActivity payload:', { formData, userId })

    // Normalizar: garantir que media_type_ids está sempre preenchido
    const mediaTypeIds = formData.media_type_ids && formData.media_type_ids.length > 0
        ? formData.media_type_ids
        : (formData.media_type_id ? [formData.media_type_id] : [])

    const { data, error } = await supabase
        .from('activities')
        .insert({
            ...formData,
            media_type_ids: mediaTypeIds,
            media_type_id: mediaTypeIds[0] || null, // manter legado com o primeiro
            created_by: userId,
        })
        .select(`
            *,
            municipio:municipios(*),
            media_type:media_types(*)
        `)
        .single()

    if (error) throw error

    // Notify Super Admins (fire-and-forget)
    notifySuperAdmins(
        'Nova Actividade Registada',
        `Uma nova actividade foi registada: "${data.title}"`,
        'info',
        '/activities',
        { activity_id: data.id }
    ).catch(() => { /* silent */ })

    return data as Activity
}

export async function updateActivity(id: string, formData: Partial<ActivityFormData>): Promise<Activity> {
    // Normalizar media_type_ids
    const mediaTypeIds = formData.media_type_ids && formData.media_type_ids.length > 0
        ? formData.media_type_ids
        : (formData.media_type_id ? [formData.media_type_id] : undefined)

    const payload = {
        ...formData,
        ...(mediaTypeIds !== undefined && {
            media_type_ids: mediaTypeIds,
            media_type_id: mediaTypeIds[0] || null,
        }),
    }

    const { data, error } = await supabase
        .from('activities')
        .update(payload)
        .eq('id', id)
        .select(`
            *,
            municipio:municipios(*),
            media_type:media_types(*)
        `)
        .single()

    if (error) throw error
    return data as Activity
}

export async function deleteActivity(id: string): Promise<void> {
    // First delete attachments from storage
    const { data: attachments } = await supabase
        .from('attachments')
        .select('file_path')
        .eq('activity_id', id)

    if (attachments && attachments.length > 0) {
        const paths = attachments.map(a => a.file_path)
        await supabase.storage.from('activity-evidence').remove(paths)
    }

    const { error } = await supabase
        .from('activities')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============ Attachments ============

export async function getAttachments(activityId: string): Promise<Attachment[]> {
    const { data, error } = await supabase
        .from('attachments')
        .select('*')
        .eq('activity_id', activityId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data as Attachment[]
}

export async function uploadAttachment(
    activityId: string,
    file: File,
    userId: string
): Promise<Attachment> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${userId}/${activityId}/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('activity-evidence')
        .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
        .from('activity-evidence')
        .getPublicUrl(filePath)

    const { data, error } = await supabase
        .from('attachments')
        .insert({
            activity_id: activityId,
            file_url: urlData.publicUrl,
            file_path: filePath,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            uploaded_by: userId,
        })
        .select()
        .single()

    if (error) throw error

    // Notify Super Admins (fire-and-forget)
    notifySuperAdmins(
        'Novo Anexo de Actividade',
        `Um novo ficheiro foi anexado a uma actividade: "${file.name}"`,
        'upload',
        '/activities',
        { activity_id: activityId }
    ).catch(() => { /* silent */ })

    return data as Attachment
}

export async function deleteAttachment(id: string, filePath: string): Promise<void> {
    await supabase.storage.from('activity-evidence').remove([filePath])

    const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============ CSV Export ============

export async function exportActivitiesCsv(filters?: ActivityFilters): Promise<string> {
    // Buscar actividades + todos os media_types para resolver nomes
    const [{ data }, mediaTypesRaw] = await Promise.all([
        getActivities({ ...filters, limit: 10000, offset: 0 }),
        getMediaTypes(),
    ])

    const mtMap = new Map<string, string>(mediaTypesRaw.map(mt => [mt.id, mt.name]))

    const resolveMediaTypes = (activity: Activity): string => {
        if (activity.media_type_ids && activity.media_type_ids.length > 0) {
            return activity.media_type_ids.map(id => mtMap.get(id) || id).join(', ')
        }
        return activity.media_type?.name || ''
    }

    const headers = [
        'Título', 'Tipo', 'Data', 'Hora', 'Município', 'Promotor',
        'Ministro Presente', 'Governador Presente', 'Administrador Presente',
        'Tipo(s) de Mídia', 'Órgão de Comunicação', 'Notícia Publicada',
        'Página do Programa', 'Link da Publicação', 'Observações'
    ]

    const rows = data.map(a => [
        a.title,
        a.activity_type,
        a.date,
        a.time || '',
        a.municipio?.name || '',
        a.promoter || '',
        a.minister_present ? `Sim (${a.minister_name || ''})` : 'Não',
        a.governor_present ? `Sim (${a.governor_name || ''})` : 'Não',
        a.administrator_present ? `Sim (${a.administrator_name || ''})` : 'Não',
        resolveMediaTypes(a),
        a.media_outlet || '',
        a.news_published ? 'Sim' : 'Não',
        a.program_page || '',
        a.publication_link || '',
        a.observations || '',
    ])

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    return csvContent
}

// ============ Activity Stats ============

export async function getActivityStats(
    municipioId?: string,
    dateFrom?: string,
    dateTo?: string,
): Promise<{
    total: number;
    withMedia: number;
    byType: Record<string, number>;
    byMunicipio: { municipio_name: string; count: number }[];
}> {
    const cacheKey = `activity:stats:${municipioId || 'all'}:${dateFrom || ''}:${dateTo || ''}`
    return withCache(cacheKey, TTL.SHORT, async () => {
        // Use parallel minimal queries: only select columns we actually need
        let baseQuery = supabase
            .from('activities')
            .select('activity_type, news_published, municipio:municipios(name)')

        if (municipioId) {
            baseQuery = baseQuery.eq('municipio_id', municipioId)
        }
        if (dateFrom) baseQuery = baseQuery.gte('date', dateFrom)
        if (dateTo) baseQuery = baseQuery.lte('date', dateTo)

        const [totalRes, withMediaRes, dataRes] = await Promise.all([
            (() => {
                let q = supabase.from('activities').select('*', { count: 'exact', head: true })
                if (municipioId) q = q.eq('municipio_id', municipioId)
                if (dateFrom) q = q.gte('date', dateFrom)
                if (dateTo) q = q.lte('date', dateTo)
                return q
            })(),
            (() => {
                let q = supabase.from('activities').select('*', { count: 'exact', head: true }).eq('news_published', true)
                if (municipioId) q = q.eq('municipio_id', municipioId)
                if (dateFrom) q = q.gte('date', dateFrom)
                if (dateTo) q = q.lte('date', dateTo)
                return q
            })(),
            baseQuery,
        ])

        type ActivityRow = { activity_type: string; news_published: boolean; municipio: { name: string } | { name: string }[] | null }
        const activities = (dataRes.data || []) as unknown as ActivityRow[]

        const byType: Record<string, number> = {}
        const municipioCounts: Record<string, number> = {}

        for (const a of activities) {
            byType[a.activity_type] = (byType[a.activity_type] || 0) + 1
            const mRaw = a.municipio
            const mName = (Array.isArray(mRaw) ? mRaw[0]?.name : mRaw?.name) || 'Desconhecido'
            municipioCounts[mName] = (municipioCounts[mName] || 0) + 1
        }

        const byMunicipio = Object.entries(municipioCounts)
            .map(([municipio_name, count]) => ({ municipio_name, count }))
            .sort((a, b) => b.count - a.count)

        return {
            total: totalRes.count ?? 0,
            withMedia: withMediaRes.count ?? 0,
            byType,
            byMunicipio,
        }
    })
}
