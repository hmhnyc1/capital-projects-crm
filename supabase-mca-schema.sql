-- MCA Platform Schema Extensions

-- Extend contacts with merchant fields
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS business_legal_name text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS dba text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS business_type text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS years_in_business integer;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS monthly_revenue numeric(15,2);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS average_daily_balance numeric(15,2);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS credit_score integer;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ein text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ownership_percentage integer;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS home_address text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS business_address text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ssn_last4 text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS account_type text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS landlord_name text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS monthly_rent numeric(15,2);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS use_of_funds text;

-- Extend deals with MCA fields
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_number text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS advance_amount numeric(15,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS factor_rate numeric(6,4);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS payback_amount numeric(15,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS total_paid numeric(15,2) DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS remaining_balance numeric(15,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS daily_payment numeric(10,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS payment_frequency text DEFAULT 'daily' CHECK (payment_frequency IN ('daily', 'weekly'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS position integer DEFAULT 1;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS origination_date date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS date_uploaded date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS maturity_date date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS mca_status text DEFAULT 'active' CHECK (mca_status IN ('active', 'paid_off', 'defaulted', 'renewed'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS funder_name text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS iso_name text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS commission_rate numeric(5,4);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS risk_score integer DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS risk_grade text CHECK (risk_grade IN ('A', 'B', 'C', 'D', 'E', 'F'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recommended_max_advance numeric(15,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recommended_factor_rate_min numeric(6,4);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recommended_factor_rate_max numeric(6,4);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recommended_term_days integer;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recommended_daily_debit_min numeric(10,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recommended_daily_debit_max numeric(10,2);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  amount numeric(10,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('scheduled', 'completed', 'failed', 'returned', 'nsf')),
  payment_type text DEFAULT 'ach' CHECK (payment_type IN ('ach', 'wire', 'check', 'adjustment')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Bank statements table
CREATE TABLE IF NOT EXISTS bank_statements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  contact_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  statement_month integer CHECK (statement_month BETWEEN 1 AND 12),
  statement_year integer,
  total_deposits numeric(15,2),
  total_withdrawals numeric(15,2),
  average_daily_balance numeric(15,2),
  nsf_count integer DEFAULT 0,
  ending_balance numeric(15,2),
  largest_deposit numeric(15,2),
  transaction_count integer,
  analysis_notes text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Bank transactions table
CREATE TABLE IF NOT EXISTS bank_transactions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  statement_id uuid REFERENCES bank_statements(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_date date,
  description text,
  amount numeric(12,2),
  transaction_type text CHECK (transaction_type IN ('credit', 'debit')),
  balance numeric(12,2),
  is_nsf boolean DEFAULT false,
  category text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Risk flags table
CREATE TABLE IF NOT EXISTS risk_flags (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  severity text NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Underwriting scorecard table
CREATE TABLE IF NOT EXISTS underwriting_scorecards (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  overall_score integer NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  risk_grade text CHECK (risk_grade IN ('A', 'B', 'C', 'D', 'E', 'F')),
  adb_score integer,
  revenue_consistency_score integer,
  nsf_score integer,
  mca_stack_score integer,
  revenue_trend_score integer,
  time_in_business_score integer,
  max_advance_recommended numeric(15,2),
  factor_rate_min numeric(6,4),
  factor_rate_max numeric(6,4),
  term_days_recommended integer,
  daily_debit_min numeric(10,2),
  daily_debit_max numeric(10,2),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- MCA positions table
CREATE TABLE IF NOT EXISTS mca_positions (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  funder_name text NOT NULL,
  daily_debit_amount numeric(10,2),
  first_seen_month text,
  last_seen_month text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Deal documents table
CREATE TABLE IF NOT EXISTS deal_documents (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  document_type text CHECK (document_type IN ('application', 'bank_statement', 'other')),
  file_size integer,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- RLS for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own payments" ON payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS for bank_statements
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own bank statements" ON bank_statements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS for bank_transactions
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own bank transactions" ON bank_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS for risk_flags
ALTER TABLE risk_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own risk flags" ON risk_flags FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS for underwriting_scorecards
ALTER TABLE underwriting_scorecards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own underwriting scorecards" ON underwriting_scorecards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS for mca_positions
ALTER TABLE mca_positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own MCA positions" ON mca_positions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS for deal_documents
ALTER TABLE deal_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own deal documents" ON deal_documents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger for payments
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for underwriting_scorecards
CREATE TRIGGER update_underwriting_scorecards_updated_at BEFORE UPDATE ON underwriting_scorecards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS payments_deal_id_idx ON payments(deal_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id);
CREATE INDEX IF NOT EXISTS payments_date_idx ON payments(payment_date);
CREATE INDEX IF NOT EXISTS bank_statements_contact_id_idx ON bank_statements(contact_id);
CREATE INDEX IF NOT EXISTS bank_transactions_statement_id_idx ON bank_transactions(statement_id);
CREATE INDEX IF NOT EXISTS risk_flags_deal_id_idx ON risk_flags(deal_id);
CREATE INDEX IF NOT EXISTS risk_flags_user_id_idx ON risk_flags(user_id);
CREATE INDEX IF NOT EXISTS underwriting_scorecards_deal_id_idx ON underwriting_scorecards(deal_id);
CREATE INDEX IF NOT EXISTS underwriting_scorecards_user_id_idx ON underwriting_scorecards(user_id);
CREATE INDEX IF NOT EXISTS mca_positions_deal_id_idx ON mca_positions(deal_id);
CREATE INDEX IF NOT EXISTS mca_positions_user_id_idx ON mca_positions(user_id);
CREATE INDEX IF NOT EXISTS deal_documents_deal_id_idx ON deal_documents(deal_id);
CREATE INDEX IF NOT EXISTS deal_documents_user_id_idx ON deal_documents(user_id);
