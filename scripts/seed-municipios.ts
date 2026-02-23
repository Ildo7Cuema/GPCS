/**
 * Seed Municipios Script
 * 
 * This script populates the municipios table with data for all Angolan provinces.
 * Run this script with: npx tsx scripts/seed-municipios.ts
 * 
 * Requirements:
 * - SUPABASE_SERVICE_ROLE_KEY environment variable must be set
 * - VITE_SUPABASE_URL must be set in .env
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables:')
    if (!supabaseUrl) console.error('   - VITE_SUPABASE_URL')
    if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

const MUNICIPALITIES: Record<string, string[]> = {
    'Bengo': [
        'Ambriz',
        'Bula Atumba',
        'Dande',
        'Dembos',
        'Nambuangongo',
        'Pango Aluquém'
    ],
    'Benguela': [
        'Balombo',
        'Baía Farta',
        'Benguela',
        'Bocoio',
        'Caimbambo',
        'Catumbela',
        'Chongorói',
        'Cubal',
        'Ganda',
        'Lobito'
    ],
    'Bié': [
        'Andulo',
        'Camacupa',
        'Catabola',
        'Chinguar',
        'Chitembo',
        'Cuemba',
        'Cunhinga',
        'Cuíto',
        'N\'harea'
    ],
    'Cabinda': [
        'Belize',
        'Buco-Zau',
        'Cabinda',
        'Cacongo'
    ],
    'Cuando Cubango': [
        'Calai',
        'Cuangar',
        'Cuchi',
        'Cuito Cuanavale',
        'Dirico',
        'Mavinga',
        'Menongue',
        'Nancova',
        'Rivungo'
    ],
    'Cuanza Norte': [
        'Ambaca',
        'Banga',
        'Bolongongo',
        'Cambambe',
        'Cazengo',
        'Golungo Alto',
        'Gonguembo',
        'Lucala',
        'Quiculungo',
        'Samba Cajú'
    ],
    'Cuanza Sul': [
        'Amboim',
        'Cassongue',
        'Cela',
        'Conda',
        'Ebo',
        'Libolo',
        'Mussende',
        'Quibala',
        'Quilenda',
        'Seles',
        'Sumbe'
    ],
    'Cunene': [
        'Cahama',
        'Cuanhama',
        'Curoca',
        'Cuvelai',
        'Namacunde',
        'Ombadja'
    ],
    'Huambo': [
        'Bailundo',
        'Caála',
        'Ekunha',
        'Huambo',
        'Londuimbale',
        'Longonjo',
        'Mungo',
        'Tchicala-Tcholoanga',
        'Tchindjenje',
        'Ucuma',
        'Katchiungo'
    ],
    'Huíla': [
        'Caconda',
        'Caluquembe',
        'Chiange',
        'Chibia',
        'Chicomba',
        'Chipindo',
        'Gambos',
        'Humpata',
        'Jamba',
        'Kuvango',
        'Lubango',
        'Matala',
        'Quilengues',
        'Quipungo'
    ],
    'Luanda': [
        'Belas',
        'Cacuaco',
        'Cazenga',
        'Icolo e Bengo',
        'Luanda',
        'Kilamba Kiaxi',
        'Quiçama',
        'Talatona',
        'Viana'
    ],
    'Lunda Norte': [
        'Cambulo',
        'Capenda Camulemba',
        'Caungula',
        'Chitato',
        'Cuango',
        'Dundo',
        'Lubalo',
        'Lucapa',
        'Xá-Muteba'
    ],
    'Lunda Sul': [
        'Cacolo',
        'Dala',
        'Muconda',
        'Saurimo'
    ],
    'Malanje': [
        'Cacuso',
        'Calandula',
        'Cambundi-Catembo',
        'Cangandala',
        'Caombo',
        'Cuaba Nzogo',
        'Cunda-Dia-Baze',
        'Luquembo',
        'Malanje',
        'Marimba',
        'Massango',
        'Mucari',
        'Quela',
        'Quirima'
    ],
    'Moxico': [
        'Alto Zambeze',
        'Bundas',
        'Camanongue',
        'Cameia',
        'Luacano',
        'Luau',
        'Luchazes',
        'Luena',
        'Moxico'
    ],
    'Namibe': [
        'Bibala',
        'Camucuio',
        'Moçâmedes',
        'Tômbua',
        'Virei'
    ],
    'Uíge': [
        'Alto Cauale',
        'Ambuíla',
        'Bembe',
        'Buengas',
        'Bungo',
        'Damba',
        'Macocola',
        'Milunga',
        'Mucaba',
        'Negage',
        'Puri',
        'Quimbele',
        'Quitexe',
        'Sanza Pombo',
        'Songo',
        'Uíge'
    ],
    'Zaire': [
        'Cuimba',
        'M\'Banza Congo',
        'Nóqui',
        'Nzeto',
        'Soio',
        'Tomboco'
    ]
}

async function seedMunicipios() {
    console.log('🚀 Seeding municipalities...\n')

    let totalCreated = 0
    let totalSkipped = 0
    let totalErrors = 0

    for (const [province, municipios] of Object.entries(MUNICIPALITIES)) {
        console.log(`Processing ${province}...`)

        for (const name of municipios) {
            try {
                // Check if already exists
                const { data: existing } = await supabase
                    .from('municipios')
                    .select('id')
                    .eq('name', name)
                    .eq('province', province)
                    .single()

                if (existing) {
                    totalSkipped++
                    continue
                }

                // Create
                const { error } = await supabase
                    .from('municipios')
                    .insert({
                        name,
                        province
                    })

                if (error) {
                    console.error(`❌ Error creating ${name} (${province}):`, error.message)
                    totalErrors++
                } else {
                    process.stdout.write('.')
                    totalCreated++
                }

            } catch (err) {
                console.error(`❌ Unexpected error for ${name}:`, err)
                totalErrors++
            }
        }
        console.log(' Done')
    }

    console.log('\n' + '='.repeat(50))
    console.log('🎉 SEEDING COMPLETED!')
    console.log('='.repeat(50))
    console.log(`✅ Created: ${totalCreated}`)
    console.log(`⏭️  Skipped: ${totalSkipped}`)
    console.log(`❌ Errors:  ${totalErrors}`)
    console.log('='.repeat(50) + '\n')
}

seedMunicipios()
