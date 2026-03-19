# Executing supabase-deal-schema.sql

## Option 1: Manual Execution in Supabase Dashboard (Easiest)

1. Go to your Supabase project: https://app.supabase.com/project/nxzrtryfiqtgmznvbtbd
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New Query"**
4. Open the file: `supabase-deal-schema.sql`
5. Copy ALL the contents
6. Paste into the SQL Editor
7. Click **"Run"** button (or press Ctrl+Enter)
8. Wait for completion - you should see green checkmarks

## Option 2: Using Supabase CLI with Database Password

### Step 1: Get Your Database Password

1. Go to **Project Settings** (gear icon, bottom left)
2. Click **"Database"** tab
3. Scroll down to **"Connection string"**
4. Copy the connection string, it looks like:
   ```
   postgresql://postgres:[PASSWORD]@db.nxzrtryfiqtgmznvbtbd.supabase.co:5432/postgres
   ```
5. Extract the password between `postgres:[PASSWORD]@`

### Step 2: Execute Using CLI

Run this command in your terminal (replace `YOUR_DB_PASSWORD`):

```bash
cd C:\Users\hmhny\my-crm
npx supabase db push --db-url "postgresql://postgres:YOUR_DB_PASSWORD@db.nxzrtryfiqtgmznvbtbd.supabase.co:5432/postgres" supabase-deal-schema.sql
```

Or use psql if installed:

```bash
psql "postgresql://postgres:YOUR_DB_PASSWORD@db.nxzrtryfiqtgmznvbtbd.supabase.co:5432/postgres" < supabase-deal-schema.sql
```

## Option 3: Automated Script (If Password Provided)

If you provide your database password, I can create a Node.js script to execute it automatically. Just tell me your password in a private message or command, and I'll create the script.

## What the Schema Does

The `supabase-deal-schema.sql` file:

✅ Updates the `contacts` table (fixes from `merchants` reference)
✅ Extends the `deals` table with comprehensive MCA underwriting fields
✅ Creates 8 new detailed tracking tables:
  - `bank_statements_detailed` - Monthly bank statement data
  - `mca_positions_detailed` - MCA lender positions
  - `underwriting_scorecards_detailed` - Risk assessment data
  - `risk_flags_detailed` - Risk flag tracking
  - `revenue_sources` - Revenue breakdown by source
  - `daily_balances` - Daily balance history
  - `documents_detailed` - Document metadata
  - `deal_activities` - Activity audit trail

✅ Enables Row Level Security on all new tables
✅ Creates RLS policies for user isolation
✅ Creates indexes for query performance
✅ Sets up update triggers for timestamps

## Verification After Execution

After running the schema, verify it worked:

**In Supabase SQL Editor, run:**

```sql
-- Check if new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'bank_statements_detailed',
  'mca_positions_detailed',
  'underwriting_scorecards_detailed',
  'risk_flags_detailed',
  'revenue_sources',
  'daily_balances',
  'documents_detailed',
  'deal_activities'
)
ORDER BY table_name;
```

You should see 8 rows returned.

```sql
-- Check if contacts table was updated with merchant fields
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'contacts'
AND column_name IN (
  'business_legal_name',
  'dba',
  'entity_type',
  'owner_name',
  'ein',
  'stated_monthly_revenue'
)
ORDER BY column_name;
```

You should see 6 rows returned (merchant fields).

```sql
-- Check if deals table has merchant_id
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'deals'
AND column_name = 'merchant_id';
```

You should see 1 row returned.

## Troubleshooting

**Error: "table 'merchants' does not exist"**
- This is expected - the fix we applied uses `contacts` instead
- Verify you're using the updated `supabase-deal-schema.sql`

**Error: "column already exists"**
- This is normal - the schema uses `IF NOT EXISTS`
- It just means the column was already added by a previous run
- Safe to run multiple times

**Error: "permission denied"**
- You may need to use the database password
- Check you're using a service role or database owner account

**Error: "connection refused"**
- Verify your Supabase project is active
- Check internet connection
- Verify the project reference is correct

## Next Steps

1. ✅ Execute the schema using one of the options above
2. ✅ Verify all tables were created (see verification queries)
3. ✅ Test uploading a deal through the app
4. ✅ View the deal on the detail page
5. ✅ Monitor Vercel logs for any errors

---

**TL;DR:** The easiest way is to copy the SQL from `supabase-deal-schema.sql`, paste it into the Supabase SQL Editor, and click Run. That's it!
