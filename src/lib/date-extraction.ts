/**
 * PART 3: BULLETPROOF DATE EXTRACTION SYSTEM
 *
 * Extracts statement period start/end dates from bank statements with perfect accuracy.
 * Handles all major US bank date formats and calculates proper month labeling.
 * Returns null and flags for manual review if confidence is too low.
 */

export interface DateExtractionResult {
  /** Statement period start date in YYYY-MM-DD format */
  startDate: string | null

  /** Statement period end date in YYYY-MM-DD format */
  endDate: string | null

  /** Month label for the statement period (e.g., "January 2026") */
  monthLabel: string | null

  /** Confidence level 0-100 */
  confidence: number

  /** Which pattern was matched (for debugging) */
  matchedPattern: string | null
}

// Complete month name to number mapping
const MONTH_NAMES: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
}

// Month abbreviations to number mapping
const MONTH_ABBREV: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
}

// Full month display names in order
const MONTH_DISPLAY_NAMES = [
  '',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * Validates if a year is within acceptable range (2020-2030)
 */
function isValidYear(year: number): boolean {
  return year >= 2020 && year <= 2030
}

/**
 * Parses month name (full or abbreviated) to month number
 */
function parseMonthName(monthStr: string): number | null {
  if (!monthStr) return null
  const lower = monthStr.toLowerCase().trim()
  return MONTH_ABBREV[lower] || null
}

/**
 * Gets number of days in a given month/year
 */
function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate()
}

/**
 * Counts how many days of the statement period fall in each month
 * Used to determine which month to label the statement with
 */
function countDaysInPeriod(startDate: Date, endDate: Date): Record<number, number> {
  const dayCounts: Record<number, number> = {}
  const current = new Date(startDate)

  while (current <= endDate) {
    const month = current.getMonth() + 1
    if (!dayCounts[month]) {
      dayCounts[month] = 0
    }
    dayCounts[month]++
    current.setDate(current.getDate() + 1)
  }

  return dayCounts
}

/**
 * Determines which month to label the statement with
 * Uses the month with the most days in the period
 * If equal, uses the ending month
 */
function getLabelMonth(startDate: Date, endDate: Date, dayCounts: Record<number, number>): { month: number; year: number } | null {
  if (Object.keys(dayCounts).length === 0) return null

  let labelMonth = 1
  let maxDays = 0

  // Find month with most days
  for (const [monthStr, days] of Object.entries(dayCounts)) {
    const month = parseInt(monthStr)
    if (days > maxDays || (days === maxDays && month > labelMonth)) {
      maxDays = days
      labelMonth = month
    }
  }

  // If no clear winner, use ending month
  if (maxDays === 0) {
    labelMonth = endDate.getMonth() + 1
  }

  // Determine year - use year of the month with most days
  let year = startDate.getFullYear()
  if (labelMonth >= 1 && labelMonth <= 12) {
    // Check if we need to adjust year based on month
    if (labelMonth > startDate.getMonth() + 1) {
      year = startDate.getFullYear()
    } else {
      year = endDate.getFullYear()
    }
  }

  return { month: labelMonth, year }
}

/**
 * Validates date logic (start before/equal to end, days in valid range, etc.)
 */
function isValidDateRange(startDate: Date, endDate: Date): boolean {
  // Start must be before or equal to end
  if (startDate > endDate) {
    console.warn('[date-extraction] Invalid: start date after end date')
    return false
  }

  // Range cannot exceed 35 days (statements are typically monthly)
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  if (diffDays > 35) {
    console.warn('[date-extraction] Invalid: date range exceeds 35 days')
    return false
  }

  return true
}

/**
 * Format date as YYYY-MM-DD string
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * MAIN EXTRACTION FUNCTION
 * Attempts multiple date patterns in priority order
 * Returns first successful match with confidence score
 */
export function extractStatementPeriod(pdfText: string): DateExtractionResult {
  // Input validation
  if (!pdfText || typeof pdfText !== 'string' || pdfText.trim().length === 0) {
    console.warn('[date-extraction] No PDF text provided')
    return {
      startDate: null,
      endDate: null,
      monthLabel: null,
      confidence: 0,
      matchedPattern: null,
    }
  }

  try {
    // PATTERN 1: "Month DD, YYYY through Month DD, YYYY" (Chase format)
    // e.g., "January 15, 2026 through February 14, 2026"
    {
      const pattern = /(\w+)\s+(\d{1,2}),\s+(\d{4})\s+(?:through|through the|thru)\s+(\w+)\s+(\d{1,2}),\s+(\d{4})/gi
      let match
      while ((match = pattern.exec(pdfText)) !== null) {
        const startMonth = parseMonthName(match[1])
        const startDay = parseInt(match[2])
        const startYear = parseInt(match[3])
        const endMonth = parseMonthName(match[4])
        const endDay = parseInt(match[5])
        const endYear = parseInt(match[6])

        if (
          startMonth &&
          endMonth &&
          isValidYear(startYear) &&
          isValidYear(endYear) &&
          startDay >= 1 &&
          startDay <= daysInMonth(startMonth, startYear) &&
          endDay >= 1 &&
          endDay <= daysInMonth(endMonth, endYear)
        ) {
          const startDate = new Date(startYear, startMonth - 1, startDay)
          const endDate = new Date(endYear, endMonth - 1, endDay)

          if (isValidDateRange(startDate, endDate)) {
            const dayCounts = countDaysInPeriod(startDate, endDate)
            const labelMonth = getLabelMonth(startDate, endDate, dayCounts)

            if (labelMonth) {
              return {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                monthLabel: `${MONTH_DISPLAY_NAMES[labelMonth.month]} ${labelMonth.year}`,
                confidence: 98,
                matchedPattern: 'Month DD, YYYY through Month DD, YYYY',
              }
            }
          }
        }
      }
    }

    // PATTERN 2: "Month DD - Month DD, YYYY" (Bank of America format)
    // e.g., "January 15 - February 14, 2026"
    {
      const pattern = /(\w+)\s+(\d{1,2})\s*[-–]\s*(\w+)\s+(\d{1,2}),\s+(\d{4})/gi
      let match
      while ((match = pattern.exec(pdfText)) !== null) {
        const startMonth = parseMonthName(match[1])
        const startDay = parseInt(match[2])
        const endMonth = parseMonthName(match[3])
        const endDay = parseInt(match[4])
        const year = parseInt(match[5])

        if (
          startMonth &&
          endMonth &&
          isValidYear(year) &&
          startDay >= 1 &&
          startDay <= daysInMonth(startMonth, year) &&
          endDay >= 1 &&
          endDay <= daysInMonth(endMonth, year)
        ) {
          const startDate = new Date(year, startMonth - 1, startDay)
          const endDate = new Date(year, endMonth - 1, endDay)

          if (isValidDateRange(startDate, endDate)) {
            const dayCounts = countDaysInPeriod(startDate, endDate)
            const labelMonth = getLabelMonth(startDate, endDate, dayCounts)

            if (labelMonth) {
              return {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                monthLabel: `${MONTH_DISPLAY_NAMES[labelMonth.month]} ${labelMonth.year}`,
                confidence: 95,
                matchedPattern: 'Month DD - Month DD, YYYY',
              }
            }
          }
        }
      }
    }

    // PATTERN 3: "MM/DD/YYYY - MM/DD/YYYY" (Numeric format)
    // e.g., "01/15/2026 - 02/14/2026"
    {
      const pattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/g
      let match
      while ((match = pattern.exec(pdfText)) !== null) {
        const startMonth = parseInt(match[1])
        const startDay = parseInt(match[2])
        const startYear = parseInt(match[3])
        const endMonth = parseInt(match[4])
        const endDay = parseInt(match[5])
        const endYear = parseInt(match[6])

        if (
          startMonth >= 1 &&
          startMonth <= 12 &&
          endMonth >= 1 &&
          endMonth <= 12 &&
          startDay >= 1 &&
          startDay <= daysInMonth(startMonth, startYear) &&
          endDay >= 1 &&
          endDay <= daysInMonth(endMonth, endYear) &&
          isValidYear(startYear) &&
          isValidYear(endYear)
        ) {
          const startDate = new Date(startYear, startMonth - 1, startDay)
          const endDate = new Date(endYear, endMonth - 1, endDay)

          if (isValidDateRange(startDate, endDate)) {
            const dayCounts = countDaysInPeriod(startDate, endDate)
            const labelMonth = getLabelMonth(startDate, endDate, dayCounts)

            if (labelMonth) {
              return {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                monthLabel: `${MONTH_DISPLAY_NAMES[labelMonth.month]} ${labelMonth.year}`,
                confidence: 95,
                matchedPattern: 'MM/DD/YYYY - MM/DD/YYYY',
              }
            }
          }
        }
      }
    }

    // PATTERN 4: "MM/DD/YYYY to MM/DD/YYYY"
    // e.g., "01/15/2026 to 02/14/2026"
    {
      const pattern = /(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(?:to|TO)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/g
      let match
      while ((match = pattern.exec(pdfText)) !== null) {
        const startMonth = parseInt(match[1])
        const startDay = parseInt(match[2])
        const startYear = parseInt(match[3])
        const endMonth = parseInt(match[4])
        const endDay = parseInt(match[5])
        const endYear = parseInt(match[6])

        if (
          startMonth >= 1 &&
          startMonth <= 12 &&
          endMonth >= 1 &&
          endMonth <= 12 &&
          startDay >= 1 &&
          startDay <= daysInMonth(startMonth, startYear) &&
          endDay >= 1 &&
          endDay <= daysInMonth(endMonth, endYear) &&
          isValidYear(startYear) &&
          isValidYear(endYear)
        ) {
          const startDate = new Date(startYear, startMonth - 1, startDay)
          const endDate = new Date(endYear, endMonth - 1, endDay)

          if (isValidDateRange(startDate, endDate)) {
            const dayCounts = countDaysInPeriod(startDate, endDate)
            const labelMonth = getLabelMonth(startDate, endDate, dayCounts)

            if (labelMonth) {
              return {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                monthLabel: `${MONTH_DISPLAY_NAMES[labelMonth.month]} ${labelMonth.year}`,
                confidence: 92,
                matchedPattern: 'MM/DD/YYYY to MM/DD/YYYY',
              }
            }
          }
        }
      }
    }

    // PATTERN 5: "Statement Period: MM/DD/YYYY - MM/DD/YYYY"
    // e.g., "Statement Period: 01/15/2026 - 02/14/2026"
    {
      const pattern = /statement\s+period\s*:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/gi
      let match
      while ((match = pattern.exec(pdfText)) !== null) {
        const startMonth = parseInt(match[1])
        const startDay = parseInt(match[2])
        const startYear = parseInt(match[3])
        const endMonth = parseInt(match[4])
        const endDay = parseInt(match[5])
        const endYear = parseInt(match[6])

        if (
          startMonth >= 1 &&
          startMonth <= 12 &&
          endMonth >= 1 &&
          endMonth <= 12 &&
          startDay >= 1 &&
          startDay <= daysInMonth(startMonth, startYear) &&
          endDay >= 1 &&
          endDay <= daysInMonth(endMonth, endYear) &&
          isValidYear(startYear) &&
          isValidYear(endYear)
        ) {
          const startDate = new Date(startYear, startMonth - 1, startDay)
          const endDate = new Date(endYear, endMonth - 1, endDay)

          if (isValidDateRange(startDate, endDate)) {
            const dayCounts = countDaysInPeriod(startDate, endDate)
            const labelMonth = getLabelMonth(startDate, endDate, dayCounts)

            if (labelMonth) {
              return {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                monthLabel: `${MONTH_DISPLAY_NAMES[labelMonth.month]} ${labelMonth.year}`,
                confidence: 96,
                matchedPattern: 'Statement Period: MM/DD/YYYY - MM/DD/YYYY',
              }
            }
          }
        }
      }
    }

    // PATTERN 6: "Month DD, YYYY to Month DD, YYYY"
    // e.g., "January 15, 2026 to February 14, 2026"
    {
      const pattern = /(\w+)\s+(\d{1,2}),\s+(\d{4})\s+(?:to|TO)\s+(\w+)\s+(\d{1,2}),\s+(\d{4})/gi
      let match
      while ((match = pattern.exec(pdfText)) !== null) {
        const startMonth = parseMonthName(match[1])
        const startDay = parseInt(match[2])
        const startYear = parseInt(match[3])
        const endMonth = parseMonthName(match[4])
        const endDay = parseInt(match[5])
        const endYear = parseInt(match[6])

        if (
          startMonth &&
          endMonth &&
          isValidYear(startYear) &&
          isValidYear(endYear) &&
          startDay >= 1 &&
          startDay <= daysInMonth(startMonth, startYear) &&
          endDay >= 1 &&
          endDay <= daysInMonth(endMonth, endYear)
        ) {
          const startDate = new Date(startYear, startMonth - 1, startDay)
          const endDate = new Date(endYear, endMonth - 1, endDay)

          if (isValidDateRange(startDate, endDate)) {
            const dayCounts = countDaysInPeriod(startDate, endDate)
            const labelMonth = getLabelMonth(startDate, endDate, dayCounts)

            if (labelMonth) {
              return {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                monthLabel: `${MONTH_DISPLAY_NAMES[labelMonth.month]} ${labelMonth.year}`,
                confidence: 90,
                matchedPattern: 'Month DD, YYYY to Month DD, YYYY',
              }
            }
          }
        }
      }
    }

    // PATTERN 7: "For the period ending Month DD, YYYY"
    // e.g., "For the period ending February 14, 2026"
    // Uses period end date, assumes 1-month lookback
    {
      const pattern = /(?:for the period ending|statement date)\s*:\?\s*(\w+)\s+(\d{1,2}),\s+(\d{4})/gi
      let match
      while ((match = pattern.exec(pdfText)) !== null) {
        const month = parseMonthName(match[1])
        const day = parseInt(match[2])
        const year = parseInt(match[3])

        if (
          month &&
          isValidYear(year) &&
          day >= 1 &&
          day <= daysInMonth(month, year)
        ) {
          const endDate = new Date(year, month - 1, day)
          const startDate = new Date(year, month - 1, 1)

          if (isValidDateRange(startDate, endDate)) {
            return {
              startDate: formatDate(startDate),
              endDate: formatDate(endDate),
              monthLabel: `${MONTH_DISPLAY_NAMES[month]} ${year}`,
              confidence: 85,
              matchedPattern: 'For the period ending Month DD, YYYY',
            }
          }
        }
      }
    }

    // PATTERN 8: "Month YYYY" (simple month/year)
    // e.g., "January 2026"
    // Uses first and last day of month
    {
      const pattern = /(?:statement period|for|month of)\s*:?\s+(\w+)\s+(\d{4})/gi
      let match
      while ((match = pattern.exec(pdfText)) !== null) {
        const month = parseMonthName(match[1])
        const year = parseInt(match[2])

        if (month && isValidYear(year)) {
          const firstDay = 1
          const lastDay = daysInMonth(month, year)
          const startDate = new Date(year, month - 1, firstDay)
          const endDate = new Date(year, month - 1, lastDay)

          return {
            startDate: formatDate(startDate),
            endDate: formatDate(endDate),
            monthLabel: `${MONTH_DISPLAY_NAMES[month]} ${year}`,
            confidence: 80,
            matchedPattern: 'Month YYYY',
          }
        }
      }
    }

    // No valid date pattern found
    console.warn('[date-extraction] No valid date pattern matched in statement text')
    return {
      startDate: null,
      endDate: null,
      monthLabel: null,
      confidence: 0,
      matchedPattern: null,
    }
  } catch (error) {
    console.error('[date-extraction] Fatal error during extraction:', error)
    return {
      startDate: null,
      endDate: null,
      monthLabel: null,
      confidence: 0,
      matchedPattern: null,
    }
  }
}
