-- Bank Statements Detail Table
CREATE TABLE IF NOT EXISTS bank_statements_detailed (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  merchant_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  statement_month integer NOT NULL,
  statement_year integer NOT NULL,
  statement_period_start date,
  statement_period_end date,
  starting_balance numeric(15,2),
  ending_balance numeric(15,2),
  total_deposits numeric(15,2),
  true_revenue numeric(15,2),
  non_revenue_deposits numeric(15,2),
  average_daily_balance numeric(15,2),
  lowest_daily_balance numeric(15,2),
  days_below_500 integer,
  days_below_1000 integer,
  nsf_count integer,
  nsf_dates date[],
  nsf_amounts numeric(15,2)[],
  nsf_total numeric(15,2),
  total_mca_holdback numeric(15,2),
  holdback_percentage numeric(5,2),
  net_cash_flow numeric(15,2),
  model_used text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_statements_detailed_deal_id ON bank_statements_detailed(deal_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_detailed_merchant_id ON bank_statements_detailed(merchant_id);
CREATE INDEX IF NOT EXISTS idx_bank_statements_detailed_user_id ON bank_statements_detailed(user_id);

-- MCA Positions Detail Table
CREATE TABLE IF NOT EXISTS mca_positions_detailed (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  merchant_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  funder_name text NOT NULL,
  daily_debit_amount numeric(15,2),
  weekly_amount numeric(15,2),
  monthly_total numeric(15,2),
  first_seen_month text,
  last_seen_month text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'paid_off')),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mca_positions_detailed_deal_id ON mca_positions_detailed(deal_id);
CREATE INDEX IF NOT EXISTS idx_mca_positions_detailed_merchant_id ON mca_positions_detailed(merchant_id);
CREATE INDEX IF NOT EXISTS idx_mca_positions_detailed_user_id ON mca_positions_detailed(user_id);

-- Underwriting Scorecards Detail Table
CREATE TABLE IF NOT EXISTS underwriting_scorecards_detailed (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  overall_score numeric(5,2),
  risk_grade text CHECK (risk_grade IN ('A', 'B', 'C', 'D', 'E', 'F')),
  adb_score numeric(5,2),
  adb_value numeric(15,2),
  revenue_consistency_score numeric(5,2),
  nsf_score numeric(5,2),
  nsf_count integer,
  mca_stack_score numeric(5,2),
  holdback_percentage numeric(5,2),
  revenue_trend_score numeric(5,2),
  revenue_trend_direction text CHECK (revenue_trend_direction IN ('Growing', 'Declining', 'Flat')),
  revenue_trend_percentage numeric(10,2),
  time_in_business_score numeric(5,2),
  stated_vs_actual_score numeric(5,2),
  stated_revenue numeric(15,2),
  actual_revenue numeric(15,2),
  revenue_variance_percentage numeric(10,2),
  recommended_max_advance numeric(15,2),
  recommended_factor_rate_min numeric(6,4),
  recommended_factor_rate_max numeric(6,4),
  recommended_term_days integer,
  recommended_daily_debit numeric(15,2),
  recommended_position text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_underwriting_scorecards_detailed_deal_id ON underwriting_scorecards_detailed(deal_id);
CREATE INDEX IF NOT EXISTS idx_underwriting_scorecards_detailed_user_id ON underwriting_scorecards_detailed(user_id);

-- Risk Flags Detail Table
CREATE TABLE IF NOT EXISTS risk_flags_detailed (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  flag_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  description text,
  value_that_triggered_it text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_flags_detailed_deal_id ON risk_flags_detailed(deal_id);
CREATE INDEX IF NOT EXISTS idx_risk_flags_detailed_user_id ON risk_flags_detailed(user_id);

-- Documents Detail Table
CREATE TABLE IF NOT EXISTS documents_detailed (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  merchant_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  document_type text NOT NULL CHECK (document_type IN ('application', 'bank_statement')),
  storage_path text NOT NULL,
  model_used text,
  uploaded_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_detailed_deal_id ON documents_detailed(deal_id);
CREATE INDEX IF NOT EXISTS idx_documents_detailed_merchant_id ON documents_detailed(merchant_id);
CREATE INDEX IF NOT EXISTS idx_documents_detailed_user_id ON documents_detailed(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_detailed_document_type ON documents_detailed(document_type);

-- Enable RLS on all detail tables
ALTER TABLE bank_statements_detailed ENABLE ROW LEVEL SECURITY;
ALTER TABLE mca_positions_detailed ENABLE ROW LEVEL SECURITY;
ALTER TABLE underwriting_scorecards_detailed ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_flags_detailed ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents_detailed ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bank_statements_detailed
CREATE POLICY "Users can view own bank statements" ON bank_statements_detailed
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank statements" ON bank_statements_detailed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for mca_positions_detailed
CREATE POLICY "Users can view own MCA positions" ON mca_positions_detailed
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own MCA positions" ON mca_positions_detailed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for underwriting_scorecards_detailed
CREATE POLICY "Users can view own scorecards" ON underwriting_scorecards_detailed
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scorecards" ON underwriting_scorecards_detailed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for risk_flags_detailed
CREATE POLICY "Users can view own risk flags" ON risk_flags_detailed
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own risk flags" ON risk_flags_detailed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for documents_detailed
CREATE POLICY "Users can view own documents" ON documents_detailed
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON documents_detailed
  FOR INSERT WITH CHECK (auth.uid() = user_id);
