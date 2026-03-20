#!/usr/bin/env node

/**
 * Check if parsed data was stored in temp tables during deal creation
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function checkTempData() {
  try {
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('  Checking Temporary Parsed Data')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('')

    // Check temp_parsed_applications
    console.log('📦 Checking temp_parsed_applications...')
    const { data: tempApps, count: appCount, error: appError } = await supabase
      .from('temp_parsed_applications')
      .select('*', { count: 'exact' })

    if (appError) {
      console.log(`   ⚠️  Error: ${appError.message}`)
      console.log(`   (Table might not exist yet)`)
    } else {
      console.log(`   Records: ${appCount}`)
      if (tempApps && tempApps.length > 0) {
        tempApps.forEach((a, i) => {
          const appData = a.application_data || {}
          const stmtCount = Array.isArray(a.bank_statements_data) ? a.bank_statements_data.length : 0
          console.log(`   [${i + 1}] ${appData.business_legal_name} - Statements: ${stmtCount}`)
        })
      } else {
        console.log('   ℹ️  No records (data may have been cleaned up after deal creation)')
      }
    }
    console.log('')

    // Check deal_activities to see if any deal creation activities were logged
    console.log('📋 Checking deal_activities for Body Sense deal...')
    const { data: deal } = await supabase
      .from('deals')
      .select('id')
      .eq('deal_number', 'DEAL-MMY48WY3-XXTF')
      .single()

    if (deal) {
      const { data: activities, count: actCount } = await supabase
        .from('deal_activities')
        .select('*', { count: 'exact' })
        .eq('deal_id', deal.id)

      console.log(`   Records: ${actCount}`)
      if (activities && activities.length > 0) {
        activities.forEach((a, i) => {
          console.log(`   [${i + 1}] ${a.action_type} - ${a.action_title}`)
        })
      } else {
        console.log('   ❌ No activity logged for this deal')
      }
    }
    console.log('')

    // Check the deal object itself for summary data
    console.log('📊 Checking deal object for summary data...')
    const { data: dealFull } = await supabase
      .from('deals')
      .select('*')
      .eq('deal_number', 'DEAL-MMY48WY3-XXTF')
      .single()

    if (dealFull) {
      console.log(`   Total months analyzed: ${dealFull.total_months_analyzed}`)
      console.log(`   Avg monthly revenue: $${dealFull.average_monthly_true_revenue}`)
      console.log(`   Risk score: ${dealFull.risk_score}`)
      console.log(`   Risk grade: ${dealFull.risk_grade}`)
      console.log(`   Executive summary: ${dealFull.executive_summary?.substring(0, 100)}...`)

      if (!dealFull.total_months_analyzed) {
        console.log('')
        console.log('   ❌ No summary data - statements were not parsed/analyzed')
      } else {
        console.log('')
        console.log(`   ✅ Summary data present - ${dealFull.total_months_analyzed} months analyzed`)
      }
    }

    console.log('')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('  Analysis:')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('')
    console.log('The issue is that stages 3-5 (saveBankStatements, saveMCAPositions,')
    console.log('saveRiskAssessment) are NOT inserting data into the detail tables.')
    console.log('')
    console.log('Likely causes:')
    console.log('')
    console.log('1. ❌ No bank statements were actually parsed')
    console.log('   → saveBankStatements() loops through statements array')
    console.log('   → If statements.length === 0, nothing gets inserted')
    console.log('')
    console.log('2. ⚠️  Silent failures in insert statements')
    console.log('   → saveBankStatements line 279-312 doesn\'t rethrow errors')
    console.log('   → saveMCAPositions line 348-367 doesn\'t rethrow errors')
    console.log('   → saveRiskAssessment line 463-478 doesn\'t rethrow errors')
    console.log('')
    console.log('3. 🔐 RLS policy violation')
    console.log('   → The service role creates deal with one user_id')
    console.log('   → But RLS policies check auth.uid() at query time')
    console.log('   → Server action runs WITHOUT user context')
    console.log('')
    console.log('FIX: Modify the three functions to:')
    console.log('   a) Check if statements.length > 0 before inserting')
    console.log('   b) Throw errors instead of silently logging them')
    console.log('   c) Or disable RLS for service role operations')
    console.log('')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

checkTempData()
