import pg from 'pg'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const { Pool } = pg

// Supabase PostgreSQL connection string format:
// postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

// Extract from SUPABASE_URL and SERVICE_ROLE_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

// Extract project ref from Supabase URL
// https://nxzrtryfiqtgmznvbtbd.supabase.co → nxzrtryfiqtgmznvbtbd
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
if (!projectRef) {
  console.error('❌ Could not extract project ref from Supabase URL')
  process.exit(1)
}

// Decode service role key to get the password (it's a JWT)
// For Supabase, we need to use the postgres password which is typically managed separately
// Instead, we'll try to connect using the DATABASE_URL or construct it manually

// The standard Supabase connection string pattern:
// postgres://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

// Since we don't have the password, we'll try to extract it from environment
// Or use the Supabase-provided connection string

console.log('⏳ Attempting to connect to Supabase PostgreSQL...')
console.log(`   Project: ${projectRef}`)
console.log('')

// Try different connection approaches
const connectionString = process.env.DATABASE_URL ||
  `postgres://postgres:${process.env.SUPABASE_DB_PASSWORD || ''}@${projectRef}.supabase.co:5432/postgres`

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
})

async function setupTables() {
  const client = await pool.connect()

  try {
    console.log('✅ Connected to PostgreSQL')
    console.log('')

    const sql = fs.readFileSync('./supabase/migrations/20260319210000_create_deal_detail_tables.sql', 'utf-8')

    console.log('📝 Executing migration SQL...')
    await client.query(sql)

    console.log('✅ Migration completed successfully!')
    console.log('')
    console.log('Tables created:')
    console.log('  ✓ bank_statements_detailed')
    console.log('  ✓ mca_positions_detailed')
    console.log('  ✓ underwriting_scorecards_detailed')
    console.log('  ✓ risk_flags_detailed')
    console.log('  ✓ documents_detailed')

  } catch (error) {
    console.error('❌ Error executing migration:')
    console.error(error.message)
    console.error('')
    console.error('MANUAL SETUP REQUIRED:')
    console.error('1. Go to https://supabase.com/dashboard')
    console.error('2. Open project: ' + projectRef)
    console.error('3. Go to SQL Editor')
    console.error('4. Click "New query"')
    console.error('5. Copy and paste the contents of:')
    console.error('   supabase/migrations/20260319210000_create_deal_detail_tables.sql')
    console.error('6. Click "Run"')

    process.exit(1)
  } finally {
    await client.release()
    await pool.end()
  }
}

setupTables()
