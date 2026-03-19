-- MCA Platform - Comprehensive Deal Schema
-- Run this in Supabase SQL Editor to set up all tables for deal tracking
-- NOTE: This extends the existing contacts table (which holds merchant data) with additional fields

-- Update contacts table with comprehensive merchant fields (if not already added by mca-schema.sql)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS business_legal_name text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS dba text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS owner_dob date;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS owner_ssn_last4 text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS ownership_percentage integer;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS business_address text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS stated_monthly_revenue numeric(15,2);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS bank_name text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS account_type text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS landlord_name text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS monthly_rent numeric(15,2);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS use_of_funds text;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS time_in_business_years integer;

-- Update deals table with comprehensive underwriting fields
ALTER TABLE deals ADD COLUMN IF NOT EXISTS deal_number text UNIQUE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS merchant_id uuid REFERENCES contacts(id) ON DELETE CASCADE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS status text DEFAULT 'Under Review' CHECK (status IN ('Approved', 'Declined', 'Counter', 'Under Review', 'Draft'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS date_uploaded date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS position_recommendation text CHECK (position_recommendation IN ('Approve', 'Decline', 'Counter', 'Review'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recommended_max_advance numeric(15,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recommended_factor_rate_min numeric(6,4);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recommended_factor_rate_max numeric(6,4);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recommended_term_days integer;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recommended_daily_debit numeric(10,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS recommended_position text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS risk_score integer CHECK (risk_score BETWEEN 0 AND 100);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS risk_grade text CHECK (risk_grade IN ('A', 'B', 'C', 'D', 'E', 'F'));
ALTER TABLE deals ADD COLUMN IF NOT EXISTS executive_summary text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS average_monthly_true_revenue numeric(15,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS revenue_trend text;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS average_daily_balance_all_months numeric(15,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS total_nsfs_all_months integer DEFAULT 0;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS average_holdback_percentage numeric(5,2);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS date_range_start date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS date_range_end date;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS total_months_analyzed integer;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS raw_data jsonb;

-- Extended bank statements table
CREATE TABLE IF NOT EXISTS bank_statements_detailed (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE,
  merchant_id uuid REFERENCES contacts(id) ON DELETE CASCADE,
  statement_month integer NOT NULL CHECK (statement_month BETWEEN 1 AND 12),
  statement_year integer NOT NULL,
  statement_period_start date,
  statement_period_end date,
  starting_balance numeric(15,2),
  ending_balance numeric(15,2),
  total_deposits numeric(15,2),
  num_deposits integer,
  true_revenue numeric(15,2),
  non_revenue_deposits numeric(15,2),
  average_daily_balance numeric(15,2),
  lowest_daily_balance numeric(15,2),
  lowest_balance_date date,
  days_below_500 integer DEFAULT 0,
  days_below_1000 integer DEFAULT 0,
  total_withdrawals numeric(15,2),
  num_withdrawals integer,
  nsf_count integer DEFAULT 0,
  nsf_dates jsonb,
  nsf_amounts jsonb,
  nsf_total numeric(15,2),
  total_mca_holdback numeric(15,2),
  holdback_percentage numeric(5,2),
  net_cash_flow numeric(15,2),
  model_used text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- MCA positions detailed tracking
CREATE TABLE IF NOT EXISTS mca_positions_detailed (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  merchant_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  funder_name text NOT NULL,
  daily_debit_amount numeric(10,2),
  weekly_amount numeric(10,2),
  monthly_total numeric(10,2),
  months_active integer,
  total_paid numeric(15,2),
  first_seen_month text,
  last_seen_month text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Underwriting scorecard
CREATE TABLE IF NOT EXISTS underwriting_scorecards_detailed (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  overall_score integer CHECK (overall_score BETWEEN 0 AND 100),
  risk_grade text CHECK (risk_grade IN ('A', 'B', 'C', 'D', 'E', 'F')),
  adb_score integer,
  adb_value numeric(15,2),
  revenue_consistency_score integer,
  revenue_variance numeric(5,2),
  nsf_score integer,
  nsf_count integer,
  mca_stack_score integer,
  holdback_percentage numeric(5,2),
  revenue_trend_score integer,
  revenue_trend_direction text CHECK (revenue_trend_direction IN ('Growing', 'Declining', 'Flat')),
  revenue_trend_percentage numeric(5,2),
  time_in_business_score integer,
  stated_vs_actual_score integer,
  stated_revenue numeric(15,2),
  actual_revenue numeric(15,2),
  revenue_variance_percentage numeric(5,2),
  recommended_max_advance numeric(15,2),
  recommended_factor_rate_min numeric(6,4),
  recommended_factor_rate_max numeric(6,4),
  recommended_term_days integer,
  recommended_daily_debit numeric(10,2),
  recommended_position text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enhanced risk flags
CREATE TABLE IF NOT EXISTS risk_flags_detailed (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  flag_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('high', 'medium', 'low')),
  description text,
  value_that_triggered_it text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Revenue sources tracking
CREATE TABLE IF NOT EXISTS revenue_sources (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  merchant_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  source_name text NOT NULL,
  total_amount numeric(15,2),
  percentage_of_true_revenue numeric(5,2),
  months_present integer,
  is_revenue boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Daily balances for visual trending
CREATE TABLE IF NOT EXISTS daily_balances (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  date date NOT NULL,
  balance numeric(15,2),
  status text CHECK (status IN ('OK', 'LOW', 'CRITICAL')),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enhanced documents tracking
CREATE TABLE IF NOT EXISTS documents_detailed (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  merchant_id uuid REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  document_type text CHECK (document_type IN ('application', 'bank_statement', 'other')),
  statement_month integer,
  statement_year integer,
  storage_path text,
  model_used text,
  uploaded_at timestamptz DEFAULT now()
);

-- Deal activity timeline
CREATE TABLE IF NOT EXISTS deal_activities (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  deal_id uuid REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('created', 'approved', 'declined', 'counter_offered', 'saved_for_review', 'terms_updated', 'comment_added', 'status_changed')),
  action_title text NOT NULL,
  action_description text,
  old_values jsonb,
  new_values jsonb,
  created_by_user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

-- RLS Policies
ALTER TABLE bank_statements_detailed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own bank statements" ON bank_statements_detailed FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE mca_positions_detailed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own MCA positions" ON mca_positions_detailed FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE underwriting_scorecards_detailed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own underwriting scorecards" ON underwriting_scorecards_detailed FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE risk_flags_detailed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own risk flags" ON risk_flags_detailed FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE revenue_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own revenue sources" ON revenue_sources FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE daily_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own daily balances" ON daily_balances FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE documents_detailed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own documents" ON documents_detailed FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE deal_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own deal activities" ON deal_activities FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS bank_statements_detailed_deal_id_idx ON bank_statements_detailed(deal_id);
CREATE INDEX IF NOT EXISTS bank_statements_detailed_merchant_id_idx ON bank_statements_detailed(merchant_id);
CREATE INDEX IF NOT EXISTS bank_statements_detailed_user_id_idx ON bank_statements_detailed(user_id);
CREATE INDEX IF NOT EXISTS mca_positions_detailed_deal_id_idx ON mca_positions_detailed(deal_id);
CREATE INDEX IF NOT EXISTS mca_positions_detailed_user_id_idx ON mca_positions_detailed(user_id);
CREATE INDEX IF NOT EXISTS underwriting_scorecards_detailed_deal_id_idx ON underwriting_scorecards_detailed(deal_id);
CREATE INDEX IF NOT EXISTS underwriting_scorecards_detailed_user_id_idx ON underwriting_scorecards_detailed(user_id);
CREATE INDEX IF NOT EXISTS risk_flags_detailed_deal_id_idx ON risk_flags_detailed(deal_id);
CREATE INDEX IF NOT EXISTS risk_flags_detailed_user_id_idx ON risk_flags_detailed(user_id);
CREATE INDEX IF NOT EXISTS revenue_sources_deal_id_idx ON revenue_sources(deal_id);
CREATE INDEX IF NOT EXISTS daily_balances_deal_id_idx ON daily_balances(deal_id);
CREATE INDEX IF NOT EXISTS documents_detailed_deal_id_idx ON documents_detailed(deal_id);
CREATE INDEX IF NOT EXISTS deal_activities_deal_id_idx ON deal_activities(deal_id);
CREATE INDEX IF NOT EXISTS deal_activities_created_at_idx ON deal_activities(created_at);

-- Update triggers for timestamps
CREATE TRIGGER update_underwriting_scorecards_detailed_updated_at BEFORE UPDATE ON underwriting_scorecards_detailed FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
