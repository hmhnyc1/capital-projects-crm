#!/bin/bash

# Run SQL migration via Supabase REST API
# This uses the Supabase project's SQL endpoint

PROJECT_REF="nxzrtryfiqtgmznvbtbd"
SUPABASE_URL="https://nxzrtryfiqtgmznvbtbd.supabase.co"
SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2)

if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in .env.local"
  exit 1
fi

echo "📝 Reading migration file..."
SQL_CONTENT=$(cat supabase/migrations/20260319210000_create_deal_detail_tables.sql)

echo "🔄 Connecting to Supabase project: $PROJECT_REF"
echo "📡 Endpoint: $SUPABASE_URL"
echo ""

# Use Supabase's REST API to execute SQL
# The sql endpoint is available at: /rest/v1/rpc/exec_sql
# But we need a different approach since exec_sql RPC may not exist

# Instead, let's try using the Supabase CLI directly with the project ref
echo "🚀 Applying migration via Supabase CLI..."

# Create a temporary .supabase directory if needed
mkdir -p .supabase

# Try to initialize and link the project
npx supabase link --project-ref "$PROJECT_REF" --no-password 2>/dev/null || true

# Now try to push the migration
echo "⏳ Pushing migration..."
npx supabase db push --dry-run 2>&1 | head -20 || echo "⚠️  Dry run check completed"

echo ""
echo "✅ If you see table creation statements above, the migration is ready."
echo ""
echo "To complete the migration, run:"
echo "  npx supabase db push"
