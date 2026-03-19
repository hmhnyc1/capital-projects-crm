import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Configure timeout for this API route (5 minutes for file uploads)
export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    console.log('[upload-deal-files] Received request')
    console.log('[upload-deal-files] Request headers:', {
      contentType: request.headers.get('content-type'),
      contentLength: request.headers.get('content-length'),
    })

    let cookieStore
    try {
      cookieStore = cookies()
      console.log('[upload-deal-files] Cookies accessed successfully')
    } catch (err) {
      console.error('[upload-deal-files] Failed to access cookies:', err)
      return NextResponse.json({ error: 'Failed to access cookies' }, { status: 500 })
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          },
        },
      }
    )

    let user
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      user = authUser
      console.log('[upload-deal-files] User authenticated:', user?.id)
    } catch (err) {
      console.error('[upload-deal-files] Failed to authenticate:', err)
      return NextResponse.json({ error: 'Failed to authenticate' }, { status: 401 })
    }

    if (!user) {
      console.log('[upload-deal-files] No user found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify or create the deal-documents bucket
    const BUCKET_NAME = 'deal-documents'
    try {
      console.log(`[upload-deal-files] Checking if bucket "${BUCKET_NAME}" exists...`)
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()

      if (listError) {
        console.error('[upload-deal-files] Error listing buckets:', listError.message)
        // Continue anyway - might still work
      } else {
        const bucketExists = buckets?.some(b => b.name === BUCKET_NAME)

        if (!bucketExists) {
          console.log(`[upload-deal-files] Bucket "${BUCKET_NAME}" not found, creating...`)
          const { error: createError } = await supabase.storage.createBucket(BUCKET_NAME, {
            public: false,
          })

          if (createError) {
            console.error(`[upload-deal-files] Error creating bucket: ${createError.message}`)
            // Only fail if it's a real error, not "bucket already exists"
            if (!createError.message.includes('already exists')) {
              return NextResponse.json(
                { error: `Failed to create storage bucket: ${createError.message}` },
                { status: 500 }
              )
            }
          } else {
            console.log(`[upload-deal-files] Bucket "${BUCKET_NAME}" created successfully`)
          }
        } else {
          console.log(`[upload-deal-files] Bucket "${BUCKET_NAME}" exists`)
        }
      }
    } catch (err) {
      const bucketError = err instanceof Error ? err.message : 'Unknown error'
      console.error('[upload-deal-files] Error checking/creating bucket:', bucketError)
      // Continue anyway - maybe the bucket already exists
    }

    let formData
    try {
      console.log('[upload-deal-files] Parsing form data...')
      formData = await request.formData()
      console.log('[upload-deal-files] Form data parsed successfully')
    } catch (err) {
      console.error('[upload-deal-files] Failed to parse form data:', err)
      return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 })
    }

    const files = formData.getAll('files') as File[]
    console.log('[upload-deal-files] Files received:', files.length)
    files.forEach((f, i) => console.log(`  File ${i + 1}: ${f.name} (${f.size} bytes)`))

    if (!files || files.length === 0) {
      console.log('[upload-deal-files] No files provided')
      return NextResponse.json({ error: 'No files provided' }, { status: 400 })
    }

    // Create temporary deal directory for uploads
    const dealId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    console.log('[upload-deal-files] Generated deal ID:', dealId)
    const uploadedPaths: string[] = []

    for (const file of files) {
      try {
        console.log(`[upload-deal-files] Processing file: ${file.name}`)
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        console.log(`[upload-deal-files] File buffer created, size: ${buffer.length} bytes`)

        const timestamp = Date.now()
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const filePath = `deals/${dealId}/${timestamp}-${safeName}`
        console.log(`[upload-deal-files] Uploading to path: ${filePath}`)

        const { error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePath, buffer, { cacheControl: '3600', upsert: false })

        if (error) {
          console.error(`[upload-deal-files] Upload failed for ${file.name}:`, error)
          // Check if it's a bucket not found error and provide helpful message
          const errorMessage = error.message || JSON.stringify(error)
          if (errorMessage.includes('bucket') || errorMessage.includes('not found') || errorMessage.includes('does not exist')) {
            return NextResponse.json(
              {
                error: `Storage bucket "${BUCKET_NAME}" not found or inaccessible. Please ensure the bucket exists in Supabase Storage.`,
                details: errorMessage
              },
              { status: 503 }
            )
          }
          return NextResponse.json({ error: `Failed to upload ${file.name}: ${error.message}` }, { status: 500 })
        }

        console.log(`[upload-deal-files] File uploaded successfully: ${filePath}`)
        uploadedPaths.push(filePath)
      } catch (err) {
        const fileError = err instanceof Error ? err.message : 'Unknown error'
        console.error(`[upload-deal-files] Error processing file:`, fileError)
        return NextResponse.json({ error: `Failed to process file: ${fileError}` }, { status: 500 })
      }
    }

    const responseData = { dealId, uploadedPaths }
    console.log('[upload-deal-files] Returning response:', responseData)
    return NextResponse.json(responseData)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[upload-deal-files] Unhandled error:', message, err)
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 })
  }
}
