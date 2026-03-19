# Debugging Guide - Create Deal Flow

## Overview
The Create Deal flow has been instrumented with detailed logging at every step to help identify where failures occur.

## Frontend Logging (Browser Console)

When you click "Create Deal", open your browser's Developer Tools (F12) and go to the **Console** tab. You'll see logs with these prefixes:

### [DealUploadForm] - File Parsing
```
[DealUploadForm] Parsing file 1: application.pdf
[DealUploadForm] Application parse response: 200 OK
[DealUploadForm] Application response text: {object showing first 200 chars...}
[DealUploadForm] Application parsed successfully: has data
```

**What to look for:**
- If status is not 200, the API call failed
- If "no data", the parsing succeeded but returned empty data
- If parse error, the response wasn't valid JSON

### [ReviewScreen] - Deal Creation
```
[ReviewScreen] Starting Create Deal flow
[ReviewScreen] Files to upload: 3
[ReviewScreen] Application data: {object}
[ReviewScreen] Statements: 2
[ReviewScreen] Uploading files...
[ReviewScreen] Upload response status: 200 OK
[ReviewScreen] Upload response headers: {content-type, content-length}
[ReviewScreen] Upload response text: {text of response}
[ReviewScreen] Deal ID: temp-1234567890-abc123
[ReviewScreen] Uploaded paths: [array of paths]
[ReviewScreen] Calling createDealFromUpload...
[ReviewScreen] Deal created successfully
```

**What to look for:**
- Upload response status - if not 200, file upload failed
- Response headers - check content-type and content-length
- The actual response text before JSON parsing
- Deal ID generation
- Successful completion message

## Backend Logging (Vercel/Server Logs)

### To view logs on Vercel:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Deployments" tab
4. Click the most recent deployment
5. Click "Logs" tab or view in "Functions" tab
6. You'll see real-time logs as requests come in

### Log Prefixes and What They Mean:

#### [upload-deal-files] - File Upload API
```
[upload-deal-files] Received request
[upload-deal-files] Request headers: {content-type, content-length}
[upload-deal-files] Cookies accessed successfully
[upload-deal-files] User authenticated: user-id-uuid
[upload-deal-files] Parsing form data...
[upload-deal-files] Form data parsed successfully
[upload-deal-files] Files received: 3
  File 1: application.pdf (1500000 bytes)
  File 2: jan-2024.pdf (2000000 bytes)
  File 3: feb-2024.pdf (1800000 bytes)
[upload-deal-files] Generated deal ID: temp-1234567890-abc123
[upload-deal-files] Processing file: application.pdf
[upload-deal-files] File buffer created, size: 1500000 bytes
[upload-deal-files] Uploading to path: deals/temp-1234567890-abc123/1234567890-application.pdf
[upload-deal-files] File uploaded successfully
[upload-deal-files] Returning response: {dealId, uploadedPaths}
```

**Red flags:**
- "Request headers: Request Entity Too Large" (413 error) - see size limit fix below
- "Failed to access cookies" - authentication/session issue
- "Failed to parse form data" - malformed request
- "File upload failed" - Supabase storage issue

#### [parse-application] - Application Parsing
```
[parse-application] Received request
[parse-application] Parsing form data...
[parse-application] Form data parsed
[parse-application] File: application.pdf (1500000 bytes)
[parse-application] Reading file buffer...
[parse-application] File buffer read, size: 1500000
[parse-application] Converting to base64...
[parse-application] Base64 size: 2000000
[parse-application] Calling Anthropic API...
[parse-application] API call successful
[parse-application] Raw response text length: 450
[parse-application] Raw response text preview: {"business_legal_name": "ABC Corp"...}
[parse-application] Parsing JSON...
[parse-application] JSON parsed successfully
[parse-application] Returning response with data keys: [list of keys]
```

**Red flags:**
- "API call failed" - Anthropic API error (check API key, rate limits)
- "No text response from AI model" - response was empty
- "JSON parse failed" - Claude returned malformed JSON

#### [parse-bank-statement] - Bank Statement Parsing
- Same format as [parse-application]

## Common Issues and Solutions

### 1. "Request Entity Too Large" (413 Error)

**Symptoms:**
```
[ReviewScreen] Upload error response text: Request Entity Too Large
```

**Causes:**
- PDF files are larger than the request size limit
- Multiple large PDFs in one request

**Solutions:**
- ✅ **Already fixed** - API routes now have 5-minute timeout (maxDuration: 300)
- For extremely large files (>10MB each), consider chunking:
  - Create a separate API endpoint for chunked uploads
  - Upload each chunk separately, reassemble on server

### 2. "No text response from AI model" or "JSON parse failed"

**Symptoms:**
```
[parse-application] No text response from AI model
or
[parse-application] JSON parse failed: Unexpected token 'R'
```

**Causes:**
- Claude returned HTML error page instead of JSON
- Response was truncated or corrupted
- API error (rate limit, quota exceeded, etc.)

**Solutions:**
- Check Anthropic API key is set correctly in Vercel environment variables
- Check you haven't hit Claude API rate limits
- Check console logs in [parse-application] route for "API call failed" error

### 3. "Failed to authenticate"

**Symptoms:**
```
[upload-deal-files] Failed to authenticate: [error details]
```

**Causes:**
- Session/auth token expired
- Cookies not being sent with request
- Supabase session issue

**Solutions:**
- Log out and log back in
- Check browser DevTools > Application > Cookies for Supabase auth tokens
- Clear local storage and try again

## Testing Locally

To test the logging locally:

```bash
npm run dev
```

Then:
1. Open http://localhost:3000 in your browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Navigate to /upload-deal
5. Upload files and click "Create Deal"
6. Watch console logs appear in real-time
7. Check terminal output for server-side logs

## Production Debugging

For Vercel production logs:

1. **Real-time streaming:**
   - Go to your Vercel dashboard
   - Click "Logs" tab
   - Tail logs as user interacts

2. **Search logs:**
   - Use prefixes: `[upload-deal-files]`, `[parse-application]`, etc.
   - Search for error patterns: `failed`, `error`, `Error`

3. **Export logs:**
   - Vercel provides log export in CSV/JSON format
   - Download for deeper analysis

## What Each Response Should Look Like

### Successful File Upload
```json
{
  "dealId": "temp-1234567890-abc",
  "uploadedPaths": [
    "deals/temp-1234567890-abc/1234567890-app.pdf",
    "deals/temp-1234567890-abc/1234567890-stmt1.pdf"
  ]
}
```

### Successful Application Parse
```json
{
  "data": {
    "business_legal_name": "ABC Corporation",
    "owner_name": "John Doe",
    "ein": "12-3456789",
    ...
  }
}
```

### Error Response (Any API)
```json
{
  "error": "Detailed error message explaining what went wrong"
}
```

## Next Steps After Identifying the Issue

Once you've found the problem using these logs:

1. **Request too large?** → Implement chunked uploads
2. **API parsing fails?** → Check Anthropic API configuration
3. **Auth fails?** → Clear session and re-login
4. **JSON parse error?** → Check API response format and error handling
5. **Timeout?** → Increase maxDuration or optimize file processing

All response handling has been updated to:
- ✅ Always return valid JSON from API routes
- ✅ Catch JSON parsing errors on frontend
- ✅ Log full response text before parsing
- ✅ Display clear error messages to user
