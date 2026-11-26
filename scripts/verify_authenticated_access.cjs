const https = require('https');

const SUPABASE_URL = 'https://sbzsgeokspmkewrmuqgi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNienNnZW9rc3Bta2V3cm11cWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNzY0NTgsImV4cCI6MjA4MTk1MjQ1OH0._chm-oFYC_QlgrStkTaCzqiCQ-udI6kGeb0dXIWqi98';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNienNnZW9rc3Bta2V3cm11cWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3NjQ1OCwiZXhwIjoyMDgxOTUyNDU4fQ.X8-vdb4DaQ4_sOuOXo5Z5Spm6DDuYzyW9KjNmoAcWwo';

function req(options, body) {
  return new Promise((resolve, reject) => {
    const r = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

async function main() {
  console.log('=== CREATING TEMPORARY TEST USER VIA ADMIN API ===');
  const testEmail = `auth_test_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  
  const createRes = await req({
    hostname: 'sbzsgeokspmkewrmuqgi.supabase.co',
    path: '/auth/v1/admin/users',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  }, JSON.stringify({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Test Hardening User', username: 'test_hardening_' + Date.now().toString().slice(-6) }
  }));

  const createdUser = JSON.parse(createRes.body);
  const userId = createdUser?.id;
  if (!userId) {
    console.error('Failed to create test user:', createRes.body);
    process.exit(1);
  }
  console.log(`Created user: ${userId}`);

  try {
    console.log('\n=== LOGGING IN AS TEST USER TO GET AUTH TOKEN ===');
    const loginRes = await req({
      hostname: 'sbzsgeokspmkewrmuqgi.supabase.co',
      path: '/auth/v1/token?grant_type=password',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY
      }
    }, JSON.stringify({ email: testEmail, password: testPassword }));

    const tokenData = JSON.parse(loginRes.body);
    const accessToken = tokenData.access_token;
    if (!accessToken) {
      console.error('Login failed:', loginRes.body);
      return;
    }
    console.log('Logged in successfully, access token obtained.');

    const authHeaders = {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${accessToken}`
    };

    // Test 1: Profiles query with safe columns
    console.log('\n1. Querying profiles with SAFE columns (id, username, full_name, avatar_url)...');
    const p1 = await req({
      hostname: 'sbzsgeokspmkewrmuqgi.supabase.co',
      path: '/rest/v1/profiles?select=id,username,full_name,avatar_url&limit=3',
      method: 'GET',
      headers: authHeaders
    });
    console.log(`Status: ${p1.status}. Rows: ${p1.status === 200 ? JSON.parse(p1.body).length : p1.body}`);

    // Test 2: Profiles query with restricted column (is_bot or email)
    console.log('\n2. Querying profiles with RESTRICTED column (is_bot)...');
    const p2 = await req({
      hostname: 'sbzsgeokspmkewrmuqgi.supabase.co',
      path: '/rest/v1/profiles?select=id,is_bot&limit=1',
      method: 'GET',
      headers: authHeaders
    });
    console.log(`Status: ${p2.status}. Message: ${p2.body}`);

    // Test 3: Follows query
    console.log('\n3. Querying follows as authenticated user...');
    const f1 = await req({
      hostname: 'sbzsgeokspmkewrmuqgi.supabase.co',
      path: '/rest/v1/follows?select=id,follower_id,following_id&limit=3',
      method: 'GET',
      headers: authHeaders
    });
    console.log(`Status: ${f1.status}. Rows: ${f1.status === 200 ? JSON.parse(f1.body).length : f1.body}`);

    // Test 4: Projects query
    console.log('\n4. Querying projects as authenticated user...');
    const prj1 = await req({
      hostname: 'sbzsgeokspmkewrmuqgi.supabase.co',
      path: '/rest/v1/projects?select=id,title,user_id&limit=3',
      method: 'GET',
      headers: authHeaders
    });
    console.log(`Status: ${prj1.status}. Rows: ${prj1.status === 200 ? JSON.parse(prj1.body).length : prj1.body}`);

    // Test 5: Posts query
    console.log('\n5. Querying posts as authenticated user...');
    const pst1 = await req({
      hostname: 'sbzsgeokspmkewrmuqgi.supabase.co',
      path: '/rest/v1/posts?select=id,content,user_id&limit=3',
      method: 'GET',
      headers: authHeaders
    });
    console.log(`Status: ${pst1.status}. Rows: ${pst1.status === 200 ? JSON.parse(pst1.body).length : pst1.body}`);

    // Test 6: Native wallets query (should ONLY see own wallet, not other users)
    console.log('\n6. Querying native_wallets as authenticated user...');
    const w1 = await req({
      hostname: 'sbzsgeokspmkewrmuqgi.supabase.co',
      path: '/rest/v1/native_wallets?select=id,user_id,balance&limit=10',
      method: 'GET',
      headers: authHeaders
    });
    console.log(`Status: ${w1.status}. Rows returned: ${w1.status === 200 ? JSON.parse(w1.body).length : w1.body}`);

  } finally {
    console.log(`\n=== CLEANING UP TEST USER: ${userId} ===`);
    const delRes = await req({
      hostname: 'sbzsgeokspmkewrmuqgi.supabase.co',
      path: `/auth/v1/admin/users/${userId}`,
      method: 'DELETE',
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`
      }
    });
    console.log(`Cleanup status: ${delRes.status}`);
  }
}

main().catch(console.error);
