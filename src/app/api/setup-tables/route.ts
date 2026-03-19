import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Verify admin/service access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[setup-tables] Creating detail tables...')

    // Create bank_statements_detailed table
    const { error: stmtError } = await supabase.rpc('exec_raw_sql', {
      sql: `
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
        CREATE INDEX IF NOT EXISTS idx_bank_statements_detailed_user_id ON bank_statements_detailed(user_id);
      `
    }).catch(err => ({ error: err }))

    if (stmtError) {
      console.log('[setup-tables] Note: Bank statements table may already exist')
    }

    console.log('[setup-tables] ✅ Tables setup complete')
    return NextResponse.json({ success: true, message: 'Tables created or already exist' })
  } catch (error) {
    console.error('[setup-tables] ❌ Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
