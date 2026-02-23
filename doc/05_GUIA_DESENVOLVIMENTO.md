# 05. Guia de Desenvolvimento

## Pré-requisitos
- **Node.js**: Versão 18+
- **npm**: Gerenciador de pacotes.
- **Conta Supabase**: Para backend e banco de dados.

## Configuração do Ambiente

1. **Clone o repositório**
   ```bash
   git clone <repo-url>
   cd gp-cs
   ```

2. **Instale as dependências**
   ```bash
   npm install
   ```

3. **Configuração de Variáveis de Ambiente**
   Crie um arquivo `.env` na raiz (baseado em `.env.example`) e adicione suas chaves do Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima
   ```

## Rodando o Projeto

### Desenvolvimento Local
Para iniciar o servidor de desenvolvimento com Hot Module Replacement (HMR):
```bash
npm run dev
```
Acesse `http://localhost:5173`.

### Build para Produção
Para gerar os arquivos estáticos otimizados na pasta `dist/`:
```bash
npm run build
```

### Preview de Produção
Para testar o build localmente:
```bash
npm run preview
```

## Banco de Dados e Migrações

As migrações SQL ficam na pasta `supabase/migrations`.
Para aplicar migrações (se estiver usando Supabase CLI):
```bash
supabase db push
```
Ou copie o conteúdo dos arquivos `.sql` e execute no painel SQL do Supabase Dashboard.

## Dicas de Desenvolvimento

- **Novos Componentes**: Crie em `src/components` se for reutilizável, ou dentro da pasta da página específica se for local.
- **Tipagem**: Mantenha `src/lib/types.ts` atualizado ao alterar o banco de dados. Você pode gerar tipos automaticamente com a CLI do Supabase.
- **Linting**: Execute `npm run lint` para verificar problemas de código.

## Deploy

O frontend pode ser implantado em qualquer hospedagem estática (Vercel, Netlify, Cloudflare Pages).
1. Configure o build command: `npm run build`.
2. Configure o output directory: `dist`.
3. Adicione as variáveis de ambiente (`VITE_SUPABASE_URL`, etc.) no painel da hospedagem.
