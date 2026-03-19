# Table Name Fixes - Deal Creation Integration

## Problem Identified

The code was referencing a non-existent "merchants" table. The actual table in Supabase is "contacts", which was extended with merchant fields in the original schema and the MCA schema.

### Root Cause
- Original Supabase schema creates table: `contacts` (with all merchant-related fields added via ALTER TABLE)
- Updated schema file (supabase-deal-schema.sql) tried to reference: `merchants` (doesn't exist)
- Code referenced: `merchants` table (would fail at runtime)

## Fixes Applied

### 1. Fixed supabase-deal-schema.sql
**File:** `supabase-deal-schema.sql`

**Changed:**
```sql
-- BEFORE
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS dba text;
...
ALTER TABLE deals ADD COLUMN IF NOT EXISTS merchant_id uuid REFERENCES merchants(id) ON DELETE CASCADE;

-- AFTER
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS dba text;
...
ALTER TABLE deals ADD COLUMN IF NOT EXISTS merchant_id uuid REFERENCES contacts(id) ON DELETE CASCADE;
```

**Why:** The contacts table is the actual table that holds merchant data. All references changed from `merchants` to `contacts`.

### 2. Fixed create-deal-comprehensive.ts
**File:** `src/app/actions/create-deal-comprehensive.ts`

**Changed:**
```typescript
// BEFORE
const { data: merchant, error: merchantError } = await supabase
  .from('merchants')
  .insert(merchantData)
  .select()
  .single()

if (merchantError) throw new Error(`Failed to create merchant: ${merchantError.message}`)

// AFTER
const { data: merchant, error: merchantError } = await supabase
  .from('contacts')
  .insert(merchantData)
  .select()
  .single()

if (merchantError) throw new Error(`Failed to create contact: ${merchantError.message}`)
```

**Why:** Deal creation now correctly inserts contact records into the existing contacts table.

### 3. Fixed deal detail page
**File:** `src/app/(dashboard)/deals/[id]/page.tsx`

**Changes:**
```typescript
// BEFORE
const { data: merchantData } = await supabase
  .from('merchants')
  .select('*')
  .eq('id', dealData.merchant_id)
  .single()

// AFTER
const { data: merchantData } = await supabase
  .from('contacts')
  .select('*')
  .eq('id', dealData.merchant_id)
  .single()
```

Also added `merchant_id` to the DealData interface:
```typescript
interface DealData {
  id: string
  title: string
  deal_number: string
  merchant_id: string  // ADDED
  risk_score: number
  // ...
}
```

**Why:** Deal detail page correctly queries the contacts table when retrieving merchant data.

## Table Mapping Reference

| Logical Entity | Physical Table | Source | Status |
|---|---|---|---|
| Merchant/Contact | `contacts` | supabase-schema.sql | ✅ Exists |
| Deal | `deals` | supabase-schema.sql | ✅ Exists |
| Bank Statement Details | `bank_statements_detailed` | supabase-deal-schema.sql | ✅ Will be created |
| MCA Positions Detailed | `mca_positions_detailed` | supabase-deal-schema.sql | ✅ Will be created |
| Underwriting Scorecards | `underwriting_scorecards_detailed` | supabase-deal-schema.sql | ✅ Will be created |
| Risk Flags Detailed | `risk_flags_detailed` | supabase-deal-schema.sql | ✅ Will be created |
| Documents Detailed | `documents_detailed` | supabase-deal-schema.sql | ✅ Will be created |
| Deal Activities | `deal_activities` | supabase-deal-schema.sql | ✅ Will be created |

## Schema Files Status

### supabase-schema.sql
✅ Original schema - Creates contacts, deals, activities tables

### supabase-mca-schema.sql
✅ Extends contacts table with merchant fields
- Adds: business_legal_name, dba, entity_type, owner_name, ein, etc.
- Creates: payments, bank_statements, mca_positions, risk_flags, underwriting_scorecards, deal_documents

### supabase-deal-schema.sql
✅ FIXED - Now correctly references contacts instead of merchants
- Creates: bank_statements_detailed, mca_positions_detailed, underwriting_scorecards_detailed, risk_flags_detailed, revenue_sources, daily_balances, documents_detailed, deal_activities
- All references to "merchants" changed to "contacts"

## Contact/Merchant Table Fields

The `contacts` table now has all merchant fields needed:

**Base Fields (from supabase-schema.sql):**
- id, user_id, first_name, last_name, email, phone, company, title, type, status, source, address, city, state, zip, notes

**Merchant Fields (from supabase-mca-schema.sql):**
- business_legal_name, dba, entity_type, business_type, industry, years_in_business, monthly_revenue, average_daily_balance, credit_score, ein, owner_name, ownership_percentage, home_address, business_address, dob, ssn_last4, account_type, bank_name, landlord_name, monthly_rent, use_of_funds

**Additional Fields (from supabase-deal-schema.sql):**
- time_in_business_years, stated_monthly_revenue (all fields already covered)

## Data Flow After Fixes

### Deal Creation
1. User uploads application PDF and bank statements
2. PDFs parsed by Claude API
3. ReviewScreenNew displays analysis
4. User clicks action button
5. createDealComprehensive server action:
   - Inserts merchant data into **contacts** table ✅
   - Inserts deal data into **deals** table ✅
   - Inserts bank statements into **bank_statements_detailed** ✅
   - Inserts MCA positions into **mca_positions_detailed** ✅
   - ... (all other tables)

### Deal Retrieval
1. User navigates to `/deals/[id]`
2. Deal detail page loads
3. Queries **deals** table ✅
4. Queries **contacts** table for merchant_id ✅
5. Queries **bank_statements_detailed**, **mca_positions_detailed**, etc. ✅
6. Reconstructs ParsedApplication from contacts fields ✅
7. Reconstructs ParsedBankStatement[] from bank_statements_detailed ✅
8. Displays in ReviewScreenNew (read-only mode) ✅

## Build Status

✅ **Build Successful**
- All TypeScript errors fixed
- All table references corrected
- No ESLint warnings
- Ready for Supabase schema execution and testing

## Next Steps

1. **Run the updated SQL schemas in Supabase:**
   - First run: supabase-schema.sql (if not already run)
   - Then run: supabase-mca-schema.sql
   - Finally run: supabase-deal-schema.sql (now fixed)

2. **Test the flow:**
   - Upload deal → PDFs should parse
   - Create deal → Should save to contacts and deals tables
   - View deal detail → Should display all data

3. **Monitor for errors:**
   - Check Vercel logs for any remaining table issues
   - Check Supabase logs for RLS policy violations
   - Check browser console for any query errors

## Files Modified

1. ✅ `supabase-deal-schema.sql` - Changed all "merchants" to "contacts"
2. ✅ `src/app/actions/create-deal-comprehensive.ts` - Changed table reference
3. ✅ `src/app/(dashboard)/deals/[id]/page.tsx` - Changed table reference, added merchant_id to type

## Verification Commands

To verify the contacts table exists and has the right fields:

```sql
-- In Supabase SQL Editor
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'contacts'
ORDER BY ordinal_position;

-- Check if merchant fields exist
SELECT * FROM contacts LIMIT 1;
```

To verify the deals table has merchant_id:

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'deals' AND column_name IN ('merchant_id', 'contact_id');
```

---

**Completion Date:** 2026-03-19
**Build Status:** ✅ Success
**Ready to Deploy:** Yes
