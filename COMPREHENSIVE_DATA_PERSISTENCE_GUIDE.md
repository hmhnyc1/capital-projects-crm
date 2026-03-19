# Comprehensive Data Persistence Guide

## Overview

The deal review screen now saves ALL data to Supabase across 9 tables when any action button is clicked. The deal detail page can then pull all this data and display it identically to the review screen.

## Database Schema

**File:** `supabase-deal-schema.sql`

### Run This SQL in Supabase:

1. Go to https://supabase.com
2. Select your project
3. Click "SQL Editor"
4. Paste the contents of `supabase-deal-schema.sql`
5. Click "Run"

### Tables Created:

1. **merchants** - Extended with all application fields
2. **deals** - Extended with comprehensive underwriting fields
3. **bank_statements_detailed** - One row per month analyzed
4. **mca_positions_detailed** - One row per MCA funder
5. **underwriting_scorecards_detailed** - Complete scorecard with all components
6. **risk_flags_detailed** - One row per risk flag identified
7. **revenue_sources** - Breakdown of revenue by source
8. **daily_balances** - One row per day for balance trending
9. **documents_detailed** - Metadata for all uploaded documents
10. **deal_activities** - Activity timeline for the deal

All tables have:
- Row Level Security enabled (RLS)
- User isolation (user_id foreign key)
- Proper indexes for performance
- Timestamps for audit trails

## Server Action

**File:** `src/app/actions/create-deal-comprehensive.ts`

### Function Signature:

```typescript
async function createDealComprehensive(
  application: ParsedApplication,
  statements: ParsedBankStatement[],
  dealId: string,
  filePaths: string[],
  position: 'approved' | 'declined' | 'counter' | 'review',
  customTerms?: { advanceAmount: number; factorRate: number; termDays: number },
  uploadedFiles?: Array<{ name: string; size: number }>
)
```

### What It Saves:

1. **Merchant Record**
   - All 18 application fields extracted from PDF
   - Contact information, addresses, business details
   - Extracted data persists even if original PDF is deleted

2. **Deal Record**
   - Risk score and grade
   - Executive summary narrative
   - Portfolio metrics (revenue trends, ADB, NSFs, etc.)
   - Recommended terms (advance, factor rate, term days)
   - Date range of analyzed statements
   - Position recommendation (Approve/Counter/Decline/Review)

3. **Bank Statements** (one per month)
   - All extracted financial data
   - Statement period dates
   - Balance history
   - NSF events (dates and amounts)
   - MCA debit information
   - Cash flow analysis

4. **MCA Positions** (one per funder)
   - Funder name
   - Daily/weekly/monthly obligations
   - Period active
   - Total paid

5. **Underwriting Scorecard**
   - Overall score and grade
   - 6 component scores with benchmarks
   - Recommended terms and position

6. **Risk Flags** (one per flag)
   - Flag type and severity
   - Detailed description
   - Value that triggered the flag

7. **Revenue Sources** (one per source)
   - Source name (e.g., "Shopify", "Square", "ACH")
   - Amount and percentage of revenue
   - Active months

8. **Daily Balances** (one per day)
   - Date
   - Balance
   - Status (OK/LOW/CRITICAL)

9. **Documents** (one per file)
   - File name, size, type
   - Storage path
   - Model used for extraction
   - Upload timestamp

10. **Activity Timeline**
    - First entry when deal is created
    - Records the action (Approve/Decline/Counter/Save)
    - Records risk score and grade at time of action

## ReviewScreenNew Integration

**File:** `src/app/(dashboard)/upload-deal/ReviewScreenNew.tsx`

### Updated handleCreate Function:

```typescript
async function handleCreate(status: 'approved' | 'declined' | 'counter' | 'review') {
  // ... existing file upload code ...
  const fileInfos = files.map(f => ({ name: f.label, size: f.file.size }))
  await createDealComprehensive(
    app,
    statements,
    dealId,
    uploadedPaths,
    status as 'approved' | 'declined' | 'counter' | 'review',
    {
      advanceAmount: dealTerms.advanceAmount,
      factorRate: dealTerms.factorRate,
      termDays: dealTerms.termDays,
    },
    fileInfos
  )
}
```

### All Action Buttons Call handleCreate:

- **Approve Deal** → handleCreate('approved')
- **Counter Offer** → handleCreate('counter')
- **Save for Review** → handleCreate('review')
- **Decline Deal** → handleCreate('declined')

## Deal Detail Page

**File:** `src/app/(dashboard)/deals/[id]/page.tsx`

The existing deal page should be updated to:

1. Query all comprehensive data from the 9 tables
2. Reconstruct the ParsedApplication and ParsedBankStatement[] objects
3. Pass them to ReviewScreenNew for display
4. Display activity timeline
5. Show deal terms calculator for adjustment

### Example Data Flow:

```
GET /deals/[dealId]
  ├─ Query deals table
  ├─ Query merchants table
  ├─ Query bank_statements_detailed
  ├─ Query mca_positions_detailed
  ├─ Query underwriting_scorecards_detailed
  ├─ Query risk_flags_detailed
  ├─ Query documents_detailed
  ├─ Query deal_activities
  └─ Reconstruct and display in ReviewScreenNew format
```

## Data Integrity

### Atomicity:

All data for a single deal is saved in one server action invocation. If any insert fails, the entire operation is logged (errors don't stop execution, but are console logged).

### Auditability:

- Every action creates an entry in deal_activities
- deal_activities records who made the action and when
- All tables have created_at/updated_at timestamps
- Previous values can be stored in deal_activities.old_values

### Isolation:

- Row Level Security ensures users only see their own deals
- user_id is always included and verified
- merchants and contacts are connected to deals properly

## Testing Checklist

- [ ] SQL schema runs successfully in Supabase
- [ ] No errors in browser console when clicking action buttons
- [ ] Deal appears in deals list after creation
- [ ] All fields populate correctly in database
- [ ] Deal detail page loads and displays data
- [ ] ExecutiveSummary reads well and is accurate
- [ ] Risk flags are all recorded
- [ ] Activity timeline shows initial action
- [ ] Documents are tracked with correct paths
- [ ] Portfolio metrics are accurate across all statements
- [ ] MCA positions are aggregated correctly
- [ ] Underwriting scorecard shows all component scores

## Future Enhancements

1. **Export to PDF** - Generate professional PDF report from stored data
2. **Deal Comparison** - Compare metrics across multiple deals
3. **Historical Tracking** - Track changes to deal terms over time
4. **Underwriter Notes** - Allow additional notes and comments on deals
5. **Approval Workflow** - Multi-level approval with sign-offs
6. **Integration** - Sync with accounting/loan servicing systems
7. **Bulk Import** - Process multiple deals at once
8. **Machine Learning** - Predictive models using historical data
9. **Custom Rules** - Allow users to define approval criteria
10. **Webhook Notifications** - Notify integrations when deals change

## Troubleshooting

### Deal not saving:
- Check browser console for errors
- Check Vercel logs for server action errors
- Verify all environment variables are set
- Check Supabase quota limits

### Data missing from detail page:
- Verify the deal was created (check deals list)
- Check individual tables in Supabase
- Verify RLS policies aren't blocking reads
- Check that deal_id foreign keys are set correctly

### Incorrect data:
- Check that parsing APIs return correct data
- Verify calculation logic in createDealComprehensive
- Check that statement dates are being extracted correctly
- Verify that MCA positions are being deduplicated

## Performance Notes

- All tables are indexed on deal_id, user_id, and created_at
- Queries should execute in <100ms for a single deal
- Bulk operations (10+ deals) may benefit from batch inserts
- Consider archiving old deals to separate table after 1 year

## Security Notes

- All sensitive data (SSN) should be masked before display
- File paths in storage_path should not expose user hierarchy
- RLS policies prevent unauthorized access
- All user_id checks happen server-side
- Consider encrypting raw_data column for extra security

## API Changelog

### New Tables:
- bank_statements_detailed
- mca_positions_detailed
- underwriting_scorecards_detailed
- risk_flags_detailed (enhanced)
- revenue_sources
- daily_balances
- documents_detailed (enhanced)
- deal_activities

### Updated Columns:
- deals: 20+ new fields for underwriting
- merchants: 15+ new fields for application data
- contacts: → renamed to merchants in queries
