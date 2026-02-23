import { supabase } from './supabase'
import type { InstitutionalDocument, DocumentFilters, DocumentFormData, DocumentMovement } from './types'

// ============ Documents ============

export async function getDocuments(
    filters?: DocumentFilters & { limit?: number; offset?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' }
): Promise<{ data: InstitutionalDocument[]; count: number }> {
    const limit = filters?.limit ?? 20
    const offset = filters?.offset ?? 0
    const sortBy = filters?.sortBy ?? 'created_at'
    const sortOrder = filters?.sortOrder ?? 'desc'

    let query = supabase
        .from('documents')
        .select(`
            *,
            municipio:municipios(*),
            creator:profiles!documents_created_by_fkey(*)
        `, { count: 'exact' })
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1)

    if (filters?.search) {
        query = query.or(`subject.ilike.%${filters.search}%,origin.ilike.%${filters.search}%,destination.ilike.%${filters.search}%,protocol_number.ilike.%${filters.search}%`)
    }

    if (filters?.type && filters.type !== 'all') {
        query = query.eq('type', filters.type)
    }

    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status)
    }

    if (filters?.direction && filters.direction !== 'all') {
        query = query.eq('direction', filters.direction)
    }

    if (filters?.municipio_id) {
        query = query.eq('municipio_id', filters.municipio_id)
    }

    if (filters?.date_from) {
        query = query.gte('document_date', filters.date_from)
    }

    if (filters?.date_to) {
        query = query.lte('document_date', filters.date_to)
    }

    const { data, error, count } = await query

    if (error) throw error
    return { data: data as InstitutionalDocument[], count: count ?? 0 }
}

export async function getDocument(id: string): Promise<InstitutionalDocument | null> {
    const { data, error } = await supabase
        .from('documents')
        .select(`
            *,
            municipio:municipios(*),
            creator:profiles!documents_created_by_fkey(*)
        `)
        .eq('id', id)
        .single()

    if (error) {
        console.error('Error fetching document:', error)
        return null
    }
    return data as InstitutionalDocument
}

export async function createDocument(formData: DocumentFormData, userId: string): Promise<InstitutionalDocument> {
    const { data, error } = await supabase
        .from('documents')
        .insert({
            ...formData,
            created_by: userId,
        })
        .select(`
            *,
            municipio:municipios(*)
        `)
        .single()

    if (error) throw error
    return data as InstitutionalDocument
}

export async function updateDocument(id: string, formData: Partial<DocumentFormData>): Promise<InstitutionalDocument> {
    const { data, error } = await supabase
        .from('documents')
        .update(formData)
        .eq('id', id)
        .select(`
            *,
            municipio:municipios(*)
        `)
        .single()

    if (error) throw error
    return data as InstitutionalDocument
}

export async function deleteDocument(id: string): Promise<void> {
    // Delete associated file from storage if exists
    const { data: doc } = await supabase
        .from('documents')
        .select('file_path')
        .eq('id', id)
        .single()

    if (doc?.file_path) {
        await supabase.storage.from('document-attachments').remove([doc.file_path])
    }

    const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id)

    if (error) throw error
}

// ============ Document File Upload ============

export async function uploadDocumentFile(
    documentId: string,
    file: File,
    userId: string
): Promise<{ file_url: string; file_path: string }> {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    const filePath = `${userId}/${documentId}/${fileName}`

    const { error: uploadError } = await supabase.storage
        .from('document-attachments')
        .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
        .from('document-attachments')
        .getPublicUrl(filePath)

    // Update document with file reference
    await supabase
        .from('documents')
        .update({ file_url: urlData.publicUrl, file_path: filePath })
        .eq('id', documentId)

    return { file_url: urlData.publicUrl, file_path: filePath }
}

// ============ Document Movements ============

export async function getDocumentMovements(documentId: string): Promise<DocumentMovement[]> {
    const { data, error } = await supabase
        .from('document_movements')
        .select(`
            *,
            performer:profiles!document_movements_performed_by_fkey(*)
        `)
        .eq('document_id', documentId)
        .order('created_at', { ascending: true })

    if (error) throw error
    return data as DocumentMovement[]
}

export async function addDocumentMovement(
    documentId: string,
    action: string,
    userId: string,
    notes?: string
): Promise<DocumentMovement> {
    const { data, error } = await supabase
        .from('document_movements')
        .insert({
            document_id: documentId,
            action,
            performed_by: userId,
            notes: notes || null,
        })
        .select(`
            *,
            performer:profiles!document_movements_performed_by_fkey(*)
        `)
        .single()

    if (error) throw error
    return data as DocumentMovement
}

// ============ Document Stats ============

export async function getDocumentStats(municipioId?: string): Promise<{
    total: number;
    received: number;
    sent: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
}> {
    let query = supabase.from('documents').select('*')

    if (municipioId) {
        query = query.eq('municipio_id', municipioId)
    }

    const { data, error } = await query
    if (error) throw error

    const docs = data as InstitutionalDocument[]

    const byStatus: Record<string, number> = {}
    const byType: Record<string, number> = {}
    let received = 0
    let sent = 0

    for (const d of docs) {
        byStatus[d.status] = (byStatus[d.status] || 0) + 1
        byType[d.type] = (byType[d.type] || 0) + 1
        if (d.direction === 'received') received++
        else sent++
    }

    return {
        total: docs.length,
        received,
        sent,
        byStatus,
        byType,
    }
}
