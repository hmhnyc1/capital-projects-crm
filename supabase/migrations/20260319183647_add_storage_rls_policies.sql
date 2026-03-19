-- Get the bucket ID for documents bucket
-- Note: Bucket ID is static: 'documents'

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read their files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete their files" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage all files" ON storage.objects;

-- Create new policies
CREATE POLICY "Authenticated users can upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can read their files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete their files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Service role can manage all files"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');
