import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function createTables() {
  try {
    const sql = readFileSync('./supabase/migrations/20260319210000_create_deal_detail_tables.sql', 'utf-8')

    console.log('Executing migration SQL...')
    const { error } = await supabase.rpc('exec_sql', { sql })

    if (error) {
      console.error('Error executing SQL:', error)
      process.exit(1)
    }

    console.log('✅ Tables created successfully!')
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

createTables()
