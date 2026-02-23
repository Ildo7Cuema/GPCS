# 06. Estrutura de Arquivos e Pastas

Este documento detalha o propósito de cada pasta e arquivo significativo no projeto, cobrindo tanto o Frontend (React) quanto o Backend (Supabase).

## 1. Raiz do Projeto (`/`)

| Arquivo/Pasta | Descrição |
| :--- | :--- |
| `src/` | Código fonte da aplicação React. |
| `supabase/` | Configurações do Supabase (migrações, config). |
| `public/` | Arquivos estáticos servidos diretamente (favicon, robots.txt). |
| `doc/` | Documentação do projeto (esta pasta). |
| `.env.example` | Modelo das variáveis de ambiente necessárias. |
| `package.json` | Lista de dependências e scripts npm. |
| `vite.config.ts` | Configuração do bundler Vite. |
| `tsconfig.json` | Configuração do compilador TypeScript. |
| `tailwind.config.js` | Configuração do Tailwind CSS (temas, cores). |
| `eslint.config.js` | Regras de linting (formatação de código). |

## 2. Frontend (`src/`)

### 2.1 Componentes e Páginas
- **`src/App.tsx`**: Ponto de entrada da aplicação. Define as rotas e providers globais.
- **`src/main.tsx`**: Renderiza o componente `App` no DOM.
- **`src/pages/`**: Contém as telas da aplicação.
    - `auth/`: Login, Registro, Recuperação de Senha.
    - `dashboard/`: Telas de visão geral e indicadores.
    - `activities/`: Listagem e edição de atividades.
    - `documents/`: Gestão de documentos e ofícios.
    - `admin/`: Gestão de usuários e configurações (apenas admins).
- **`src/components/`**: Componentes reutilizáveis.
    - `ui/`: Componentes base (Botões, Modais, Cards) que seguem o design system.
    - `Layout.tsx`: Estrutura principal com Sidebar e Header.

### 2.2 Lógica e Estado
- **`src/contexts/`**: Estado global da aplicação.
    - `AuthContext.tsx`: Gerencia o usuário logado e suas permissões.
    - `SettingsContext.tsx`: Preferências do usuário.
- **`src/lib/`**: Código utilitário e configurações.
    - `supabase.ts`: Inicializa a conexão com o Supabase.
    - `types.ts`: Define as interfaces TypeScript para o banco de dados.
    - `utils.ts`: Funções auxiliares (formatação de data, classes CSS).

### 2.3 Estilos e Assets
- **`src/styles/`**: Arquivos CSS globais.
- **`src/assets/`**: Imagens e ícones estáticos importados pelo código.

## 3. Backend e Banco de Dados (`supabase/`)

O backend é "serverless", gerenciado pelo Supabase, mas as definições ficam aqui.

- **`supabase/migrations/`**: Contém os scripts SQL aplicados ao banco de dados.
    - Cada arquivo começa com um timestamp (e.g., `20240101000000_initial_schema.sql`).
    - Define tabelas (`CREATE TABLE`), funções e políticas de segurança (`CREATE POLICY`).
- **`supabase/config.toml`**: Configurações do projeto Supabase local (se usado).
- **`supabase/seed.sql`**: Dados iniciais para popular o banco em desenvolvimento (opcional).

## 4. Fluxo de Desenvolvimento Típico

1. **Alterar Banco de Dados**:
   - Crie um novo arquivo em `supabase/migrations`.
   - Aplique com `supabase db push`.
   - Atualize `src/lib/types.ts` para refletir as mudanças.

2. **Criar Nova Tela**:
   - Crie o componente em `src/pages/NovaTela.tsx`.
   - Adicione a rota em `src/App.tsx`.
   - Se precisar de dados, use o cliente `supabase` em `src/lib/supabase.ts`.

3. **Estilizar**:
   - Use classes do Tailwind CSS diretamente no JSX (e.g., `className="p-4 bg-blue-500"`).
   - Para componentes complexos, extraia para `src/components/ui`.
