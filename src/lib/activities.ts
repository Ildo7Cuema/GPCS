import { supabase } from './supabase'
import { withCache, TTL } from './cache'
import type { Activity, ActivityFilters, ActivityFormData, Attachment, MediaTypeRecord, Profile } from './types'

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
    return data as Activity
}

export async function createActivity(formData: ActivityFormData, userId: string): Promise<Activity> {
    console.log('[DEBUG] createActivity payload:', { formData, userId })
    const { data, error } = await supabase
        .from('activities')
        .insert({
            ...formData,
            created_by: userId,
        })
        .select(`
            *,
            municipio:municipios(*),
            media_type:media_types(*)
        `)
        .single()

    if (error) throw error
    return data as Activity
}

export async function updateActivity(id: string, formData: Partial<ActivityFormData>): Promise<Activity> {
    const { data, error } = await supabase
        .from('activities')
        .update(formData)
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
    const { data } = await getActivities({ ...filters, limit: 10000, offset: 0 })

    const headers = [
        'Título', 'Tipo', 'Data', 'Hora', 'Município', 'Promotor',
        'Ministro Presente', 'Governador Presente', 'Administrador Presente',
        'Tipo de Mídia', 'Órgão de Comunicação', 'Notícia Publicada',
        'Página do Programa', 'Link da Publicação', 'Observações'
    ]

    const rows = data.map(a => [
        a.title,
        a.activity_type,
        a.date,
        a.time || '',
        a.municipio?.name || '',
        a.promoter || '',
        a.promoter || '',
        a.minister_present ? `Sim (${a.minister_name || ''})` : 'Não',
        a.governor_present ? `Sim (${a.governor_name || ''})` : 'Não',
        a.administrator_present ? `Sim (${a.administrator_name || ''})` : 'Não',
        a.media_type?.name || '',
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

export async function getActivityStats(municipioId?: string): Promise<{
    total: number;
    withMedia: number;
    byType: Record<string, number>;
    byMunicipio: { municipio_name: string; count: number }[];
}> {
    const cacheKey = `activity:stats:${municipioId || 'all'}`
    return withCache(cacheKey, TTL.SHORT, async () => {
        // Use parallel minimal queries: only select columns we actually need
        let baseQuery = supabase
            .from('activities')
            .select('activity_type, news_published, municipio:municipios(name)')

        if (municipioId) {
            baseQuery = baseQuery.eq('municipio_id', municipioId)
        }

        const [totalRes, withMediaRes, dataRes] = await Promise.all([
            (() => {
                let q = supabase.from('activities').select('*', { count: 'exact', head: true })
                if (municipioId) q = q.eq('municipio_id', municipioId)
                return q
            })(),
            (() => {
                let q = supabase.from('activities').select('*', { count: 'exact', head: true }).eq('news_published', true)
                if (municipioId) q = q.eq('municipio_id', municipioId)
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
