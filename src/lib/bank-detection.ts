/**
 * PART 1: BANK DETECTION SYSTEM
 *
 * Identifies which bank a statement is from BEFORE parsing it.
 * Uses multiple detection methods (bank name, routing number, account format, statement format)
 * with confidence scoring to reliably identify the issuing bank.
 */

export interface BankProfile {
  /** Display name of the bank */
  bankName: string

  /** Array of regex patterns to detect statement period format for this bank */
  statementPeriodPatterns: RegExp[]

  /** Common labels used by this bank for deposit/credit sections */
  depositSectionLabels: string[]

  /** Common labels used by this bank for withdrawal/debit sections */
  withdrawalSectionLabels: string[]

  /** Common labels used by this bank for daily balance information */
  dailyBalanceLabels: string[]

  /** How this bank labels NSF/insufficient funds events */
  nsfLabels: string[]

  /** Regex pattern for how account numbers appear (for detection, not extraction) */
  accountNumberPattern: RegExp

  /** Array of routing numbers used by this bank */
  routingNumbers: string[]

  /** Notable formatting quirks or features of this bank's statements */
  quirks: string[]

  /** Bank's primary website domain for verification */
  website?: string
}

export interface BankDetectionResult {
  /** Name of detected bank */
  bankName: string

  /** Confidence level 0-100. Below 70 is flagged for manual review */
  confidence: number

  /** Detected routing number if found */
  routingNumber?: string

  /** The bank profile if detected with confidence >= 70 */
  profile?: BankProfile
}

/**
 * Complete bank profile database for all major US banks
 * Each bank has comprehensive patterns for detection
 */
const BANK_PROFILES: Record<string, BankProfile> = {
  'JPMorgan Chase': {
    bankName: 'JPMorgan Chase',
    statementPeriodPatterns: [
      // "January 15, 2026 through February 14, 2026"
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}\s+(?:through|through the)\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      // "01/15/2026 - 02/14/2026"
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[\-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
      // "STATEMENT PERIOD: 01/15/2026 TO 02/14/2026"
      /STATEMENT\s+PERIOD[:\s]+(.*?)TO/gi,
    ],
    depositSectionLabels: [
      'DEPOSITS AND ADDITIONS',
      'DEPOSITS AND CREDITS',
      'DEPOSITS',
      'ACH DEPOSITS',
      'DEPOSITS - CREDITS',
      'Credits',
    ],
    withdrawalSectionLabels: [
      'WITHDRAWALS AND SUBTRACTIONS',
      'CHECKS AND WITHDRAWALS',
      'WITHDRAWALS',
      'ACH DEBITS',
      'WITHDRAWALS - DEBITS',
      'Debits',
      'CHECKS',
    ],
    dailyBalanceLabels: [
      'DAILY BALANCE',
      'ENDING BALANCE',
      'DAILY ENDING BALANCE',
      'CLOSING BALANCE',
    ],
    nsfLabels: [
      'RETURNED ITEM',
      'NSF',
      'INSUFFICIENT FUNDS',
      'NONSUFFICIENT FUNDS',
      'RETURNED ITEMS',
    ],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['021000021', '011000015'],
    quirks: [
      'Uses "through" for date ranges in header',
      'Daily balances appear at end of statement',
      'May have multiple account summaries on one page',
      'Check number shown in parentheses in description',
      'ACH descriptions include full 16-digit routing/account identifiers',
    ],
    website: 'chase.com',
  },

  'Bank of America': {
    bankName: 'Bank of America',
    statementPeriodPatterns: [
      // "January 15 - February 14, 2026"
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      // "01/15/2026 - 02/14/2026"
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
      // "Statement Date: 02/14/2026" (single date)
      /Statement\s+Date[:\s]+(.*?)(?:\n|$)/gi,
    ],
    depositSectionLabels: [
      'DEPOSITS',
      'DEPOSITS AND CREDITS',
      'DEPOSITS AND ADDITIONS',
      'CREDITS',
      'ACH CREDITS',
    ],
    withdrawalSectionLabels: [
      'WITHDRAWALS',
      'CHECKS AND WITHDRAWALS',
      'WITHDRAWALS AND DEBITS',
      'DEBITS',
      'ACH DEBITS',
    ],
    dailyBalanceLabels: [
      'BALANCE',
      'DAILY BALANCE',
      'ENDING BALANCE',
      'CLOSING BALANCE',
    ],
    nsfLabels: [
      'INSUFFICIENT FUNDS',
      'NON-SUFFICIENT FUNDS',
      'NSF',
      'RETURNED CHECKS',
      'RETURNED ITEMS',
    ],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['026009593', '026012881'],
    quirks: [
      'Often shows account summary section at top',
      'May intermix deposits and withdrawals in chronological order',
      'Check number shown in separate field',
      'Bold headers for each section',
      'Merrill and Preferred Rewards accounts use same routing',
    ],
    website: 'bankofamerica.com',
  },

  'Wells Fargo': {
    bankName: 'Wells Fargo',
    statementPeriodPatterns: [
      // "January 15 - February 14, 2026"
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      // "01/15/2026 - 02/14/2026"
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
      // "Statement Period" header
      /Statement\s+Period.*?(\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4})/gi,
    ],
    depositSectionLabels: [
      'DEPOSITS',
      'DEPOSITS AND ADDITIONS',
      'ACH DEPOSITS AND CREDITS',
      'CREDITS',
    ],
    withdrawalSectionLabels: [
      'CHECKS',
      'WITHDRAWALS AND DEDUCTIONS',
      'ACH DEBITS',
      'OTHER DEDUCTIONS',
      'ELECTRONIC WITHDRAWALS',
    ],
    dailyBalanceLabels: [
      'BALANCE',
      'DAILY BALANCE',
      'ENDING BALANCE',
      'DAILY CLOSING BALANCE',
    ],
    nsfLabels: [
      'RETURNED CHECK',
      'NSF',
      'INSUFFICIENT FUNDS',
      'RETURNED ITEMS',
      'INSUFFICIENT FUNDS FEE',
    ],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['121000248'],
    quirks: [
      'Often displays as "WFDS" (Wells Fargo Business Services)',
      'Separate sections for checks, ACH debits, and electronic transactions',
      'Has dedicated daily balance table at statement end',
      'Long descriptive text in transaction lines',
      'May show "Available Balance" vs "Current Balance"',
    ],
    website: 'wellsfargo.com',
  },

  'Citibank': {
    bankName: 'Citibank',
    statementPeriodPatterns: [
      // "January 15 - February 14, 2026"
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      // "01/15/2026 - 02/14/2026"
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
      // "Citi" or "Citi Business"
      /Statement\s+Period.*?(\d{1,2}\/\d{1,2}\/\d{4})/gi,
    ],
    depositSectionLabels: [
      'DEPOSITS',
      'DEPOSITS AND CREDITS',
      'ACH DEPOSITS',
      'CREDITS',
    ],
    withdrawalSectionLabels: [
      'WITHDRAWALS',
      'CHECKS AND WITHDRAWALS',
      'ACH DEBITS',
      'ELECTRONIC TRANSACTIONS',
      'DEBITS',
    ],
    dailyBalanceLabels: [
      'BALANCE',
      'DAILY BALANCE',
      'ENDING BALANCE',
    ],
    nsfLabels: [
      'RETURNED ITEM',
      'NSF',
      'INSUFFICIENT FUNDS',
      'OVERDRAFT ITEM',
    ],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['021000089', '021000166'],
    quirks: [
      'May show summary page at top',
      'Often labeled "Citibank Business" or "Citi Business"',
      'Clean formatting with section headers',
      'Sometimes shows detailed posting dates separate from transaction dates',
    ],
  },

  'TD Bank': {
    bankName: 'TD Bank',
    statementPeriodPatterns: [
      // "January 15 - February 14, 2026"
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      // "01/15/2026 - 02/14/2026"
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: [
      'DEPOSITS',
      'DEPOSITS AND CREDITS',
      'ACH CREDITS',
      'CREDITS',
    ],
    withdrawalSectionLabels: [
      'WITHDRAWALS',
      'CHECKS AND WITHDRAWALS',
      'ACH DEBITS',
      'DEBITS',
    ],
    dailyBalanceLabels: [
      'BALANCE',
      'DAILY BALANCE',
      'ENDING BALANCE',
    ],
    nsfLabels: [
      'RETURNED ITEM',
      'NSF',
      'INSUFFICIENT FUNDS',
    ],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['031000503', '021000091'],
    quirks: [
      'Often displays as "TD Bank, N.A." or "TD Bank" in header',
      'Statements often span multiple pages',
      'May show both checking and savings accounts on single statement',
    ],
  },

  'Capital One': {
    bankName: 'Capital One',
    statementPeriodPatterns: [
      // "January 15 - February 14, 2026"
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      // "01/15/2026 - 02/14/2026"
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: [
      'DEPOSITS',
      'CREDITS',
      'DEPOSITS AND CREDITS',
    ],
    withdrawalSectionLabels: [
      'WITHDRAWALS',
      'DEBITS',
      'WITHDRAWALS AND DEBITS',
    ],
    dailyBalanceLabels: [
      'BALANCE',
      'DAILY BALANCE',
      'ENDING BALANCE',
    ],
    nsfLabels: [
      'INSUFFICIENT FUNDS',
      'NSF',
      'RETURNED ITEM',
      'INSUFFICIENT FUNDS FEE',
    ],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['051000017'],
    quirks: [
      'May show as "Capital One Business" or "Spark Business"',
      'Often provides executive summary section',
      'Clear transaction categorization',
    ],
  },

  'PNC Bank': {
    bankName: 'PNC Bank',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS', 'DEPOSITS AND CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS', 'CHECKS AND WITHDRAWALS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE', 'ENDING BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF', 'INSUFFICIENT FUNDS'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['043000096'],
    quirks: ['Often shows as "PNC Bank" or "PNC Business"', 'Different formatting for business vs consumer accounts'],
  },

  'US Bank': {
    bankName: 'US Bank',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS', 'DEPOSITS AND CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS', 'CHECKS AND DEBITS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE', 'ENDING BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF', 'INSUFFICIENT FUNDS'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['031000503'],
    quirks: ['May display as "U.S. Bank" or "US Bank"', 'Often provides account summary'],
  },

  'Regions Bank': {
    bankName: 'Regions Bank',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['061000052'],
    quirks: ['Shows as "Regions Bank" or "Regions Financial"'],
  },

  'Truist': {
    bankName: 'Truist',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['054000030'],
    quirks: ['Formerly BB&T or SunTrust before 2019 merger', 'May show legacy or new branding'],
  },

  'Fifth Third Bank': {
    bankName: 'Fifth Third Bank',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['042000013'],
    quirks: ['Often abbreviated as "53"', 'May show as "Fifth Third Bank"'],
  },

  'KeyBank': {
    bankName: 'KeyBank',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['021001039'],
    quirks: ['May show as "KeyBank" or "Key Business"'],
  },

  'Huntington Bank': {
    bankName: 'Huntington Bank',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['041000024'],
    quirks: ['May show as "Huntington Bank" or "Huntington Business"'],
  },

  'Citizens Bank': {
    bankName: 'Citizens Bank',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['021200025', '021300077'],
    quirks: ['May show as "Citizens Bank" or "Citizens Business"'],
  },

  'BMO Harris': {
    bankName: 'BMO Harris',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['071000013'],
    quirks: ['Often labeled "BMO Harris" or just "BMO"'],
  },

  'Comerica': {
    bankName: 'Comerica Bank',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['021000093'],
    quirks: ['Often labeled "Comerica Bank"'],
  },

  'Valley National Bank': {
    bankName: 'Valley National Bank',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['026013576'],
    quirks: ['May show as "Valley National Bank" or "Valley Bank"'],
  },

  'Bluevine': {
    bankName: 'Bluevine',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['021000012'],
    quirks: ['Online bank - modern statement formatting', 'Clean, digital-native design'],
  },

  'Mercury': {
    bankName: 'Mercury',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['021000012'],
    quirks: ['Fintech bank - modern formatting', 'May show as "Mercury Business"'],
  },

  'Novo': {
    bankName: 'Novo',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['011000138'],
    quirks: ['Fintech bank - modern formatting', 'May show as "Novo Business"'],
  },

  'Axos Bank': {
    bankName: 'Axos Bank',
    statementPeriodPatterns: [
      /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\s*[-–]\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/gi,
      /\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4}/g,
    ],
    depositSectionLabels: ['DEPOSITS', 'CREDITS'],
    withdrawalSectionLabels: ['WITHDRAWALS', 'DEBITS'],
    dailyBalanceLabels: ['BALANCE', 'DAILY BALANCE'],
    nsfLabels: ['RETURNED ITEM', 'NSF'],
    accountNumberPattern: /\d{10,16}/,
    routingNumbers: ['121202211'],
    quirks: ['Online bank - digital statement', 'May show as "Axos Bank" or "Axos Business"'],
  },
}

/**
 * Detects which bank issued a statement by analyzing PDF text
 * Uses multiple detection methods with confidence scoring
 *
 * @param pdfText - Raw text extracted from the PDF statement
 * @returns BankDetectionResult with bank name and confidence score
 *
 * Detection strategy:
 * 1. Look for explicit bank name mentions (30 points)
 * 2. Look for routing number patterns (40 points)
 * 3. Look for account number format patterns (15 points)
 * 4. Look for statement period format patterns (15 points)
 * Total: 100 points max, 70+ is confident detection
 */
export function detectBank(pdfText: string): BankDetectionResult {
  // Input validation
  if (!pdfText || typeof pdfText !== 'string' || pdfText.trim().length === 0) {
    console.warn('[bank-detection] No PDF text provided for bank detection')
    const result = {
      bankName: 'Unknown Bank',
      confidence: 0,
    }
    return JSON.parse(JSON.stringify(result))
  }

  // Extract first 3000 characters for analysis (enough to get bank identifiers)
  const textSnippet = pdfText.substring(0, 3000).toUpperCase()

  let highestConfidence = 0
  let detectedBank: BankDetectionResult = {
    bankName: 'Unknown Bank',
    confidence: 0,
  }

  try {
    // Check each bank profile
    for (const [bankKey, profile] of Object.entries(BANK_PROFILES)) {
      let confidence = 0

      // METHOD 1: Look for bank name mentions (30 points max)
      const bankNamePattern = new RegExp(`\\b${bankKey.toUpperCase()}\\b`, 'i')
      if (bankNamePattern.test(pdfText)) {
        confidence += 30
      } else {
        // Check common abbreviations/variations
        const abbreviationPatterns = [
          bankKey.split(' ')[0].toUpperCase(), // First word
          ...profile.quirks
            .filter(q => q.length < 20) // Short quirk strings likely to be names/abbreviations
            .map(q => q.toUpperCase()),
        ]

        for (const abbrev of abbreviationPatterns) {
          if (textSnippet.includes(abbrev)) {
            confidence += 15
            break
          }
        }
      }

      // METHOD 2: Look for routing numbers (40 points max)
      for (const routingNum of profile.routingNumbers) {
        if (textSnippet.includes(routingNum)) {
          confidence += 40
          detectedBank.routingNumber = routingNum
          break
        }
      }

      // METHOD 3: Look for account number format patterns (15 points max)
      const accountMatches = pdfText.match(profile.accountNumberPattern)
      if (accountMatches && accountMatches.length > 0) {
        // Only count if we found multiple account numbers (not just checking for any digits)
        const uniqueMatches = new Set(accountMatches)
        if (uniqueMatches.size >= 2) {
          confidence += 15
        }
      }

      // METHOD 4: Look for statement period format patterns (15 points max)
      for (const pattern of profile.statementPeriodPatterns) {
        if (pattern.test(pdfText)) {
          confidence += 15
          break
        }
      }

      // Cap confidence at 100
      confidence = Math.min(confidence, 100)

      // Track highest confidence detection
      if (confidence > highestConfidence) {
        highestConfidence = confidence
        detectedBank = {
          bankName: bankKey,
          confidence,
          routingNumber: detectedBank.routingNumber,
          profile,
        }
      }
    }
  } catch (error) {
    console.error('[bank-detection] Error during bank detection:', error)
    // Return unknown bank on error
    const result = {
      bankName: 'Unknown Bank',
      confidence: 0,
    }
    return JSON.parse(JSON.stringify(result))
  }

  // Flag low-confidence detections
  if (highestConfidence < 70) {
    console.warn(`[bank-detection] Low confidence detection: ${detectedBank.bankName} (${highestConfidence}%) - flagging for manual review`)
    const result = {
      bankName: 'Unknown Bank',
      confidence: 0,
    }
    return JSON.parse(JSON.stringify(result))
  }

  console.log(`[bank-detection] Detected: ${detectedBank.bankName} with ${highestConfidence}% confidence`)
  // Serialize to remove RegExp objects from profile before returning
  return JSON.parse(JSON.stringify(detectedBank))
}
