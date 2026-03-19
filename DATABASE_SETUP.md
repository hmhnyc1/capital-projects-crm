# Database Setup Instructions

## Overview
The deal detail page requires several new tables to store parsed application data, bank statements, MCA positions, risk assessment scores, and documents. These tables were created as part of a recent migration but need to be manually applied to your Supabase instance.

## Tables Required
- `bank_statements_detailed` - Stores parsed bank statement data for each deal
- `mca_positions_detailed` - Stores MCA lender positions identified in statements
- `underwriting_scorecards_detailed` - Stores risk assessment scores and metrics
- `risk_flags_detailed` - Stores risk flags and warnings identified during underwriting
- `documents_detailed` - Stores uploaded document references and metadata

## Option 1: Apply via Supabase SQL Editor (Easiest)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **nxzrtryfiqtgmznvbtbd**
3. Navigate to **SQL Editor** (left sidebar)
4. Click **"New query"** button
5. Copy the entire contents of: `supabase/migrations/20260319210000_create_deal_detail_tables.sql`
6. Paste into the SQL editor
7. Click **"Run"** button
8. Verify all tables were created successfully

## Option 2: Apply via Supabase CLI

```bash
# Login to Supabase (if not already logged in)
supabase login

# Link your project
supabase link --project-ref nxzrtryfiqtgmznvbtbd

# Push the migration
supabase db push
```

## Option 3: Apply via Node Script (Requires Database Password)

```bash
npm run db:setup
```

Note: This requires your Supabase database password to be available via environment variables.

## Verification

After applying the migration, verify the tables exist:

```sql
-- Run in Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'bank_statements_detailed',
  'mca_positions_detailed',
  'underwriting_scorecards_detailed',
  'risk_flags_detailed',
  'documents_detailed'
);
```

You should see all 5 tables listed.

## What Happens After Setup

Once these tables are created:
1. The deal creation flow will properly save parsed data to these tables
2. The deal detail page will successfully fetch and display:
   - Application data
   - Bank statement summaries
   - MCA lender positions
   - Risk assessment scores
   - Risk flags and warnings
   - Uploaded documents
   - Activity timeline

## Troubleshooting

If the migration fails:

1. **"relation already exists"** - Tables may already be created. This is OK.
2. **"permission denied"** - Ensure you're logged in with a role that can create tables (usually the default postgres user)
3. **Connection errors** - Verify your Supabase credentials are correct in `.env.local`

## Migration File

The migration SQL file contains:
- 5 table definitions with proper column types and constraints
- Foreign key references to existing tables (deals, contacts, auth.users)
- RLS (Row Level Security) policies for data isolation
- Indexes for performance optimization
- Check constraints for valid status/severity values

All tables include Row Level Security (RLS) to ensure users can only view their own data.
