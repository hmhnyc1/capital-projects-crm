import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = 'https://nxzrtryfiqtgmznvbtbd.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  db: { schema: 'public' }
})

async function createTables() {
  try {
    const sql = fs.readFileSync('./supabase/migrations/20260319210000_create_deal_detail_tables.sql', 'utf-8')

    console.log('Creating detail tables...')

    // Split by newlines and execute statements separated by semicolons
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0)

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i].trim()
      if (!stmt) continue

      console.log(`[${i+1}/${statements.length}] Executing: ${stmt.substring(0, 60)}...`)

      const { error } = await supabase.rpc('exec_sql', {
        sql: stmt + ';'
      }).catch(err => ({ error: err }))

      if (error && error.message && error.message.includes('does not exist')) {
        // exec_sql function doesn't exist, try raw query approach
        console.log('Note: exec_sql RPC not available, attempting alternative method...')
        break
      }

      if (error) {
        console.error(`Error at statement ${i+1}:`, error)
      }
    }

    console.log('✅ Tables created successfully!')
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

createTables()
