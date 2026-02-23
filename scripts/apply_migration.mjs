import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar definidos no .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function applyMigration() {
    console.log('🔄 Aplicando migração: fix_activity_logs_cascade...\n')

    const migrationSQL = `
-- Fix foreign key constraint on activity_logs to allow user deletion
-- Option: Set user_id to NULL when user is deleted (preserves audit trail)

-- Drop the existing foreign key constraint
alter table public.activity_logs 
  drop constraint if exists activity_logs_user_id_fkey;

-- Recreate the constraint with ON DELETE SET NULL
alter table public.activity_logs 
  add constraint activity_logs_user_id_fkey 
  foreign key (user_id) 
  references public.profiles(id) 
  on delete set null;

-- Make user_id nullable if it isn't already
alter table public.activity_logs 
  alter column user_id drop not null;
`

    try {
        // Execute the migration
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

        if (error) {
            // If exec_sql doesn't exist, try direct execution (this won't work with service role, but let's try)
            console.log('⚠️  Função exec_sql não disponível. Tentando método alternativo...\n')
            console.log('📋 SQL da migração:')
            console.log('─'.repeat(60))
            console.log(migrationSQL)
            console.log('─'.repeat(60))
            console.log('\n⚠️  Por favor, execute este SQL manualmente no Supabase Dashboard:')
            console.log('   1. Aceda a: https://supabase.com/dashboard/project/cqwqtnwdmbglmsfenfxy/editor')
            console.log('   2. Copie e cole o SQL acima')
            console.log('   3. Execute a query\n')
            process.exit(1)
        }

        console.log('✅ Migração aplicada com sucesso!')
        console.log('\n📊 Verificando a restrição...')

        // Verify the constraint
        const { data: constraintData, error: constraintError } = await supabase
            .from('pg_constraint')
            .select('conname, confdeltype')
            .eq('conname', 'activity_logs_user_id_fkey')
            .single()

        if (constraintError) {
            console.log('⚠️  Não foi possível verificar a restrição automaticamente')
        } else {
            console.log('✅ Restrição verificada:', constraintData)
        }

    } catch (err) {
        console.error('❌ Erro ao aplicar migração:', err)
        console.log('\n📋 SQL da migração:')
        console.log('─'.repeat(60))
        console.log(migrationSQL)
        console.log('─'.repeat(60))
        console.log('\n⚠️  Por favor, execute este SQL manualmente no Supabase Dashboard:')
        console.log('   1. Aceda a: https://supabase.com/dashboard/project/cqwqtnwdmbglmsfenfxy/editor')
        console.log('   2. Copie e cole o SQL acima')
        console.log('   3. Execute a query\n')
        process.exit(1)
    }
}

applyMigration()
