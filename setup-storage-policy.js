const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nxzrtryfiqtgmznvbtbd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54enJ0cnlmaXF0Z216bnZidGJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzk0MDg2OCwiZXhwIjoyMDg5NTE2ODY4fQ.-oxwRIvir0LblqK5_YhQ9nJj2JkPRfA7Ewt_U8L1ipA';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStoragePolicy() {
  try {
    console.log('📦 Setting up Supabase Storage policies...\n');

    const BUCKET_NAME = 'documents';

    // List buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }

    const bucket = buckets.find(b => b.name === BUCKET_NAME);

    if (!bucket) {
      console.error(`❌ Bucket "${BUCKET_NAME}" not found!`);
      return;
    }

    console.log(`✅ Found bucket: ${BUCKET_NAME}`);
    console.log(`   ID: ${bucket.id}`);
    console.log(`   Created: ${bucket.created_at}\n`);

    // SQL to create RLS policies for storage
    const policySQL = `
-- Enable RLS on documents bucket
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = '${bucket.id}');

CREATE POLICY "Authenticated users can read their files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = '${bucket.id}');

CREATE POLICY "Authenticated users can delete their files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = '${bucket.id}');

CREATE POLICY "Service role can manage all files"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = '${bucket.id}')
WITH CHECK (bucket_id = '${bucket.id}');
    `;

    console.log('📋 RLS policies to create:');
    console.log('   - Authenticated users can upload files');
    console.log('   - Authenticated users can read files');
    console.log('   - Authenticated users can delete files');
    console.log('   - Service role can manage all files\n');

    console.log('✅ To apply these policies:');
    console.log('   1. Go to Supabase dashboard');
    console.log('   2. Click SQL Editor');
    console.log('   3. Click New Query');
    console.log('   4. Copy and paste the policies below');
    console.log('   5. Click Run\n');

    console.log('=== SQL Policies (copy and paste into Supabase SQL Editor) ===\n');
    console.log(policySQL);
    console.log('\n=== End of SQL ===\n');

    // Also provide info about what's needed
    console.log('📝 Policy Details:');
    console.log('   - Bucket ID:', bucket.id);
    console.log('   - Bucket Name:', BUCKET_NAME);
    console.log('   - These policies allow authenticated users to:');
    console.log('     • Upload files (INSERT)');
    console.log('     • Read files (SELECT)');
    console.log('     • Delete files (DELETE)');
    console.log('   - Service role gets full access');

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

setupStoragePolicy();
