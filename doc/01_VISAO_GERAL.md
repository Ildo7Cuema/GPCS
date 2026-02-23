# 01. Visão Geral do Sistema GPCS

## Introdução
O **GPCS (Gestão Provincial de Comunicação Social)** é uma plataforma web desenvolvida para modernizar e centralizar a gestão de atividades de comunicação, documentos institucionais e arquivos de mídia (fotos, vídeos, áudios) para o Governo Provincial e suas administrações municipais.

O sistema permite que diferentes níveis de usuários (Superadmin, Administradores Municipais, Técnicos e Leitores) colaborem em um ambiente seguro, com controle de acesso granular baseado em funções (RBAC) e Row Level Security (RLS) no banco de dados.

## Principais Funcionalidades

### 1. Gestão de Atividades
- Registro de atividades governamentais (inaugurações, visitas, reuniões).
- Acompanhamento de presença de autoridades (Ministro, Governador, Administrador).
- Classificação por tipo de mídia e veículo de comunicação.
- Upload de evidências (anexos) relacionados à atividade.
- Filtros por município, data e tipo de atividade.

### 2. Gestão de Documentos
- Controle de trâmites de documentos (Ofícios, Convites, Circulares).
- Registro de origem, destino e prazos de resposta.
- Monitoramento de status (Em tramitação, Respondido, Arquivado).

### 3. Arquivo Multimídia
- Repositório centralizado de imagens, vídeos e documentos.
- Categorização automática por tipo de arquivo.
- Associação de mídia a municípios e departamentos.

### 4. Administração
- Gestão de usuários e convites por e-mail.
- Configuração de municípios e áreas.
- Painéis de estatísticas e relatórios.

## Tecnologias Utilizadas

### Frontend
- **React 18**: Biblioteca principal para construção da interface.
- **Vite**: Build tool rápida e leve.
- **TypeScript**: Tipagem estática para maior robustez.
- **Tailwind CSS**: Framework de estilização utilitária.
- **React Router**: Gerenciamento de rotas e navegação.
- **Lucide React**: Ícones modernos e leves.

### Backend & Banco de Dados
- **Supabase**: Plataforma Backend-as-a-Service (BaaS).
- **PostgreSQL**: Banco de dados relacional robusto.
- **Supabase Auth**: Autenticação segura e gestão de usuários.
- **Supabase Storage**: Armazenamento de arquivos grandes (mídia).
- **Row Level Security (RLS)**: Segurança a nível de linha no banco de dados.

## Estrutura do Projeto
O projeto segue uma estrutura moderna de Single Page Application (SPA):
- `/src`: Código fonte do frontend.
- `/supabase`: Configurações de banco de dados, migrações e types gerados.
- `/public`: Arquivos estáticos públicos.
