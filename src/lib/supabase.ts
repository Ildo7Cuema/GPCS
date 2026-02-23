import { createClient } from '@supabase/supabase-js'
import { withCache, cache, TTL } from './cache'
import type { Profile, Municipio, Area, MediaFile, ActivityLog, MediaFilters, UserRole, Notification, NotificationPreferences, GovernoProvincial, DireccaoProvincial, DepartamentoProvincial, SourceType, UserInvitation } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ============ Auth Helpers ============

type SignupMetadata = {
    full_name?: string
    municipio_id?: string | null
    province?: string | null
}

/**
 * Ensures a profile exists for the given user
 * If no profile exists, creates one with default role
 * This is called after login to handle users created via dashboard
 */
export async function ensureProfileExists(
    userId: string,
    email?: string,
    metadata?: SignupMetadata
): Promise<Profile | null> {
    // First try to get existing profile
    const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select(`
            *,
            municipio:municipios(*),
            area:areas(*),
            governo_provincial:governo_provincial(*),
            direccao_provincial:direccoes_provinciais(*),
            departamento_provincial:departamentos_provinciais(*)
        `)
        .eq('id', userId)
        .single()

    if (existingProfile && !fetchError) {
        return existingProfile as Profile
    }

    // Profile doesn't exist, create one
    console.log('Profile not found, creating default profile...')

    const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
            id: userId,
            full_name: metadata?.full_name || email?.split('@')[0] || 'Utilizador',
            role: 'leitor' as UserRole,
            municipio_id: metadata?.municipio_id ?? null,
            province: metadata?.province ?? null,
        })
        .select(`
            *,
            municipio:municipios(*),
            area:areas(*),
            governo_provincial:governo_provincial(*),
            direccao_provincial:direccoes_provinciais(*),
            departamento_provincial:departamentos_provinciais(*)
        `)
        .single()

    if (createError) {
        console.error('Error creating profile:', createError)
        // Profile might already exist (race condition), try fetching again
        const { data: retryProfile } = await supabase
            .from('profiles')
            .select(`
                *,
                municipio:municipios(*),
                area:areas(*),
                governo_provincial:governo_provincial(*),
                direccao_provincial:direccoes_provinciais(*),
                departamento_provincial:departamentos_provinciais(*)
            `)
            .eq('id', userId)
            .single()
        return retryProfile as Profile | null
    }

    return newProfile as Profile
}

export async function signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) throw error

    // Ensure profile exists (for users created via dashboard)
    if (data.user) {
        const metadata = (data.user.user_metadata || {}) as SignupMetadata
        await ensureProfileExists(data.user.id, email, metadata)
        await logActivity(data.user.id, 'login')
    }

    return data
}

export async function signUp(email: string, password: string, fullName: string, municipioId?: string, province?: string) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                municipio_id: municipioId || null,
                province: province || null,
            } satisfies SignupMetadata,
        },
    })

    if (error) throw error

    return data
}

export async function signOut() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        await logActivity(user.id, 'logout')
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
}

export async function resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) throw error
}

export async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    })

    if (error) throw error
}

export async function getProfile(userId: string): Promise<Profile | null> {
    // Lean select: only fetch provincial joins when needed (lazy-loaded per role)
    const { data, error } = await supabase
        .from('profiles')
        .select(`
            *,
            municipio:municipios(id, name, province),
            area:areas(id, name),
            governo_provincial:governo_provincial(id, name),
            direccao_provincial:direccoes_provinciais(id, name, abbreviation),
            departamento_provincial:departamentos_provinciais(id, name)
        `)
        .eq('id', userId)
        .single()

    if (error) {
        console.error('Error fetching profile:', error)
        return null
    }

    return data as Profile
}

// ============ Municipios ============

export async function getMunicipios(): Promise<Municipio[]> {
    return withCache('municipios:all', TTL.MEDIUM, async () => {
        const { data, error } = await supabase
            .from('municipios')
            .select('*')
            .order('name')

        if (error) throw error
        return data as Municipio[]
    })
}

export async function createMunicipio(name: string, province: string = 'Luanda'): Promise<Municipio> {
    const { data, error } = await supabase
        .from('municipios')
        .insert({ name, province })
        .select()
        .single()

    if (error) throw error
    return data as Municipio
}

export async function deleteMunicipio(id: string): Promise<void> {
    const { error } = await supabase
        .from('municipios')
        .delete()
        .eq('id', id)

    if (error) throw error
}


export async function updateMunicipio(id: string, updates: { name?: string; province?: string }): Promise<Municipio> {
    const { data, error } = await supabase
        .from('municipios')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as Municipio
}

// ============ Areas ============


export async function getAreas(municipioId?: string): Promise<Area[]> {
    let query = supabase
        .from('areas')
        .select(`
      *,
      municipio:municipios(*)
    `)
        .order('name')

    if (municipioId) {
        query = query.eq('municipio_id', municipioId)
    }

    const { data, error } = await query

    if (error) throw error
    return data as Area[]
}

export async function createArea(name: string, municipioId: string): Promise<Area> {
    const { data, error } = await supabase
        .from('areas')
        .insert({ name, municipio_id: municipioId })
        .select()
        .single()

    if (error) throw error
    return data as Area
}

export async function deleteArea(id: string): Promise<void> {
    const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============ Entidades Provinciais ============

export async function getGovernoProvincial(): Promise<GovernoProvincial | null> {
    const { data, error } = await supabase
        .from('governo_provincial')
        .select('*')
        .limit(1)
        .single()

    if (error) {
        console.error('Error fetching governo provincial:', error)
        return null
    }
    return data as GovernoProvincial
}

export async function getDireccoesProvinciais(): Promise<DireccaoProvincial[]> {
    const { data, error } = await supabase
        .from('direccoes_provinciais')
        .select(`
            *,
            governo:governo_provincial(*)
        `)
        .order('name')

    if (error) throw error
    return data as DireccaoProvincial[]
}

export async function getDepartamentosProvinciais(direccaoId?: string): Promise<DepartamentoProvincial[]> {
    let query = supabase
        .from('departamentos_provinciais')
        .select(`
            *,
            direccao:direccoes_provinciais(*)
        `)
        .order('name')

    if (direccaoId) {
        query = query.eq('direccao_id', direccaoId)
    }

    const { data, error } = await query

    if (error) throw error
    return data as DepartamentoProvincial[]
}

export async function createDireccaoProvincial(
    name: string,
    abbreviation: string | null,
    province: string,
    governoId: string
): Promise<DireccaoProvincial> {
    const { data, error } = await supabase
        .from('direccoes_provinciais')
        .insert({ name, abbreviation, province, governo_id: governoId })
        .select()
        .single()

    if (error) throw error
    return data as DireccaoProvincial
}

export async function updateDireccaoProvincial(
    id: string,
    updates: { name?: string; abbreviation?: string | null; province?: string }
): Promise<DireccaoProvincial> {
    const { data, error } = await supabase
        .from('direccoes_provinciais')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as DireccaoProvincial
}

export async function deleteDireccaoProvincial(id: string): Promise<void> {
    const { error } = await supabase
        .from('direccoes_provinciais')
        .delete()
        .eq('id', id)

    if (error) throw error
}

export async function createDepartamentoProvincial(
    name: string,
    direccaoId: string
): Promise<DepartamentoProvincial> {
    const { data, error } = await supabase
        .from('departamentos_provinciais')
        .insert({ name, direccao_id: direccaoId })
        .select()
        .single()

    if (error) throw error
    return data as DepartamentoProvincial
}

export async function deleteDepartamentoProvincial(id: string): Promise<void> {
    const { error } = await supabase
        .from('departamentos_provinciais')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============ Media Files ============

export async function getMediaFiles(filters?: MediaFilters & { limit?: number; offset?: number }): Promise<{ data: MediaFile[]; count: number }> {
    const limit = filters?.limit ?? 24
    const offset = filters?.offset ?? 0

    let query = supabase
        .from('media_files')
        .select(`
            *,
            municipio:municipios(*),
            area:areas(*),
            uploader:profiles(*),
            governo_provincial:governo_provincial(*),
            direccao_provincial:direccoes_provinciais(*),
            departamento_provincial:departamentos_provinciais(*)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

    if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    if (filters?.file_type && filters.file_type !== 'all') {
        query = query.eq('file_type', filters.file_type)
    }

    if (filters?.source_type && filters.source_type !== 'all') {
        query = query.eq('source_type', filters.source_type)
    }

    if (filters?.municipio_id) {
        query = query.eq('municipio_id', filters.municipio_id)
    }

    if (filters?.area_id) {
        query = query.eq('area_id', filters.area_id)
    }

    if (filters?.direccao_provincial_id) {
        query = query.eq('direccao_provincial_id', filters.direccao_provincial_id)
    }

    if (filters?.departamento_provincial_id) {
        query = query.eq('departamento_provincial_id', filters.departamento_provincial_id)
    }

    if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
    }

    if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data as MediaFile[], count: count ?? 0 }
}

export async function getMediaCountByMunicipio(municipioId: string): Promise<number> {
    const { count, error } = await supabase
        .from('media_files')
        .select('*', { count: 'exact', head: true })
        .eq('municipio_id', municipioId)

    if (error) throw error
    return count || 0
}

export async function uploadMediaFile(
    file: File,
    title: string,
    description: string | null,
    municipioId: string | null,
    areaId: string | null,
    uploaderId: string,
    options?: {
        sourceType?: SourceType
        governoProvincialId?: string | null
        direccaoProvincialId?: string | null
        departamentoProvincialId?: string | null
    }
): Promise<MediaFile> {
    // Generate unique file path
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${uploaderId}/${fileName}`

    // Upload to storage
    const { error: uploadError } = await supabase.storage
        .from('media-archive')
        .upload(filePath, file)

    if (uploadError) throw uploadError

    // Get public URL
    const { data: urlData } = supabase.storage
        .from('media-archive')
        .getPublicUrl(filePath)

    // Determine file type
    let fileType: 'image' | 'video' | 'audio' | 'document' = 'document'
    if (file.type.startsWith('image/')) fileType = 'image'
    else if (file.type.startsWith('video/')) fileType = 'video'
    else if (file.type.startsWith('audio/')) fileType = 'audio'

    // Determine source type and related IDs
    const sourceType = options?.sourceType || 'municipio'
    const isProvincial = sourceType === 'provincial'

    // Create database record
    const { data, error } = await supabase
        .from('media_files')
        .insert({
            title,
            description,
            file_url: urlData.publicUrl,
            file_path: filePath,
            file_type: fileType,
            mime_type: file.type,
            size_bytes: file.size,
            source_type: sourceType,
            // Municipal fields (only if source is municipio)
            municipio_id: isProvincial ? null : municipioId,
            area_id: isProvincial ? null : areaId,
            // Provincial fields (only if source is provincial)
            governo_provincial_id: isProvincial ? options?.governoProvincialId : null,
            direccao_provincial_id: isProvincial ? options?.direccaoProvincialId : null,
            departamento_provincial_id: isProvincial ? options?.departamentoProvincialId : null,
            uploaded_by: uploaderId,
        })
        .select()
        .single()

    if (error) throw error

    // Log activity
    await logActivity(uploaderId, 'upload', { file_id: data.id, title, source_type: sourceType })

    return data as MediaFile
}

export async function updateMediaFile(id: string, updates: { title?: string, description?: string }) {
    const { data, error } = await supabase
        .from('media_files')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

    if (error) throw error
    return data as MediaFile
}

export async function deleteMediaFile(id: string, filePath: string, userId: string): Promise<void> {
    // Delete from storage
    const { error: storageError } = await supabase.storage
        .from('media-archive')
        .remove([filePath])

    if (storageError) throw storageError

    // Delete from database
    const { error } = await supabase
        .from('media_files')
        .delete()
        .eq('id', id)

    if (error) throw error

    // Log activity
    await logActivity(userId, 'delete', { file_id: id })
}

// ============ Users/Profiles ============

export async function getUsers(): Promise<Profile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select(`
      *,
      municipio:municipios(*),
      area:areas(*)
    `)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data as Profile[]
}

export async function getProfileCountByMunicipio(municipioId: string): Promise<number> {
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('municipio_id', municipioId)

    if (error) throw error
    return count || 0
}

export async function updateUserRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId)

    if (error) throw error
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId)

    if (error) throw error
}

export async function deleteUser(userId: string): Promise<void> {
    // Try to delete completely via RPC (removes from auth.users + profiles)
    const { error: rpcError } = await supabase.rpc('delete_user_completely', { user_id: userId })

    if (!rpcError) return

    console.warn('RPC delete failed/not available, falling back to profile delete:', rpcError)

    // Fallback: Delete the user profile
    // Note: This only deletes the profile, leaving the auth user (orphan)
    const { error, data } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId)
        .select()

    if (error) throw error

    if (!data || data.length === 0) {
        throw new Error('Não foi possível eliminar o utilizador. Verifique as permissões ou se o utilizador já foi eliminado.')
    }
}

// ============ Activity Logs ============

export async function logActivity(
    userId: string,
    action: 'upload' | 'delete' | 'download' | 'login' | 'logout',
    details?: Record<string, unknown>
): Promise<void> {
    try {
        await supabase
            .from('activity_logs')
            .insert({
                user_id: userId,
                action,
                details: details || null,
            })
    } catch (error) {
        console.error('Error logging activity:', error)
    }
}

export async function getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    const { data, error } = await supabase
        .from('activity_logs')
        .select(`
      *,
      user:profiles(*)
    `)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) throw error
    return data as ActivityLog[]
}

// ============ Dashboard Stats ============

export async function getDashboardStats(): Promise<{
    totalFiles: number
    totalImages: number
    totalVideos: number
    totalDocuments: number
    totalAudio: number
    totalStorageBytes: number
}> {
    return withCache('dashboard:stats', TTL.SHORT, async () => {
        // Use parallel DB-level counts — zero rows transferred
        const [total, images, videos, documents, audio, storageResult] = await Promise.all([
            supabase.from('media_files').select('*', { count: 'exact', head: true }),
            supabase.from('media_files').select('*', { count: 'exact', head: true }).eq('file_type', 'image'),
            supabase.from('media_files').select('*', { count: 'exact', head: true }).eq('file_type', 'video'),
            supabase.from('media_files').select('*', { count: 'exact', head: true }).eq('file_type', 'document'),
            supabase.from('media_files').select('*', { count: 'exact', head: true }).eq('file_type', 'audio'),
            supabase.from('media_files').select('size_bytes').then(r => r),
        ])

        const totalStorage = (storageResult.data || []).reduce(
            (acc: number, f: { size_bytes: number | null }) => acc + (f.size_bytes || 0), 0
        )

        return {
            totalFiles: total.count ?? 0,
            totalImages: images.count ?? 0,
            totalVideos: videos.count ?? 0,
            totalDocuments: documents.count ?? 0,
            totalAudio: audio.count ?? 0,
            totalStorageBytes: totalStorage,
        }
    })
}

// ============ Notifications Helpers ============

export async function getNotifications(userId: string, limit = 20): Promise<Notification[]> {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching notifications:', error)
        return []
    }

    return data as Notification[]
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
    try {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('read', false)

        if (error) {
            console.warn('Unread count fetch failed:', error.message || error.code)
            return 0
        }

        return count || 0
    } catch {
        // Network error (e.g. offline) — silent, polling will retry
        return 0
    }
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

    if (error) throw error
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('read', false)

    if (error) throw error
}

export async function deleteNotification(notificationId: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

    if (error) throw error
}

export async function clearAllNotifications(userId: string): Promise<void> {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)

    if (error) throw error
}

export async function createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' | 'upload' | 'security' = 'info',
    actionUrl?: string,
    metadata?: Record<string, unknown>
): Promise<Notification | null> {
    const { data, error } = await supabase
        .from('notifications')
        .insert({
            user_id: userId,
            title,
            message,
            type,
            action_url: actionUrl,
            metadata,
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating notification:', error)
        return null
    }

    return data as Notification
}

// ============ Notification Preferences ============

export async function getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error) {
        // If not found, create default preferences
        if (error.code === 'PGRST116') {
            const newPrefs = await createNotificationPreferences(userId)
            return newPrefs
        }
        console.error('Error fetching notification preferences:', error)
        return null
    }

    return data as NotificationPreferences
}

export async function createNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
        .from('notification_preferences')
        .insert({
            user_id: userId,
            email_notifications: true,
            upload_notifications: true,
            security_alerts: true,
        })
        .select()
        .single()

    if (error) {
        console.error('Error creating notification preferences:', error)
        return null
    }

    return data as NotificationPreferences
}

export async function updateNotificationPreferences(
    userId: string,
    preferences: Partial<Pick<NotificationPreferences, 'email_notifications' | 'upload_notifications' | 'security_alerts'>>
): Promise<NotificationPreferences | null> {
    const { data, error } = await supabase
        .from('notification_preferences')
        .update({
            ...preferences,
            updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .select()
        .single()

    if (error) {
        // If not found, create then update
        if (error.code === 'PGRST116') {
            await createNotificationPreferences(userId)
            return updateNotificationPreferences(userId, preferences)
        }
        console.error('Error updating notification preferences:', error)
        return null
    }

    return data as NotificationPreferences
}

// ============ User Invitations ============

export async function createInvitation(
    email: string,
    fullName: string,
    role: UserRole,
    invitedBy: string,
    municipioId?: string | null,
    province?: string | null,
    // Add optional provincial params
    sourceType?: SourceType,
    direccaoProvincialId?: string | null,
    departamentoProvincialId?: string | null
): Promise<UserInvitation> {
    const { data, error } = await supabase
        .from('user_invitations')
        .insert({
            email,
            full_name: fullName,
            role,
            municipio_id: municipioId ?? null,
            province: province ?? null,
            invited_by: invitedBy,
            source_type: sourceType ?? 'municipio',
            direccao_provincial_id: direccaoProvincialId ?? null,
            departamento_provincial_id: departamentoProvincialId ?? null,
        })
        .select(`
            *,
            municipio:municipios(*)
        `)
        .single()

    if (error) throw error
    return data as UserInvitation
}

export async function getInvitationByToken(token: string): Promise<UserInvitation | null> {
    const { data, error } = await supabase
        .from('user_invitations')
        .select(`
            *,
            municipio:municipios(*)
        `)
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

    if (error) {
        if (error.code === 'PGRST116') return null // Not found
        throw error
    }
    return data as UserInvitation
}

export async function getPendingInvitations(): Promise<UserInvitation[]> {
    const { data, error } = await supabase
        .from('user_invitations')
        .select(`
            *,
            municipio:municipios(*)
        `)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

    if (error) throw error
    return data as UserInvitation[]
}

export async function completeInvitation(token: string, password: string): Promise<void> {
    // 1. Get the invitation
    const invitation = await getInvitationByToken(token)
    if (!invitation) {
        throw new Error('Convite inválido ou expirado.')
    }

    // 2. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
            data: {
                full_name: invitation.full_name,
                municipio_id: invitation.municipio_id,
                province: invitation.province,
            } satisfies SignupMetadata,
        },
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Erro ao criar utilizador.')

    // 3. Create profile with the role from invitation
    // The database trigger 'handle_new_user' (see migrations) now handles this automatically
    // using the role specified in the invitation. We don't need to manually create the profile here.
    // Also, manual upsert might fail due to RLS policies as the new user might not have permission 
    // to update their own role.

    /*
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: authData.user.id,
            full_name: invitation.full_name,
            role: invitation.role,
            municipio_id: invitation.municipio_id,
            province: invitation.province,
        })

    if (profileError) throw profileError
    */

    // 4. Mark invitation as used
    const { error: updateError } = await supabase
        .from('user_invitations')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invitation.id)

    if (updateError) {
        console.error('Error marking invitation as used:', updateError)
    }
}

export async function cancelInvitation(id: string): Promise<void> {
    const { error } = await supabase
        .from('user_invitations')
        .delete()
        .eq('id', id)

    if (error) throw error
}
