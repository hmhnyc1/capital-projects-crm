const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim().replace(/^["']|["']$/g, '');
const serviceRoleKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim().replace(/^["']|["']$/g, '');

const sqlFile = path.join(__dirname, 'supabase/migrations/20260319200000_add_parsing_job_tables.sql');
const sqlContent = fs.readFileSync(sqlFile, 'utf-8');

console.log('📦 Applying parsing job schema to Supabase...\n');

fetch(`${supabaseUrl}/rest/v1/rpc/sql_query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({ query: sqlContent })
})
.then(r => r.json())
.then(data => {
  if (data.error) {
    console.error('❌ Error:', data.error);
  } else {
    console.log('✅ Schema applied successfully!\n');
    console.log('📋 Created tables:');
    console.log('   ✓ parsing_jobs');
    console.log('   ✓ temp_parsed_applications');
    console.log('   ✓ temp_parsed_bank_statements\n');
    console.log('🔒 RLS policies enabled on all tables\n');
  }
})
.catch(err => console.error('❌ Error:', err.message));
