#!/usr/bin/env node

/**
 * Check if Body Sense Day Spa deal has data in detail tables
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE environment variables')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function checkDealData() {
  try {
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('  Checking Body Sense Day Spa Deal Data')
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('')

    // Find the deal by deal_number
    console.log('🔍 Finding deal: Body Sense Day Spa (DEAL-MMY48WY3-XXTF)...')
    const { data: deals, error: dealError } = await supabase
      .from('deals')
      .select('id, deal_number, title, merchant_id, created_at')
      .eq('deal_number', 'DEAL-MMY48WY3-XXTF')
      .single()

    if (dealError || !deals) {
      console.error('❌ Deal not found:', dealError?.message)
      process.exit(1)
    }

    console.log('✅ Found deal:')
    console.log(`   ID: ${deals.id}`)
    console.log(`   Title: ${deals.title}`)
    console.log(`   Deal Number: ${deals.deal_number}`)
    console.log(`   Merchant ID: ${deals.merchant_id}`)
    console.log(`   Created: ${deals.created_at}`)
    console.log('')

    const dealId = deals.id

    // Check bank_statements_detailed
    console.log('📊 Checking bank_statements_detailed...')
    const { data: statements, count: stmtCount } = await supabase
      .from('bank_statements_detailed')
      .select('*', { count: 'exact' })
      .eq('deal_id', dealId)

    console.log(`   Records: ${stmtCount}`)
    if (statements && statements.length > 0) {
      statements.forEach((s, i) => {
        console.log(`   [${i + 1}] ${s.statement_month}/${s.statement_year} - Revenue: $${s.true_revenue}`)
      })
    } else {
      console.log('   ❌ No data found')
    }
    console.log('')

    // Check mca_positions_detailed
    console.log('💳 Checking mca_positions_detailed...')
    const { data: mca, count: mcaCount } = await supabase
      .from('mca_positions_detailed')
      .select('*', { count: 'exact' })
      .eq('deal_id', dealId)

    console.log(`   Records: ${mcaCount}`)
    if (mca && mca.length > 0) {
      mca.forEach((m, i) => {
        console.log(`   [${i + 1}] ${m.funder_name} - Daily: $${m.daily_debit_amount}`)
      })
    } else {
      console.log('   ❌ No data found')
    }
    console.log('')

    // Check underwriting_scorecards_detailed
    console.log('📈 Checking underwriting_scorecards_detailed...')
    const { data: scorecard, count: scoreCount } = await supabase
      .from('underwriting_scorecards_detailed')
      .select('*', { count: 'exact' })
      .eq('deal_id', dealId)

    console.log(`   Records: ${scoreCount}`)
    if (scorecard && scorecard.length > 0) {
      scorecard.forEach((s, i) => {
        console.log(`   [${i + 1}] Score: ${s.overall_score}/100 - Grade: ${s.risk_grade}`)
      })
    } else {
      console.log('   ❌ No data found')
    }
    console.log('')

    // Check risk_flags_detailed
    console.log('🚩 Checking risk_flags_detailed...')
    const { data: flags, count: flagCount } = await supabase
      .from('risk_flags_detailed')
      .select('*', { count: 'exact' })
      .eq('deal_id', dealId)

    console.log(`   Records: ${flagCount}`)
    if (flags && flags.length > 0) {
      flags.forEach((f, i) => {
        console.log(`   [${i + 1}] [${f.severity}] ${f.description}`)
      })
    } else {
      console.log('   ❌ No data found')
    }
    console.log('')

    // Check documents_detailed
    console.log('📄 Checking documents_detailed...')
    const { data: docs, count: docCount } = await supabase
      .from('documents_detailed')
      .select('*', { count: 'exact' })
      .eq('deal_id', dealId)

    console.log(`   Records: ${docCount}`)
    if (docs && docs.length > 0) {
      docs.forEach((d, i) => {
        console.log(`   [${i + 1}] ${d.file_name} (${d.document_type})`)
      })
    } else {
      console.log('   ❌ No data found')
    }
    console.log('')

    // Summary
    console.log('═══════════════════════════════════════════════════════════════')
    const totalData = (stmtCount || 0) + (mcaCount || 0) + (scoreCount || 0) + (flagCount || 0) + (docCount || 0)
    if (totalData === 0) {
      console.log('❌ NO DATA IN DETAIL TABLES')
      console.log('')
      console.log('This means the parsed data is NOT being saved to the detail tables.')
      console.log('Likely causes:')
      console.log('  1. The saveBankStatements() function is not executing')
      console.log('  2. The saveMCAPositions() function is not executing')
      console.log('  3. The saveRiskAssessment() function is not executing')
      console.log('  4. The saveDocumentsAndActivity() function is not executing')
      console.log('')
      console.log('Check create-deal-comprehensive.ts for errors in these stages.')
    } else {
      console.log(`✅ Found ${totalData} total records across detail tables`)
    }
    console.log('═══════════════════════════════════════════════════════════════')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

checkDealData()
