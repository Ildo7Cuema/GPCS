/**
 * Seed Superadmin Script
 * 
 * This script creates the superadmin user using Supabase Admin API.
 * Run this script with: npx tsx scripts/seed-superadmin.ts
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
    console.error('\nPlease add SUPABASE_SERVICE_ROLE_KEY to your .env file.')
    console.error('You can find it in: Supabase Dashboard > Settings > API > service_role key')
    process.exit(1)
}

// Create admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function seedSuperadmin() {
    const email = 'ildocuema@gmail.com'
    const password = 'Ildo7..Marques'
    const fullName = 'Ildo Cuema (Superadmin)'

    console.log('🚀 Creating Superadmin user...\n')

    try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existingUsers?.users?.find(u => u.email === email)

        let userId: string

        if (existingUser) {
            console.log('ℹ️  User already exists, updating profile...')
            userId = existingUser.id
        } else {
            // Create the user in Supabase Auth
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto-confirm email
                user_metadata: {
                    full_name: fullName
                }
            })

            if (authError) {
                throw new Error(`Failed to create auth user: ${authError.message}`)
            }

            if (!authData?.user) {
                throw new Error('No user returned from createUser')
            }

            userId = authData.user.id
            console.log('✅ Auth user created successfully!')
        }

        // Create or update the profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: userId,
                full_name: fullName,
                role: 'superadmin',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, {
                onConflict: 'id'
            })

        if (profileError) {
            throw new Error(`Failed to create profile: ${profileError.message}`)
        }

        console.log('✅ Profile created/updated with superadmin role!')

        console.log('\n' + '='.repeat(50))
        console.log('🎉 SUPERADMIN CREATED SUCCESSFULLY!')
        console.log('='.repeat(50))
        console.log(`\n📧 Email: ${email}`)
        console.log(`🔑 Password: ${password}`)
        console.log(`👤 Role: superadmin`)
        console.log('\nYou can now login at: http://localhost:5174/login')
        console.log('='.repeat(50) + '\n')

    } catch (error) {
        console.error('❌ Error creating superadmin:', error)
        process.exit(1)
    }
}

seedSuperadmin()
