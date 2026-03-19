# Test: Statement Labeling for November 24 to December 23

## Test Scenario
Upload a bank statement with period: "November 24, 2025 through December 23, 2025"

## Expected Result
- **Label:** December 2025
- **Start Date:** 2025-11-24
- **End Date:** 2025-12-23

## Why This Is Correct

### Day Count Calculation

**November portion:**
- Start: November 24
- End: November 30 (last day of November)
- Count: Nov 24, 25, 26, 27, 28, 29, 30 = **7 days**

**December portion:**
- Start: December 1
- End: December 23
- Count: Dec 1-23 = **23 days**

**Total:** 7 + 23 = 30 days (30-day statement ✓)

### Decision Logic

| Metric | November | December | Result |
|--------|----------|----------|--------|
| Days in period | 7 | 23 | December has MORE days |
| Apply rule | | | Use month with more days |
| **Label** | | | **December 2025** |

## What You'll See in Logs

### Browser Console (DevTools → Console)
When the file is parsed during upload:
```
[generateLabel] Bank statement period: 2025-11-24 to 2025-12-23 → Label: December 2025
```

### Vercel Logs (Production)
When the API processes the PDF:
```
[parse-bank-statement] Parsing period text: November 24, 2025 through December 23, 2025
[parse-bank-statement] Start date: 11/24/2025
[parse-bank-statement] End date: 12/23/2025
[parse-bank-statement] Cross-month statement: 7 days in month 11, 23 days in month 12
[parse-bank-statement] More days (or equal) in end month - using 12/2025
[parse-bank-statement] Statement labeling result: {
  periodText: "November 24, 2025 through December 23, 2025",
  startDate: "2025-11-24",
  endDate: "2025-12-23",
  label: "12/2025",
}
```

## Data Stored in Supabase

```json
{
  "statement_period_text": "November 24, 2025 through December 23, 2025",
  "statement_start_date": "2025-11-24",
  "statement_end_date": "2025-12-23",
  "statement_month": 12,
  "statement_year": 2025,
  // ... other financial data
}
```

## How to Test This Yourself

### If testing locally:
1. `npm run dev`
2. Go to http://localhost:3000/upload-deal
3. Upload a PDF with period "November 24, 2025 through December 23, 2025"
4. Open DevTools (F12) → Console
5. Look for logs starting with `[generateLabel]` and `[parse-bank-statement]`

### If testing on production (Vercel):
1. Upload the same PDF to production
2. Go to Vercel Dashboard → Your Project → Logs
3. Search for `[parse-bank-statement]` to see the labeling logs
4. Verify it shows December 2025

## What Could Go Wrong

### If it shows November 2025 (WRONG)
- The logic isn't comparing day counts correctly
- Check if the dates are being parsed correctly
- Look for: `[parse-bank-statement] Start date: ...` logs
- Verify the end date is being extracted from the period text

### If it shows a different month
- The period text may not have been extracted correctly
- Claude may have extracted "24 November through 23 December" instead
- Check the `statement_period_text` field in the logs

### If there's no log entry
- The API may have failed
- Look for error logs with `[parse-bank-statement] Error` or `Failed`
- Check if the PDF has the period text on it
- Verify the ANTHROPIC_API_KEY is set in Vercel environment

## Related Test Cases

Once this works, the following should also work:

1. **Single month:** Jan 1 to Jan 31 → January 2026
2. **Single month:** Feb 1 to Feb 28 → February 2026
3. **Equal split:** Dec 16-31 through Jan 1-15 → January 2026 (use end month)
4. **Large gap:** Nov 1-10 through Dec 1-31 → December 2025 (11 vs 31 days)
