const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envFile = fs.readFileSync(envPath, 'utf-8');
const supabaseUrl = envFile.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim().replace(/^["']|["']$/g, '');
const serviceRoleKey = envFile.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim().replace(/^["']|["']$/g, '');

const sql = `
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_mca_status_check;
ALTER TABLE deals ADD CONSTRAINT deals_mca_status_check CHECK (status IN ('Underwriting', 'Approved', 'Declined', 'Counter', 'Under Review', 'Active', 'Paid Off', 'Defaulted', 'In Collections', 'Settled', 'Written Off', 'Draft'));
`;

console.log('📦 Fixing status constraint on deals table...\n');

fetch(`${supabaseUrl}/rest/v1/rpc/sql_query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    'apikey': serviceRoleKey
  },
  body: JSON.stringify({ query: sql })
})
.then(r => r.json())
.then(data => {
  if (data.error) {
    console.error('❌ Error:', data.error);
  } else {
    console.log('✅ Status constraint fixed!\n');
    console.log('📝 Allowed status values:');
    console.log('   ✓ Underwriting');
    console.log('   ✓ Approved');
    console.log('   ✓ Declined');
    console.log('   ✓ Counter');
    console.log('   ✓ Under Review');
    console.log('   ✓ Active');
    console.log('   ✓ Paid Off');
    console.log('   ✓ Defaulted');
    console.log('   ✓ In Collections');
    console.log('   ✓ Settled');
    console.log('   ✓ Written Off');
    console.log('   ✓ Draft\n');
    console.log('✅ Ready for deal creation!\n');
  }
})
.catch(err => console.error('❌ Error:', err.message));
