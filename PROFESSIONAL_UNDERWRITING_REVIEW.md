# Professional Underwriting Review Screen

## Overview

The comprehensive deal review screen is now a professional-grade underwriting document that displays all critical information for making lending decisions. It's built with dark mode fintech design and includes every element needed for thorough deal analysis.

## Key Features

### 1. STICKY DEAL HEADER
Always visible while scrolling:
- Business name, legal name, and DBA
- Owner name and EIN
- Large risk grade (A/B/C/D/E/F) with color coding
- Risk score (0-100)
- Quick stats: Time in business, stated revenue, avg true revenue, holdback %, NSFs

### 2. DEAL INFORMATION SECTION
Complete deal metadata:
- Business legal name, DBA, entity type
- Owner name, ownership percentage
- Time in business, industry
- EIN, address, phone, email
- Bank information, account type
- Landlord name and monthly rent (if applicable)

### 3. EXECUTIVE SUMMARY
AI-generated narrative paragraph covering:
- Merchant overview (who they are, what they do)
- Revenue analysis (stated vs. analyzed)
- MCA obligations and impact
- Key risks identified
- Funding recommendation (Approve/Counter/Decline)

### 4. MERCHANT INFORMATION DETAILED
Full merchant profile with:
- All 18 application fields
- **Stated vs Analyzed Revenue comparison** showing:
  - Stated monthly revenue
  - Analyzed average true revenue
  - Variance percentage
  - Red flag if stated is inflated >20%

### 5. COMBINED BANK ANALYSIS SUMMARY
Cross-month metrics:
- Total months analyzed
- Date range
- Average monthly true revenue
- Highest/lowest monthly revenue with months
- Revenue trend direction and %
- Average daily balance
- Total NSF events across all months
- Average holdback percentage
- Net cash flow trend

### 6. MONTH BY MONTH BREAKDOWN TABLE
Fully sortable table showing:
- **Columns:** Month/Year, Start Balance, End Balance, True Revenue, Non-Revenue Deposits, Total Deposits, Avg Daily Balance, Lowest Balance, NSFs, MCA Holdback, Holdback %, Net Cash Flow
- **Color coding:** Green (good), Yellow (warning), Red (bad)
- **Context-aware colors:**
  - ADB < $1,000 = Red
  - ADB < $2,500 = Yellow
  - NSF > 0 = Red
  - Holdback > 15% = Red
- **Totals row** at bottom with aggregates and averages

### 7. MCA / HOLDBACK ANALYSIS TABLE
Per-funder breakdown:
- Funder name
- Daily debit amount
- Weekly amount (daily × 7)
- Monthly total (daily × 30)
- Period active (from - to)
- **Combined obligation row** showing total daily/weekly/monthly MCA obligations
- Holdback impact analysis:
  - Average holdback %
  - Monthly dollar impact
  - Number of active positions
  - Status (OK / WARNING / CRITICAL)
  - Flags if >15%, >20%, >25%

### 8. UNDERWRITING SCORECARD
Professional risk assessment:
- **Overall score and grade** prominently displayed (0-100, A-F)
- **Risk level indicator** with color coding
- **Component scorecard** showing:
  - Average Daily Balance (score + benchmark)
  - NSF History (count, frequency)
  - Holdback percentage impact
  - Number of MCA positions
  - Time in business
  - Each with visual indicator (green = good, red = bad)
- **Recommendations box:**
  - Max advance amount (calculated)
  - Recommended factor rate range (1.20 - 1.45)
  - Recommended term (days)
  - Recommended daily debit amount

### 9. RISK FLAGS SECTION
All identified risk factors with:
- **Severity levels:** HIGH (red), MEDIUM (yellow), LOW (blue)
- **Detailed explanations** for each flag
- **Ordered by severity** (HIGH first)
- Examples:
  - Low stated monthly revenue
  - Business less than 2 years old
  - High NSF events
  - Below $1,000 average daily balance
  - High MCA holdback
  - Multiple MCA lenders detected
  - Declining revenue trend
  - Days below $500 threshold

### 10. DOCUMENTS SECTION
All uploaded files tracked with:
- File type badge (Application / Bank Statement)
- File name and size
- Month/year label (for statements)
- Parsing confidence indication
- Model used (Haiku/Sonnet)

### 11. DEAL TERMS CALCULATOR (Interactive)
Real-time deal structuring:
- **Input fields:**
  - Advance Amount (prefilled with recommended)
  - Factor Rate (default 1.30, range 1.20-1.45)
  - Term in Days (default 150, range 120-180)

- **Auto-calculated outputs:**
  - Payback amount (advance × factor rate)
  - Daily debit (payback ÷ term days)
  - Weekly debit (daily × 7)
  - Monthly debit (daily × 30)
  - Gross profit (payback - advance)
  - % of average revenue (shows if sustainable)
  - Profit margin (%)
  - Payoff timeline

- **Validation:**
  - Flags if daily debit > 30% of revenue (warning)
  - Shows impact in real-time as user adjusts terms

### 12. ACTION BUTTONS (Bottom of Page)
Four primary actions:
1. **Approve Deal** - Green button, creates deal with Approved status
2. **Counter Offer** - Blue button, creates deal with Counter status, opens terms editor
3. **Save for Review** - Yellow button, creates deal with Under Review status for later
4. **Decline Deal** - Red button, creates deal with Declined status

## Design Features

### Dark Mode Fintech Aesthetic
- Slate 950 background
- Slate 900 card backgrounds
- Slate 800/900 accent colors
- Color-coded status indicators:
  - Green (#10b981): Positive metrics
  - Yellow (#eab308): Warnings
  - Red (#ef4444): Problems
  - Blue (#3b82f6): Info

### Professional Layout
- **Sticky header** stays visible while scrolling
- **Collapsible sections** to manage complexity
- **Clean spacing** between sections
- **Consistent typography** and hierarchy
- **Icon indicators** for quick scanning

### Responsive Design
- Mobile-first approach
- Tablet-optimized tables
- Desktop-optimized multi-column layouts
- Touch-friendly button sizes
- Scrollable tables on mobile

### Performance
- Lazy-loaded sections
- Collapsible sections to reduce DOM
- Efficient re-renders
- Icons from lucide-react (lightweight)

## Data Sources

All data comes from:
1. **Parsed Application** (ParsedApplication type)
2. **Parsed Bank Statements** (ParsedBankStatement[] type)
3. **Risk Analysis** (calculateRiskScore function)
4. **Portfolio Metrics** (calculatePortfolioMetrics function)
5. **MCA Positions** (extractMCAPositions function)
6. **Statement Metrics** (generateStatementMetrics function)

## Helper Functions (utils.ts)

New utility functions for the review screen:

```typescript
// Format currency
fmt(n: number | null | undefined) → "$12,345"

// Get month label
getMonthLabel(month: 1-12, year: number) → "January 2026"

// Calculate revenue variance
getRevenueVariance(stated: number, analyzed: number) → % difference

// Generate metrics for all statements
generateStatementMetrics(statements) → StatementMetrics[]

// Find extremes in revenue
findLowestAndHighestMonth(statements) → {lowestMonth, lowestRevenue, highestMonth, highestRevenue}
```

## Color Coding Rules

**Daily Balance (ADB):**
- Green: $2,500+
- Yellow: $1,000 - $2,499
- Red: < $1,000

**NSF Count:**
- Green: 0 events
- Yellow: 1-2 events
- Red: 3+ events

**Holdback %:**
- Green: < 10%
- Yellow: 10-15%
- Red: > 15%

**Revenue Trend:**
- Green: Growing (positive %)
- Yellow: Flat
- Red: Declining (negative %)

## User Flows

### Reviewing a Deal
1. Upload application PDF and bank statements
2. PDFs are parsed by Claude API
3. Review Screen appears with all analysis
4. User scrolls through sections
5. Expands/collapses sections as needed
6. Adjusts deal terms in calculator
7. Clicks decision button (Approve/Counter/Decline/Review)

### Comparing Terms
1. User enters Advance Amount
2. Factor Rate is set (1.20 - 1.45)
3. Term is set (120 - 180 days)
4. All calculations auto-update in real-time
5. User can see sustainability (% of revenue)

### Making Decision
1. All information is visible
2. Risk flags are clear
3. Recommendation is prominent
4. User clicks action button
5. Deal is created and redirect to deal page

## Future Enhancements

Possible additions:
1. Export deal analysis as PDF report
2. Add daily balance trend chart
3. Add revenue trend chart
4. Add NSF event timeline
5. Add notes/comments section
6. Add approval workflow stages
7. Add auto-calculated factor rate based on risk score
8. Add comparison to historical portfolio performance
9. Add co-underwriter review fields
10. Add conditions/stipulations entry

## File Structure

```
src/app/(dashboard)/upload-deal/
├── ReviewScreenNew.tsx       # Main component (comprehensive underwriting review)
├── DealUploadForm.tsx        # File upload form (uses ReviewScreenNew)
├── RiskScorer.ts             # Risk calculation logic
├── utils.ts                  # Helper functions for analysis
└── page.tsx                  # Page component
```

## Technical Notes

- Component: React functional component with hooks
- State: useState for collapsed sections, deal terms
- Styling: Tailwind CSS with dark mode
- Icons: lucide-react
- Type safety: Full TypeScript
- Form inputs: Native HTML inputs with onChange handlers
- Build size: ~10.1 kB (gzipped)

## Performance Considerations

- No external API calls in the component (all data pre-calculated)
- Collapsible sections reduce initial DOM rendering
- Tables use native HTML (performant)
- Color calculations done at render time (acceptable)
- No images or heavy assets
- Lighthouse scores expected: Performance 90+, Accessibility 95+

## Testing Checklist

- [ ] Verify all sections render correctly
- [ ] Test collapsible sections
- [ ] Test deal terms calculator
- [ ] Verify color coding matches rules
- [ ] Test mobile responsiveness
- [ ] Test with various statement counts (1, 2, 5 months)
- [ ] Test with/without MCA positions
- [ ] Test revenue variance flagging
- [ ] Test action buttons
- [ ] Verify data accuracy vs. input
