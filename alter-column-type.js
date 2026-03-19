const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim().replace(/^["']|["']$/g, '');
const serviceRoleKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim().replace(/^["']|["']$/g, '');

const sql = `ALTER TABLE contacts ALTER COLUMN time_in_business_years TYPE numeric(10,2);`;

console.log('📦 Altering contacts.time_in_business_years column type...\n');

fetch(`${supabaseUrl}/rest/v1/rpc/sql_query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({ query: sql })
})
.then(r => r.json())
.then(data => {
  if (data.error) {
    console.error('❌ Error:', data.error);
  } else {
    console.log('✅ Column type changed successfully!\n');
    console.log('📝 Changes:');
    console.log('   ✓ time_in_business_years: integer → numeric(10,2)\n');
    console.log('✅ Database now accepts decimal values like 20.42\n');
  }
})
.catch(err => console.error('❌ Error:', err.message));
