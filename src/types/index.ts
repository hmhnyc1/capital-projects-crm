export type ContactType = 'lead' | 'contact'
export type ContactStatus = 'active' | 'inactive' | 'qualified' | 'unqualified'
export type DealStage = 'Prospecting' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost'
export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task'
export type MCAStatus = 'active' | 'paid_off' | 'defaulted' | 'renewed'
export type PaymentFrequency = 'daily' | 'weekly'
export type PaymentStatus = 'scheduled' | 'completed' | 'failed' | 'returned' | 'nsf'
export type PaymentType = 'ach' | 'wire' | 'check' | 'adjustment'

export interface Contact {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  company: string | null
  title: string | null
  type: ContactType
  status: ContactStatus
  source: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  notes: string | null
  // MCA / Merchant fields
  business_type: string | null
  industry: string | null
  years_in_business: number | null
  monthly_revenue: number | null
  average_daily_balance: number | null
  credit_score: number | null
  ein: string | null
  owner_name: string | null
  ownership_percentage: number | null
  home_address: string | null
  dob: string | null
  ssn_last4: string | null
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  user_id: string
  title: string
  contact_id: string | null
  value: number | null
  stage: DealStage
  probability: number | null
  expected_close_date: string | null
  description: string | null
  // MCA fields
  advance_amount: number | null
  factor_rate: number | null
  payback_amount: number | null
  total_paid: number | null
  remaining_balance: number | null
  daily_payment: number | null
  payment_frequency: PaymentFrequency | null
  position: number | null
  origination_date: string | null
  maturity_date: string | null
  mca_status: MCAStatus | null
  funder_name: string | null
  iso_name: string | null
  commission_rate: number | null
  created_at: string
  updated_at: string
  contacts?: Contact
}

export interface Activity {
  id: string
  user_id: string
  contact_id: string | null
  deal_id: string | null
  type: ActivityType
  title: string
  content: string | null
  due_date: string | null
  completed: boolean
  created_at: string
  updated_at: string
  contacts?: Contact
  deals?: Deal
}

export interface Payment {
  id: string
  user_id: string
  deal_id: string
  amount: number
  payment_date: string
  status: PaymentStatus
  payment_type: PaymentType
  notes: string | null
  created_at: string
  updated_at: string
  deals?: Deal & { contacts?: Contact }
}

export interface BankStatement {
  id: string
  user_id: string
  contact_id: string
  file_name: string
  statement_month: number | null
  statement_year: number | null
  total_deposits: number | null
  total_withdrawals: number | null
  average_daily_balance: number | null
  nsf_count: number
  ending_balance: number | null
  largest_deposit: number | null
  transaction_count: number | null
  analysis_notes: string | null
  raw_data: unknown | null
  created_at: string
  contacts?: Contact
}

export interface BankTransaction {
  id: string
  statement_id: string
  user_id: string
  transaction_date: string | null
  description: string | null
  amount: number | null
  transaction_type: 'credit' | 'debit' | null
  balance: number | null
  is_nsf: boolean
  category: string | null
  created_at: string
}

// ============================================================================
// PARSED APPLICATION TYPE (from application-parser)
// ============================================================================

export interface ParsedApplication {
  // Business Information
  business_legal_name: string | null
  dba: string | null
  entity_type: string | null
  ein: string | null
  date_established: string | null
  time_in_business_years: number | null
  industry: string | null
  business_address: string | null
  business_city: string | null
  business_state: string | null
  business_zip: string | null
  business_phone: string | null
  business_fax: string | null
  business_email: string | null
  business_website: string | null

  // Financial Information
  monthly_revenue: number | null
  monthly_rent: number | null
  landlord_name: string | null
  landlord_phone: string | null
  use_of_funds: string | null

  // Banking Information
  bank_name: string | null
  bank_account_last4: string | null
  bank_routing: string | null
  average_monthly_balance: number | null
  processor_name: string | null
  monthly_processing_volume: number | null

  // Owner 1 Information
  owner_1_name: string | null
  owner_1_title: string | null
  owner_1_dob: string | null
  owner_1_ssn_last4: string | null
  owner_1_address: string | null
  owner_1_city: string | null
  owner_1_state: string | null
  owner_1_zip: string | null
  owner_1_ownership_pct: number | null
  owner_1_email: string | null
  owner_1_cell: string | null
  owner_1_home_phone: string | null

  // Owner 2 Information
  owner_2_name: string | null
  owner_2_title: string | null
  owner_2_dob: string | null
  owner_2_ssn_last4: string | null
  owner_2_address: string | null
  owner_2_city: string | null
  owner_2_state: string | null
  owner_2_zip: string | null
  owner_2_ownership_pct: number | null
  owner_2_email: string | null
  owner_2_cell: string | null

  // Additional Information
  existing_obligations: string | null
  confidence_score: number
  low_confidence_fields: string[]
  extraction_notes: string
  additional_notes: string | null
}

// ============================================================================
// PARSED BANK STATEMENT TYPES (from bank-statement-parser)
// ============================================================================

export interface ParsedDeposit {
  date: string // YYYY-MM-DD
  description: string
  amount: number
  source_name?: string
}

export interface ParsedWithdrawal {
  date: string // YYYY-MM-DD
  description: string
  amount: number
}

export interface NSFEvent {
  date: string // YYYY-MM-DD
  amount: number
  description: string
  fee_charged: number
}

export interface MCAPosition {
  funder_name: string
  descriptor_matched: string
  amount_per_debit: number
  frequency: string // Daily, Weekly, Monthly
  total_debited_this_month: number
  debit_dates: string[] // YYYY-MM-DD
}

export interface DailyBalance {
  date: string // YYYY-MM-DD
  balance: number
  status: 'OK' | 'LOW' | 'CRITICAL'
}

export interface ParsedBankStatement {
  // Bank identification
  bank_name: string
  account_number_last4: string | null
  routing_number: string | null

  // Statement period
  statement_period_start: string | null // YYYY-MM-DD
  statement_period_end: string | null // YYYY-MM-DD
  statement_month_label: string | null // e.g., "January 2026"
  statement_month?: number // 1-12 (for backwards compatibility)
  statement_year?: number // 4-digit year (for backwards compatibility)

  // Opening and closing balances
  starting_balance: number | null
  ending_balance: number | null

  // Deposit analysis
  total_deposits: number | null
  deposit_count: number | null
  revenue_deposits: ParsedDeposit[]
  non_revenue_deposits: ParsedDeposit[]
  true_revenue_total: number
  non_revenue_total: number

  // Daily balance analysis
  average_daily_balance: number | null
  lowest_daily_balance: number | null
  lowest_balance_date: string | null
  highest_daily_balance: number | null
  highest_balance_date: string | null

  // Days below various thresholds
  days_below_500: number
  days_below_1000: number
  days_below_2000: number

  // Withdrawal analysis
  total_withdrawals: number | null
  withdrawal_count: number | null

  // NSF and overdraft events
  nsf_events: NSFEvent[]
  nsf_count: number
  nsf_total_amount: number

  // MCA position analysis
  mca_positions: MCAPosition[]
  total_mca_holdback: number
  holdback_pct_of_true_revenue: number | null
  holdback_pct_of_total_deposits: number | null

  // Daily balance details
  daily_balances: DailyBalance[]

  // Notable transactions
  largest_single_deposit: ParsedDeposit | null
  largest_single_withdrawal: ParsedWithdrawal | null

  // Cash flow summary
  net_cash_flow: number

  // Quality metrics
  confidence_score: number
  low_confidence_fields: string[]
  parsing_notes: string[]
}

export interface UploadedFile {
  file: File
  type: 'application' | 'bank_statement' | 'unknown'
  parsing: boolean
  parsed: boolean
  error: string | null
  label: string
  data: ParsedApplication | ParsedBankStatement | null
}
