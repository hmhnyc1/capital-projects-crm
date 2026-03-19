# Bank Statement Month Labeling Logic

## Overview
The bank statement month/year labeling now uses intelligent logic based on the actual statement period dates, not just the start date.

## The Algorithm

### Step 1: Extract Period Text
The Claude API is asked to extract the exact statement period text from the PDF. Examples:
- "January 01, 2026 through January 30, 2026"
- "November 24, 2025 through December 23, 2025"
- "December 1, 2025 - December 31, 2025"
- "01/01/2026 - 01/31/2026"

### Step 2: Parse Dates
The function `calculateStatementMonthAndYear()` parses both the start and end dates from the period text.

Supported formats:
- "Month DD, YYYY" (e.g., "November 24, 2025")
- "MM/DD/YYYY" (e.g., "11/24/2025")

### Step 3: Determine Label Month

**Rule 1: Single Calendar Month**
If start and end dates are in the same calendar month, use that month.
- Example: "January 01, 2026" through "January 31, 2026" → Label: **January 2026**

**Rule 2: Cross-Month Statement**
If the statement crosses two calendar months:
1. Count how many days fall in each month
2. Use the month with MORE days
3. If exactly 50/50, use the ENDING month (not start month)

**Rule 3: Never Default to Start Month**
- Always calculate based on actual day counts
- Starting month is never used as default

### Example Walkthrough: November 24 to December 23

**Input:** "November 24, 2025 through December 23, 2025"

**Parse Dates:**
- Start: November 24, 2025
- End: December 23, 2025

**Count Days in Each Month:**
```
November portion: Nov 24, 25, 26, 27, 28, 29, 30 = 7 days
December portion: Dec 1-23 = 23 days
```

**Apply Rules:**
- Not single month (different months)
- November: 7 days
- December: 23 days
- December > November (23 > 7)
- **Result: December 2025** ✓

## Data Stored

For each statement, we now store:

```typescript
{
  statement_period_text: "November 24, 2025 through December 23, 2025",
  statement_start_date: "2025-11-24",
  statement_end_date: "2025-12-23",
  statement_month: 12,    // Calculated from period
  statement_year: 2025,   // From period
  // ... other fields
}
```

## Logging

The `parse-bank-statement` API logs detailed information for debugging:

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
  label: "12/2025"
}
```

The `generateLabel` utility then logs:
```
[generateLabel] Bank statement period: 2025-11-24 to 2025-12-23 → Label: December 2025
```

## Testing the Logic

### Test Case 1: Single Month
**Input:** "January 01, 2026 through January 31, 2026"
**Expected Output:** January 2026
**Why:** Both dates in same month

### Test Case 2: Nov to Dec (More Days in Dec)
**Input:** "November 24, 2025 through December 23, 2025"
**Expected Output:** December 2025
**Why:** 7 days in Nov, 23 days in Dec → Use Dec

### Test Case 3: Dec to Jan (More Days in Jan)
**Input:** "December 9, 2025 through January 8, 2026"
**Expected Output:** January 2026
**Why:** 23 days in Dec (9-31), 8 days in Jan → Use Jan (23 > 8)
**Wait:** 23 > 8, so should be December? Let me recalculate...
- Dec 9-31 = 23 days
- Jan 1-8 = 8 days
- December has more days (23 > 8)
- **Expected Output: December 2025**

### Test Case 4: Exact 50/50
**Input:** "December 16, 2025 through January 15, 2026"
**Expected Output:** January 2026
**Why:**
- Dec 16-31 = 16 days
- Jan 1-15 = 15 days
- Not exactly 50/50, but close. December > January, so December 2025
- Actually this is 16 days Dec and 15 days Jan. Let me recheck the 50/50 case...

For true 50/50, we'd need:
- Odd-length month starting mid-month
- Example: November 16-30 through December 1-15 = 15 days each
- **Expected Output: December 2025** (use ending month)

## Debugging When It's Wrong

### Check Browser Console
```
[generateLabel] Bank statement period: 2025-11-24 to 2025-12-23 → Label: December 2025
```

### Check Vercel Logs
Look for statements like:
```
[parse-bank-statement] Statement labeling result: {
  periodText: "November 24, 2025 through December 23, 2025",
  startDate: "2025-11-24",
  endDate: "2025-12-23",
  label: "12/2025",
}
```

### Common Issues

**Issue: Label shows January but should be December**
- Check the period text extraction
- Verify the dates are being parsed correctly
- Look for typos in the period text (e.g., "January" misspelled as "Janaury")

**Issue: Shows November when it should be December**
- Check the day counts are being calculated correctly
- Common mistake: Not including the end date in count

**Issue: Period text is null**
- Claude couldn't find the statement period on the PDF
- May be in an unexpected format or location
- The period text would need to be manually added

## How to Fix Edge Cases

If a statement period is not being extracted correctly:

1. **Check the period text extraction:**
   - Update the regex patterns in `calculateStatementMonthAndYear()` if PDF uses a different format

2. **Check the date parsing:**
   - Add more month name variations to `monthNames` object
   - Support additional date formats (YYYY-MM-DD, etc.)

3. **Verify day counting logic:**
   - The `countDaysInMonth()` function counts days inclusive of start date
   - Make sure it handles month boundaries correctly

## Implementation Details

**File:** `/api/parse-bank-statement/route.ts`

**Key Functions:**
- `calculateStatementMonthAndYear()` - Main logic
- `countDaysInMonth()` - Counts days in each month of the period
- `formatDate()` - Formats dates as YYYY-MM-DD

**Type Updates:** `src/types/index.ts`
- Added `statement_period_text` field
- Added `statement_start_date` field
- Added `statement_end_date` field

**Utilities Updated:** `src/app/(dashboard)/upload-deal/utils.ts`
- `generateLabel()` now logs the period and label for debugging
