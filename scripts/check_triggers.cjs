const https = require('https');

const SUPABASE_URL = 'https://sbzsgeokspmkewrmuqgi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNienNnZW9rc3Bta2V3cm11cWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3NjQ1OCwiZXhwIjoyMDgxOTUyNDU4fQ.X8-vdb4DaQ4_sOuOXo5Z5Spm6DDuYzyW9KjNmoAcWwo';

function pgQuery(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'sbzsgeokspmkewrmuqgi.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// Use pg directly via management API
async function queryViaManagementAPI(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: '/v1/projects/sbzsgeokspmkewrmuqgi/database/query',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  console.log('=== Checking live DB triggers on auth.users ===');
  
  // Try exec_sql first
  let r = await pgQuery(`SELECT trigger_name, event_manipulation, action_statement 
    FROM information_schema.triggers 
    WHERE event_object_schema = 'auth' AND event_object_table = 'users'`);
  console.log('exec_sql status:', r.status);
  console.log('exec_sql body:', r.body);
  
  if (r.status !== 200) {
    console.log('\n=== Trying management API ===');
    r = await queryViaManagementAPI(`SELECT trigger_name, event_manipulation, action_statement 
      FROM information_schema.triggers 
      WHERE event_object_schema = 'auth' AND event_object_table = 'users'`);
    console.log('Management API status:', r.status);
    console.log('Management API body:', r.body);
  }

  // Also check handle_new_user function body
  console.log('\n=== Checking handle_new_user function ===');
  r = await pgQuery(`SELECT pg_get_functiondef(oid) as def FROM pg_proc WHERE proname = 'handle_new_user'`);
  console.log('Function def status:', r.status, r.body.substring(0, 500));
}

main().catch(console.error);
