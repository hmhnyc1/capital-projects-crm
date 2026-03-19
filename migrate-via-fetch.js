#!/usr/bin/env node

/**
 * Apply migration via Supabase REST API
 * Uses fetch to POST migration SQL to a helper endpoint
 */

import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('═══════════════════════════════════════════════════════════════')
console.log('  Supabase Database Migration - Detail Tables')
console.log('═══════════════════════════════════════════════════════════════')
console.log('')

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing SUPABASE environment variables')
  process.exit(1)
}

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
console.log(`✅ Project: ${projectRef}`)
console.log('')

async function applyMigration() {
  try {
    console.log('📝 Reading migration SQL...')
    const migrationSql = fs.readFileSync(
      './supabase/migrations/20260319210000_create_deal_detail_tables.sql',
      'utf-8'
    )

    // We'll use the approach of creating a temporary auth token and
    // making a call to execute the SQL via an internal endpoint or
    // create a function on the fly

    console.log('🔐 Using service role authentication...')
    console.log('📍 Endpoint: ' + SUPABASE_URL + '/rest/v1/rpc/exec_sql')
    console.log('')

    // Try to call exec_sql RPC if it exists
    console.log('⏳ Attempting to execute migration...')

    // Split migration into individual statements for better error handling
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    console.log(`📋 Total statements: ${statements.length}`)
    console.log('')

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i]
      const label = stmt.substring(0, 40).replace(/\n/g, ' ')

      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({ sql: stmt + ';' }),
          }
        )

        if (response.ok) {
          console.log(`[${i + 1}/${statements.length}] ✅ ${label}...`)
          successCount++
        } else {
          const error = await response.json()
          if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
            console.log(`[${i + 1}/${statements.length}] ℹ️  ${label}... (skipped - may already exist)`)
          } else {
            console.log(`[${i + 1}/${statements.length}] ⚠️  ${label}... (error: ${error.message})`)
            failCount++
          }
        }
      } catch (err) {
        if (i === 0) {
          // First call failed - exec_sql RPC doesn't exist
          console.log('⚠️  exec_sql RPC endpoint not available')
          console.log('📌 Trying alternative approach...')
          console.log('')
          throw new Error('NEEDS_MANUAL_SETUP')
        }
        console.log(`[${i + 1}/${statements.length}] ❌ ${label}... (error: ${err.message})`)
        failCount++
      }
    }

    console.log('')
    console.log('═══════════════════════════════════════════════════════════════')
    if (successCount > 0) {
      console.log('✅ Migration execution summary:')
      console.log(`   ✓ Successful: ${successCount}`)
      console.log(`   ⚠️  Warnings: ${failCount}`)
      console.log('')
      console.log('Migrations may have partially applied. Verify in dashboard.')
    } else {
      console.log('⚠️  Could not execute via API')
    }
    console.log('═══════════════════════════════════════════════════════════════')

  } catch (error) {
    if (error.message === 'NEEDS_MANUAL_SETUP') {
      console.log('📋 MANUAL SETUP REQUIRED')
      console.log('')
      console.log('The Supabase SQL RPC endpoint is not available.')
      console.log('Please apply the migration manually:')
      console.log('')
      console.log('Steps:')
      console.log('1️⃣  Go to: https://supabase.com/dashboard')
      console.log('2️⃣  Select project: nxzrtryfiqtgmznvbtbd')
      console.log('3️⃣  Click: SQL Editor (left sidebar)')
      console.log('4️⃣  Click: New query')
      console.log('5️⃣  Copy contents of:')
      console.log('      supabase/migrations/20260319210000_create_deal_detail_tables.sql')
      console.log('6️⃣  Paste into the SQL editor')
      console.log('7️⃣  Click: Run')
      console.log('')
      console.log('⏱️  This takes < 1 minute')
      process.exit(1)
    }

    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

applyMigration()
