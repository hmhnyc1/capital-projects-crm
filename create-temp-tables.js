const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim().replace(/^["']|["']$/g, '');
const serviceRoleKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim().replace(/^["']|["']$/g, '');

const sql = `
CREATE TABLE IF NOT EXISTS temp_parsed_applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id text UNIQUE NOT NULL,
  application_data jsonb,
  bank_statements_data jsonb,
  status text DEFAULT 'parsed',
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '24 hours')
);

ALTER TABLE temp_parsed_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own temp data" ON temp_parsed_applications FOR ALL USING (true);
`;

console.log('📦 Creating temp_parsed_applications table in Supabase...\n');

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
    console.log('✅ temp_parsed_applications table created successfully!\n');
    console.log('📋 Table details:');
    console.log('   ✓ id (uuid primary key)');
    console.log('   ✓ job_id (text, unique)');
    console.log('   ✓ application_data (jsonb)');
    console.log('   ✓ bank_statements_data (jsonb)');
    console.log('   ✓ status (text, default: parsed)');
    console.log('   ✓ created_at (timestamp)');
    console.log('   ✓ expires_at (timestamp, default: now + 24 hours)\n');
    console.log('🔒 RLS enabled with permissive policy\n');
    console.log('✅ Ready to save parsed data!\n');
  }
})
.catch(err => console.error('❌ Error:', err.message));
