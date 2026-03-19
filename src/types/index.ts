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
