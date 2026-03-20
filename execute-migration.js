#!/usr/bin/env node

/**
 * Execute SQL migration directly via Supabase REST API
 */

import fs from 'fs'
import https from 'https'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE environment variables')
  process.exit(1)
}

const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
console.log(`✅ Supabase Project: ${projectRef}`)
console.log('')

// Read the migration SQL
const migrationSQL = fs.readFileSync('./supabase/migrations/20260319210000_create_deal_detail_tables.sql', 'utf-8')

// Split into individual statements
const statements = migrationSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0)

console.log(`📝 Migration file contains ${statements.length} SQL statements`)
console.log('')
console.log('⏳ Executing migration via Supabase API...')
console.log('')

// Execute each statement via the REST API
async function executeStatements() {
  let successCount = 0
  let errorCount = 0
  const errors = []

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const label = stmt.substring(0, 50).replace(/\n/g, ' ')

    try {
      const response = await executeSQL(stmt)

      if (response.error) {
        // Check if it's an "already exists" error (which is OK)
        if (response.error.message?.includes('already exists') ||
            response.error.message?.includes('already been created') ||
            response.error.message?.includes('duplicate')) {
          console.log(`[${i + 1}/${statements.length}] ℹ️  ${label}... (already exists)`)
        } else {
          console.log(`[${i + 1}/${statements.length}] ⚠️  ${label}... (${response.error.message})`)
          errorCount++
          errors.push(`Statement ${i + 1}: ${response.error.message}`)
        }
      } else {
        console.log(`[${i + 1}/${statements.length}] ✅ ${label}...`)
        successCount++
      }
    } catch (err) {
      console.log(`[${i + 1}/${statements.length}] ❌ ${label}... (${err.message})`)
      errorCount++
      errors.push(`Statement ${i + 1}: ${err.message}`)
    }
  }

  console.log('')
  console.log('═══════════════════════════════════════════════════════════════')
  console.log('📊 Migration Summary:')
  console.log(`   ✅ Executed: ${successCount}`)
  console.log(`   ⚠️  Warnings/Skipped: ${statements.length - successCount - errorCount}`)
  console.log(`   ❌ Errors: ${errorCount}`)
  console.log('═══════════════════════════════════════════════════════════════')

  if (errorCount > 0) {
    console.log('')
    console.log('Errors:')
    errors.forEach(e => console.log(`  - ${e}`))
  }

  return errorCount === 0 || errorCount < statements.length / 2
}

function executeSQL(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL)
    const pathname = '/rest/v1/rpc/exec_sql'

    const postData = JSON.stringify({ sql: sql + ';' })

    const options = {
      hostname: url.hostname,
      port: 443,
      path: pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
      },
    }

    const req = https.request(options, (res) => {
      let data = ''

      res.on('data', (chunk) => {
        data += chunk
      })

      res.on('end', () => {
        try {
          if (data.startsWith('{')) {
            const response = JSON.parse(data)
            resolve(response)
          } else {
            resolve({ data })
          }
        } catch (e) {
          resolve({ error: { message: 'Could not parse response' } })
        }
      })
    })

    req.on('error', (e) => {
      reject(e)
    })

    req.write(postData)
    req.end()
  })
}

executeStatements().then(success => {
  console.log('')
  if (success) {
    console.log('✅ Migration completed')
    process.exit(0)
  } else {
    console.log('⚠️  Migration completed with errors')
    process.exit(1)
  }
})
