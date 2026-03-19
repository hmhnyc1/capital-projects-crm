-- Temporary parsing job tracking - stores references to parsed data before deal creation
CREATE TABLE IF NOT EXISTS parsing_jobs (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  job_id text UNIQUE NOT NULL,  -- Human-readable ID for frontend reference
  status text DEFAULT 'parsing' CHECK (status IN ('parsing', 'parsed', 'creating', 'completed', 'failed')),
  error_message text,
  created_at timestamp DEFAULT now(),
  expires_at timestamp DEFAULT (now() + interval '1 hour'),  -- Auto-cleanup after 1 hour

  -- References to saved parsed data
  application_id uuid REFERENCES temp_parsed_applications(id) ON DELETE CASCADE,
  bank_statement_ids uuid[],  -- Array of references to temp_parsed_bank_statements

  -- Deal creation params stored here
  advance_amount numeric(15,2),
  factor_rate numeric(6,4),
  term_days integer,
  deal_position text CHECK (deal_position IN ('approved', 'declined', 'counter', 'review'))
);

CREATE INDEX IF NOT EXISTS idx_parsing_jobs_user_id ON parsing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_parsing_jobs_job_id ON parsing_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_parsing_jobs_expires_at ON parsing_jobs(expires_at);

-- Temporary parsed application data
CREATE TABLE IF NOT EXISTS temp_parsed_applications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp DEFAULT now(),
  expires_at timestamp DEFAULT (now() + interval '1 hour'),

  -- All application fields
  business_legal_name text,
  dba text,
  owner_name text,
  owner_dob date,
  owner_ssn_last4 text,
  business_address text,
  business_phone text,
  business_email text,
  ein text,
  entity_type text,
  ownership_percentage integer,
  industry text,
  stated_monthly_revenue numeric(15,2),
  bank_name text,
  account_type text,
  landlord_name text,
  monthly_rent numeric(15,2),
  use_of_funds text,
  time_in_business_years integer
);

CREATE INDEX IF NOT EXISTS idx_temp_parsed_applications_user_id ON temp_parsed_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_temp_parsed_applications_expires_at ON temp_parsed_applications(expires_at);

-- Temporary parsed bank statement data
CREATE TABLE IF NOT EXISTS temp_parsed_bank_statements (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp DEFAULT now(),
  expires_at timestamp DEFAULT (now() + interval '1 hour'),

  -- Statement identification
  statement_period_text text,
  statement_month integer,
  statement_year integer,
  statement_start_date date,
  statement_end_date date,

  -- Balance data
  starting_balance numeric(15,2),
  ending_balance numeric(15,2),
  average_daily_balance numeric(15,2),
  lowest_daily_balance numeric(15,2),

  -- Deposit data
  total_deposits numeric(15,2),
  true_revenue_deposits numeric(15,2),
  non_revenue_deposits numeric(15,2),

  -- NSF data
  nsf_count integer,
  nsf_dates date[],
  nsf_amounts numeric(15,2)[],

  -- MCA data
  mca_debits jsonb,  -- Array of {funder_name, daily_debit_amount, ...}
  total_mca_holdback numeric(15,2),
  holdback_percentage numeric(5,2),
  net_cash_flow_after_mca numeric(15,2),

  -- Additional metrics
  days_below_500 integer,
  days_below_1000 integer
);

CREATE INDEX IF NOT EXISTS idx_temp_parsed_bank_statements_user_id ON temp_parsed_bank_statements(user_id);
CREATE INDEX IF NOT EXISTS idx_temp_parsed_bank_statements_expires_at ON temp_parsed_bank_statements(expires_at);

-- Enable RLS on all temp tables
ALTER TABLE parsing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_parsed_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_parsed_bank_statements ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only see their own data
CREATE POLICY "Users can view own parsing jobs" ON parsing_jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own parsing jobs" ON parsing_jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own parsing jobs" ON parsing_jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own temp applications" ON temp_parsed_applications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own temp applications" ON temp_parsed_applications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own temp bank statements" ON temp_parsed_bank_statements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own temp bank statements" ON temp_parsed_bank_statements
  FOR INSERT WITH CHECK (auth.uid() = user_id);
