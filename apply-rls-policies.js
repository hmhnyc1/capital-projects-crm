const fs = require('fs');
const path = require('path');

// Read environment
const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim().replace(/^["']|["']$/g, '');
const serviceRoleKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim().replace(/^["']|["']$/g, '');

// Extract project reference from URL
const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const dbHost = `${projectRef}.supabase.co`;
const dbPort = '6543'; // Supabase uses port 6543 for direct connections

console.log('📦 Connecting to database...\n');

// Use pg with SSL
const { Client } = require('pg');

const client = new Client({
  host: dbHost,
  port: dbPort,
  database: 'postgres',
  user: 'postgres',
  password: serviceRoleKey,
  ssl: { rejectUnauthorized: false }
});

client.connect(async (err) => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
  
  try {
    console.log('✅ Connected to database\n');
    console.log('📋 Applying RLS policies...\n');
    
    // Drop existing policies
    await client.query(`DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects`);
    await client.query(`DROP POLICY IF EXISTS "Authenticated users can read their files" ON storage.objects`);
    await client.query(`DROP POLICY IF EXISTS "Authenticated users can delete their files" ON storage.objects`);
    await client.query(`DROP POLICY IF EXISTS "Service role can manage all files" ON storage.objects`);
    
    console.log('   ✓ Dropped existing policies');
    
    // Create policies
    await client.query(`
      CREATE POLICY "Authenticated users can upload files"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'documents')
    `);
    
    await client.query(`
      CREATE POLICY "Authenticated users can read their files"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (bucket_id = 'documents')
    `);
    
    await client.query(`
      CREATE POLICY "Authenticated users can delete their files"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (bucket_id = 'documents')
    `);
    
    await client.query(`
      CREATE POLICY "Service role can manage all files"
      ON storage.objects
      FOR ALL
      TO service_role
      USING (bucket_id = 'documents')
      WITH CHECK (bucket_id = 'documents')
    `);
    
    console.log('   ✓ Created "Authenticated users can upload files"');
    console.log('   ✓ Created "Authenticated users can read their files"');
    console.log('   ✓ Created "Authenticated users can delete their files"');
    console.log('   ✓ Created "Service role can manage all files"');
    
    console.log('\n✅ RLS policies applied successfully!\n');
    console.log('🚀 File uploads are now enabled on documents bucket!\n');
    
  } catch (err) {
    console.error('❌ Error applying policies:', err.message);
  } finally {
    client.end();
  }
});
