// User Roles
export type UserRole = 'superadmin' | 'admin_municipal' | 'tecnico' | 'leitor' | 'direccao_provincial' | 'departamento_comunicacao' | 'departamento_informacao';

// Database Types
export interface Municipio {
    id: string;
    name: string;
    province: string;
    created_at: string;
}

export interface Area {
    id: string;
    name: string;
    municipio_id: string;
    created_at: string;
    // Joined
    municipio?: Municipio;
}

// Entidades Provinciais
export type SourceType = 'municipio' | 'provincial';

export interface GovernoProvincial {
    id: string;
    name: string;
    province: string;
    description: string | null;
    created_at: string;
}

export interface DireccaoProvincial {
    id: string;
    name: string;
    abbreviation: string | null;
    province: string;
    governo_id: string;
    description: string | null;
    created_at: string;
    // Joined
    governo?: GovernoProvincial;
}

export interface DepartamentoProvincial {
    id: string;
    name: string;
    direccao_id: string;
    description: string | null;
    created_at: string;
    // Joined
    direccao?: DireccaoProvincial;
}

export interface Profile {
    id: string;
    full_name: string | null;
    role: UserRole;
    municipio_id: string | null;
    area_id: string | null;
    province: string | null;
    // Contexto Provincial
    source_type?: SourceType;
    governo_provincial_id?: string | null;
    direccao_provincial_id?: string | null;
    departamento_provincial_id?: string | null;

    created_at: string;
    updated_at: string;
    // Joined
    municipio?: Municipio;
    area?: Area;
    governo_provincial?: GovernoProvincial;
    direccao_provincial?: DireccaoProvincial;
    departamento_provincial?: DepartamentoProvincial;
}

export type MediaType = 'image' | 'video' | 'document' | 'audio';

export interface MediaFile {
    id: string;
    title: string;
    description: string | null;
    file_url: string;
    file_path: string;
    file_type: MediaType;
    mime_type: string | null;
    size_bytes: number | null;
    // Fonte: Município
    municipio_id: string | null;
    area_id: string | null;
    // Fonte: Provincial
    source_type: SourceType;
    governo_provincial_id: string | null;
    direccao_provincial_id: string | null;
    departamento_provincial_id: string | null;
    // Meta
    uploaded_by: string | null;
    created_at: string;
    // Joined
    municipio?: Municipio;
    area?: Area;
    uploader?: Profile;
    governo_provincial?: GovernoProvincial;
    direccao_provincial?: DireccaoProvincial;
    departamento_provincial?: DepartamentoProvincial;
}

export interface ActivityLog {
    id: string;
    user_id: string | null;
    action: 'upload' | 'delete' | 'download' | 'login' | 'logout';
    details: Record<string, unknown> | null;
    created_at: string;
    // Joined
    user?: Profile;
}

// Auth Types
export interface AuthUser {
    id: string;
    email: string;
    profile: Profile | null;
}

// Notification Types
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'upload' | 'security';

export interface Notification {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: NotificationType;
    read: boolean;
    read_at: string | null;
    action_url: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

export interface NotificationPreferences {
    id: string;
    user_id: string;
    email_notifications: boolean;
    upload_notifications: boolean;
    security_alerts: boolean;
    created_at: string;
    updated_at: string;
}

// User Invitation Types
export interface UserInvitation {
    id: string;
    token: string;
    email: string;
    full_name: string;
    role: UserRole;
    municipio_id: string | null;
    province: string | null;
    invited_by: string;
    expires_at: string;
    used_at: string | null;
    created_at: string;
    // Joined
    municipio?: Municipio;
    inviter?: Profile;
    // Contexto Provincial
    source_type?: SourceType;
    governo_provincial_id?: string | null;
    direccao_provincial_id?: string | null;
    departamento_provincial_id?: string | null;
    // Joined Provincial
    governo_provincial?: GovernoProvincial;
    direccao_provincial?: DireccaoProvincial;
    departamento_provincial?: DepartamentoProvincial;
}

// Form Types
export interface LoginFormData {
    email: string;
    password: string;
}

export interface MediaUploadFormData {
    title: string;
    description?: string;
    file: File;
    // Fonte: Município
    municipio_id?: string;
    area_id?: string;
    // Fonte: Provincial
    source_type?: SourceType;
    direccao_provincial_id?: string;
    departamento_provincial_id?: string;
}

// Filter Types
export interface MediaFilters {
    search?: string;
    file_type?: MediaType | 'all';
    source_type?: SourceType | 'all';
    // Filtros Município
    municipio_id?: string;
    area_id?: string;
    // Filtros Provincial
    direccao_provincial_id?: string;
    departamento_provincial_id?: string;
    // Datas
    date_from?: string;
    date_to?: string;
}

// Stats Types
export interface DashboardStats {
    total_files: number;
    total_images: number;
    total_videos: number;
    total_documents: number;
    total_audio: number;
    total_storage_bytes: number;
    recent_uploads: MediaFile[];
    recent_activity: ActivityLog[];
}

// API Response Types
export interface ApiResponse<T> {
    data: T | null;
    error: string | null;
}

// ============ Activities Module Types ============

export interface MediaTypeRecord {
    id: string;
    name: string;
    created_at: string;
}

export interface Activity {
    id: string;
    municipio_id: string | null;
    title: string;
    activity_type: string;
    date: string;
    time: string | null;
    promoter: string | null;
    minister_present: boolean;
    governor_present: boolean;
    administrator_present: boolean;
    minister_name: string | null;
    governor_name: string | null;
    administrator_name: string | null;
    media_type_id: string | null;
    media_outlet: string | null;
    news_published: boolean;
    program_page: string | null;
    publication_link: string | null;
    observations: string | null;
    // Contexto Provincial
    source_type?: SourceType;
    governo_provincial_id?: string | null;
    direccao_provincial_id?: string | null;
    departamento_provincial_id?: string | null;

    created_at: string;
    created_by: string | null;
    // Joined
    municipio?: Municipio;
    media_type?: MediaTypeRecord;
    creator?: Profile;
    attachments?: Attachment[];
}

export interface Attachment {
    id: string;
    activity_id: string;
    file_url: string;
    file_path: string;
    file_name: string;
    mime_type: string | null;
    size_bytes: number | null;
    uploaded_by: string | null;
    created_at: string;
}

export interface ActivityFilters {
    search?: string;
    municipio_id?: string;
    month?: number;
    year?: number;
    activity_type?: string;
}

export interface ActivityFormData {
    municipio_id: string | null;
    title: string;
    activity_type: string;
    date: string;
    time?: string;
    promoter?: string;
    minister_present: boolean;
    minister_name?: string;
    governor_present: boolean;
    governor_name?: string;
    administrator_present: boolean;
    administrator_name?: string;
    media_type_id?: string;
    media_outlet?: string;
    news_published: boolean;
    program_page?: string;
    publication_link?: string;
    observations?: string;
    // Contexto Provincial
    source_type?: SourceType;
    governo_provincial_id?: string;
    direccao_provincial_id?: string;
    departamento_provincial_id?: string;
}

// ============ Documents Module Types ============

export type DocumentType = 'oficio' | 'convite' | 'solicitacao' | 'circular' | 'programa' | 'nota';
export type DocumentDirection = 'received' | 'sent';
export type DocumentStatus = 'em_tramitacao' | 'respondido' | 'arquivado';

export interface InstitutionalDocument {
    id: string;
    protocol_number: string;
    type: DocumentType;
    origin: string;
    destination: string;
    subject: string;
    document_date: string;
    direction: DocumentDirection;
    status: DocumentStatus;
    municipio_id: string | null;
    deadline: string | null;
    observations: string | null;
    file_url: string | null;
    file_path: string | null;
    created_at: string;
    created_by: string | null;
    // Joined
    municipio?: Municipio;
    creator?: Profile;
}

export interface DocumentMovement {
    id: string;
    document_id: string;
    action: string;
    performed_by: string | null;
    notes: string | null;
    created_at: string;
    // Joined
    performer?: Profile;
}

export interface DocumentFilters {
    search?: string;
    type?: DocumentType | 'all';
    status?: DocumentStatus | 'all';
    direction?: DocumentDirection | 'all';
    municipio_id?: string;
    date_from?: string;
    date_to?: string;
}

export interface DocumentFormData {
    type: DocumentType;
    origin: string;
    destination: string;
    subject: string;
    document_date: string;
    direction: DocumentDirection;
    status: DocumentStatus;
    municipio_id: string;
    deadline?: string;
    observations?: string;
}

// Display helpers for document types
export const documentTypeLabels: Record<DocumentType, string> = {
    oficio: 'Ofício',
    convite: 'Convite',
    solicitacao: 'Solicitação',
    circular: 'Circular',
    programa: 'Programa',
    nota: 'Nota',
};

export const documentStatusLabels: Record<DocumentStatus, string> = {
    em_tramitacao: 'Em Tramitação',
    respondido: 'Respondido',
    arquivado: 'Arquivado',
};

export const documentDirectionLabels: Record<DocumentDirection, string> = {
    received: 'Recebido',
    sent: 'Enviado',
};

// Role permissions helper
export const rolePermissions: Record<UserRole, {
    canManageUsers: boolean;
    canManageMunicipios: boolean;
    canUpload: boolean;
    canDelete: boolean;
    canManageActivities: boolean;
    canManageDocuments: boolean;
    scopeToMunicipio: boolean;
}> = {
    superadmin: {
        canManageUsers: true,
        canManageMunicipios: true,
        canUpload: true,
        canDelete: true,
        canManageActivities: true,
        canManageDocuments: true,
        scopeToMunicipio: false,
    },
    admin_municipal: {
        canManageUsers: true,
        canManageMunicipios: false,
        canUpload: true,
        canDelete: true,
        canManageActivities: true,
        canManageDocuments: true,
        scopeToMunicipio: true,
    },
    tecnico: {
        canManageUsers: false,
        canManageMunicipios: false,
        canUpload: true,
        canDelete: false,
        canManageActivities: true,
        canManageDocuments: true,
        scopeToMunicipio: true,
    },
    leitor: {
        canManageUsers: false,
        canManageMunicipios: false,
        canUpload: false,
        canDelete: false,
        canManageActivities: false,
        canManageDocuments: false,
        scopeToMunicipio: true,
    },
    direccao_provincial: {
        canManageUsers: true,
        canManageMunicipios: false,
        canUpload: true,
        canDelete: true,
        canManageActivities: true,
        canManageDocuments: true,
        scopeToMunicipio: false,
    },
    departamento_comunicacao: {
        canManageUsers: false,
        canManageMunicipios: false,
        canUpload: true,
        canDelete: false,
        canManageActivities: false,
        canManageDocuments: true,
        scopeToMunicipio: false,
    },
    departamento_informacao: {
        canManageUsers: false,
        canManageMunicipios: false,
        canUpload: true,
        canDelete: false,
        canManageActivities: true,
        canManageDocuments: false,
        scopeToMunicipio: false,
    },
};

// Helper to get file type from mime type
export function getFileTypeFromMime(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
}

// Helper to format file size
export function formatFileSize(bytes: number | null): string {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let size = bytes;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Helper for role display names
export const roleDisplayNames: Record<UserRole, string> = {
    superadmin: 'Super Administrador',
    admin_municipal: 'Administrador Municipal',
    tecnico: 'Técnico',
    leitor: 'Leitor',
    direccao_provincial: 'Direção Provincial',
    departamento_comunicacao: 'Departamento de Comunicação',
    departamento_informacao: 'Departamento de Informação',
};
