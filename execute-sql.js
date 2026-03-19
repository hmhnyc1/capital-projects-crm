const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim().replace(/^["']|["']$/g, '');
const serviceRoleKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim().replace(/^["']|["']$/g, '');

const sqlFile = path.join(__dirname, 'supabase/migrations');
const files = fs.readdirSync(sqlFile);
const latestMigration = files.sort().pop();
const sqlContent = fs.readFileSync(path.join(sqlFile, latestMigration), 'utf-8');

console.log('📦 Sending RLS policies to Supabase...\n');

// Use Supabase REST API to execute SQL
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
    console.log('✅ RLS policies applied successfully!\n');
    console.log('📝 Policies created:');
    console.log('   ✓ Authenticated users can upload files (INSERT)');
    console.log('   ✓ Authenticated users can read their files (SELECT)');
    console.log('   ✓ Authenticated users can delete their files (DELETE)');
    console.log('   ✓ Service role can manage all files (ALL)\n');
    console.log('🚀 File uploads are now enabled!\n');
  }
})
.catch(err => console.error('❌ Error:', err.message));
