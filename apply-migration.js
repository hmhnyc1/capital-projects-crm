#!/usr/bin/env node

/**
 * Apply database migration via direct PostgreSQL connection to Supabase
 * Usage: node apply-migration.js
 */

import pg from 'pg'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const { Client } = pg

// Get connection details
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

console.log('═══════════════════════════════════════════════════════════════')
console.log('  Supabase Database Migration - Detail Tables')
console.log('═══════════════════════════════════════════════════════════════')
console.log('')

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Missing environment variables')
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Extract project ref from URL
const projectMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)
const projectRef = projectMatch?.[1]

if (!projectRef) {
  console.error('❌ Error: Could not extract project ref from Supabase URL')
  process.exit(1)
}

console.log(`✅ Supabase Project: ${projectRef}`)
console.log(`✅ Service Role Key: ${serviceRoleKey.substring(0, 20)}...`)
console.log('')

// Supabase PostgreSQL connection string format:
// postgres://postgres:[password]@[project].supabase.co:5432/postgres
// However, with service role key, we need to use the pooler endpoint:
// postgresql://postgres.[project]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

// Since we don't have the database password separately, we'll try multiple approaches
const connectionStrings = [
  // Direct connection (may fail with auth issues)
  `postgresql://postgres@${projectRef}.supabase.co:5432/postgres`,

  // Try pooler endpoint
  `postgresql://postgres@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,

  // From environment if available
  process.env.DATABASE_URL,
].filter(Boolean)

console.log('⏳ Attempting connection to PostgreSQL...')
console.log('')

async function runMigration() {
  let client = null

  for (const connectionString of connectionStrings) {
    if (!connectionString) continue

    try {
      console.log(`🔗 Trying connection string...`)
      client = new Client({
        connectionString,
        ssl: {
          rejectUnauthorized: false,
        },
      })

      await client.connect()
      console.log('✅ Connected to PostgreSQL!')
      console.log('')
      break
    } catch (err) {
      if (client) {
        await client.end()
        client = null
      }
      // Try next connection string
      continue
    }
  }

  if (!client) {
    console.error('❌ Failed to connect to PostgreSQL')
    console.error('')
    console.error('⚠️  Direct database connection requires:')
    console.error('   1. DATABASE_URL environment variable, OR')
    console.error('   2. Database password (not available from service role key)')
    console.error('')
    console.error('📋 Alternative: Apply migration manually')
    console.error('   1. Go to https://supabase.com/dashboard')
    console.error('   2. Select project: ' + projectRef)
    console.error('   3. SQL Editor → New query')
    console.error('   4. Paste contents of: supabase/migrations/20260319210000_create_deal_detail_tables.sql')
    console.error('   5. Click Run')
    process.exit(1)
  }

  try {
    console.log('📝 Reading migration file...')
    const migrationSql = fs.readFileSync(
      './supabase/migrations/20260319210000_create_deal_detail_tables.sql',
      'utf-8'
    )

    console.log('🚀 Executing migration...')
    console.log('')

    await client.query(migrationSql)

    console.log('')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('✅ ✅ ✅  MIGRATION COMPLETED SUCCESSFULLY  ✅ ✅ ✅')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('')
    console.log('📊 Tables created:')
    console.log('   ✓ bank_statements_detailed')
    console.log('   ✓ mca_positions_detailed')
    console.log('   ✓ underwriting_scorecards_detailed')
    console.log('   ✓ risk_flags_detailed')
    console.log('   ✓ documents_detailed')
    console.log('')
    console.log('🎯 Next steps:')
    console.log('   1. Deploy to production: git push && vercel --prod --yes')
    console.log('   2. Test deal detail page with existing deals')
    console.log('')

    process.exit(0)
  } catch (err) {
    console.error('❌ Error executing migration:')
    console.error(err.message)
    console.error('')
    process.exit(1)
  } finally {
    if (client) {
      await client.end()
    }
  }
}

runMigration()
