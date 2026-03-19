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

export interface ParsedApplication {
  business_legal_name: string | null
  dba: string | null
  owner_name: string | null
  owner_dob: string | null
  owner_ssn_last4: string | null
  business_address: string | null
  business_phone: string | null
  business_email: string | null
  ein: string | null
  time_in_business_years: number | null
  stated_monthly_revenue: number | null
  bank_name: string | null
  landlord_name: string | null
  monthly_rent: number | null
  use_of_funds: string | null
  co_owners: Array<{ name: string; percentage: number }> | null
}

export interface ParsedBankStatement {
  statement_month: number
  statement_year: number
  starting_balance: number | null
  ending_balance: number | null
  total_deposits: number
  deposit_count: number
  true_revenue_deposits: number
  non_revenue_deposits: number
  average_daily_balance: number | null
  lowest_daily_balance: number | null
  nsf_count: number
  nsf_dates: string[]
  nsf_amounts: number[]
  mca_debits: Array<{
    funder_name: string
    daily_amount: number | null
    weekly_amount: number | null
    frequency: 'daily' | 'weekly'
    total_monthly: number
  }> | null
  total_mca_holdback: number
  holdback_percentage: number
  net_cash_flow_after_mca: number
  days_below_500: number
  days_below_1000: number
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
