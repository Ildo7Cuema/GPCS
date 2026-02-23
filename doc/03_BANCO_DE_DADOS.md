# 03. Banco de Dados e Segurança

## Visão Geral do Schema

O banco de dados utiliza PostgreSQL e é gerenciado pelo Supabase. O esquema principal (`public`) contém as tabelas de negócio, enquanto o esquema `auth` gerencia usuários e sessões.

### Principais Tabelas

#### 1. `profiles`
Estende a tabela `auth.users` com informações adicionais do perfil do usuário.
- `id`: UUID (FK para `auth.users`).
- `full_name`: Nome completo.
- `role`: Enum `user_role` (Função do usuário).
- `municipio_id`: FK para `municipios` (Opcional, define o escopo geográfico).
- `area_id`: FK para `areas` (Opcional, departamento).
- `province`: Província (Contexto provincial).

#### 2. `municipios`
Lista os municípios gerenciados pelo sistema.
- `id`: UUID.
- `name`: Nome do município.
- `province`: Província de pertencimento.

#### 3. `activities`
Registro central de atividades realizadas.
- `municipio_id`: FK para `municipios`.
- `title`, `description`: Detalhes da atividade.
- `date`, `time`: Data e hora.
- `minister_present`, `governor_present`, `administrator_present`: Flags de autoridades.
- `media_type_id`: FK para `media_types`.

#### 4. `media_files` e `attachments`
Armazenam metadados de arquivos.
- `file_url`, `file_path`: Referências ao Supabase Storage.
- `file_type`: Tipo de mídia (imagem, vídeo, documento).

#### 5. `institutional_documents` (Módulo de Documentos)
Gerencia ofícios, circulares e outros documentos.
- `protocol_number`: Número de protocolo.
- `type`: Enum `document_type` (Ofício, Circular, etc.).
- `status`: Enum `document_status` (Em tramitação, etc.).

## Controle de Acesso (RBAC & RLS)

O sistema utiliza Row Level Security (RLS) para garantir que usuários acessem apenas o que lhes é permitido.

### Roles (Funções de Usuário)

| Role | Descrição | Permissões Típicas |
| :--- | :--- | :--- |
| `superadmin` | Administrador Geral | Acesso total a todos os dados e municípios. |
| `admin_municipal` | Admin Local | Gestão total dentro do seu `municipio_id`. |
| `tecnico` | Operador | Pode inserir e ver dados do seu município, mas não deletar (geralmente). |
| `leitor` | Visualizador | Apenas visualização de dados do seu município. |
| `direccao_provincial` | Gestor Provincial | Visão ampla a nível provincial. |

### Políticas de Segurança (Row Level Security)

As políticas RLS são aplicadas em todas as tabelas críticas. Exemplo simplificado:

**Tabela `activities`**:
- **SELECT**:
    - `superadmin`: Vê tudo (`true`).
    - Outros: Vê apenas se `auth.uid().municipio_id == activities.municipio_id`.
- **INSERT/UPDATE**:
    - `leitor`: Negado.
    - `tecnico`/`admin_municipal`: Permitido apenas se `municipio_id` bater com o do perfil.
- **DELETE**:
    - Apenas `superadmin` e `admin_municipal`.

### Storage Policies

Os arquivos no Supabase Storage (`storage.objects`) também são protegidos:
- **Bucket `media-archive` / `activity-evidence`**:
    - **Leitura**: Autenticado.
    - **Escrita**: Autenticado (geralmente validado pelo Backend/Trigger para garantir coerência).

## Triggers e Automação

- **`on_auth_user_created`**: Gatilho que cria automaticamente uma entrada na tabela `public.profiles` quando um novo usuário se registra em `auth.users`.
- **Validações de Integridade**: Constraints SQL garantem que datas sejam válidas e chaves estrangeiras existam.
