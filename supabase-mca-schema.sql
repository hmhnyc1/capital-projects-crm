-- MCA Platform Schema Extensions

-- Extend contacts with merchant fields
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
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS dob date;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ssn_last4 text;

-- Extend deals with MCA fields
ALTER TABLE deals ADD COLUMN IF NOT EXISTS advance_amount numeric(15,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS factor_rate numeric(6,4);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS payback_amount numeric(15,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS total_paid numeric(15,2) DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS remaining_balance numeric(15,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS daily_payment numeric(10,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS payment_frequency text DEFAULT 'daily' CHECK (payment_frequency IN ('daily', 'weekly'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS position integer DEFAULT 1;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS origination_date date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS maturity_date date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS mca_status text DEFAULT 'active' CHECK (mca_status IN ('active', 'paid_off', 'defaulted', 'renewed'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS funder_name text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS iso_name text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS commission_rate numeric(5,4);

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

-- RLS for payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own payments" ON payments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS for bank_statements
ALTER TABLE bank_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own bank statements" ON bank_statements FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- RLS for bank_transactions
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own bank transactions" ON bank_transactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger for payments
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS payments_deal_id_idx ON payments(deal_id);
CREATE INDEX IF NOT EXISTS payments_user_id_idx ON payments(user_id);
CREATE INDEX IF NOT EXISTS payments_date_idx ON payments(payment_date);
CREATE INDEX IF NOT EXISTS bank_statements_contact_id_idx ON bank_statements(contact_id);
CREATE INDEX IF NOT EXISTS bank_transactions_statement_id_idx ON bank_transactions(statement_id);
