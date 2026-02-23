# 04. Frontend (React + Vite)

## Estrutura de Pastas

A aplicação React segue uma estrutura organizada por funcionalidades e domínios.

```
src/
├── assets/          # Ícones, imagens estáticas (logo, etc.)
├── components/      # Componentes compartilhados
│   ├── ui/          # Componentes de interface genéricos (Button, Card, Input)
│   └── Layout.tsx   # Layout principal (Sidebar, Header)
├── contexts/        # Gerenciamento de estado global
│   ├── AuthContext.tsx      # Usuário, login, logout, perfil
│   ├── SettingsContext.tsx  # Preferências de tema e configurações
│   └── ThemeContext.tsx     # Controle de tema (Light/Dark)
├── hooks/           # Custom Hooks (se houver)
├── lib/             # Lógica "Business-agnostic" e configurações
│   ├── supabase.ts  # Inicialização do cliente Supabase
│   ├── types.ts     # Definições de tipos TypeScript (Interfaces DB)
│   └── utils.ts     # Funções utilitárias (formatadores, classes)
├── pages/           # Views/Páginas da aplicação
│   ├── activities/  # Páginas do módulo de atividades
│   ├── admin/       # Páginas administrativas (Usuários, Municípios)
│   ├── auth/        # Login, Recuperação de senha, Convite
│   ├── dashboard/   # Dashboard principal e consolidado
│   └── documents/   # Páginas do módulo de documentos
├── styles/          # CSS global (Tailwind imports)
└── App.tsx          # Configuração de rotas e providers
```

## Roteamento (`App.tsx`)

Utilizamos `react-router-dom` v6 com rotas protegidas.

- **`PublicRoute`**: Acessível apenas se *não* autenticado (Login).
- **`ProtectedRoute`**: Requer autenticação. Redireciona para login se não logado.
- **`AdminRoute`**: Requer autenticação E roles específicas (e.g., `superadmin`, `admin_municipal`).

### Principais Rotas
- `/login`: Tela de entrada.
- `/dashboard`: Visão geral do município/província.
- `/activities`: Listagem de atividades.
    - `/activities/new`: Formulário de criação.
- `/documents`: Listagem de documentos.
- `/users`, `/municipios`: Gestão administrativa (Superadmin).

## Estilização (Tailwind CSS)

O projeto utiliza **Tailwind CSS** para estilização rápida e consistente.
- **Tema**: Configurado em `tailwind.config.js`. Suporte a Dark Mode.
- **Classes Utilitárias**: Uso extensivo de classes como `flex`, `p-4`, `bg-white`, `rounded-lg`.
- **Componentes UI**: Componentes base em `src/components/ui` encapsulam estilos comuns para manter a consistência (e.g., botões primários/secundários).

## Integração com Supabase

A comunicação com o backend é feita através do cliente Supabase instanciado em `src/lib/supabase.ts`.

### Exemplo de Fetch (Hook ou Componente)
```typescript
const { data, error } = await supabase
  .from('activities')
  .select('*')
  .eq('municipio_id', userMunicipioId);
```
As consultas são protegidas automaticamente pelas políticas RLS no banco, garantindo que o usuário só receba dados permitidos.

## Gerenciamento de Estado

- **AuthContext**: Mantém o objeto `user` e `profile` (com role e municipio_id) acessível em toda a app.
- **React Query** (Opcional/Recomendado): Para cache e estado de servidor (se implementado, verificar `package.json`). Caso contrário, usa-se `useEffect` e `useState` locais.
