const https = require('https');

const SUPABASE_URL = 'https://sbzsgeokspmkewrmuqgi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNienNnZW9rc3Bta2V3cm11cWdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNzY0NTgsImV4cCI6MjA4MTk1MjQ1OH0._chm-oFYC_QlgrStkTaCzqiCQ-udI6kGeb0dXIWqi98';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNienNnZW9rc3Bta2V3cm11cWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3NjQ1OCwiZXhwIjoyMDgxOTUyNDU4fQ.X8-vdb4DaQ4_sOuOXo5Z5Spm6DDuYzyW9KjNmoAcWwo';

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function main() {
  const testEmail = `test_${Date.now()}@temptest.com`;
  const testPassword = 'TestPass123!';
  
  console.log('=== TEST: Signup with email:', testEmail);
  
  const signupBody = JSON.stringify({
    email: testEmail,
    password: testPassword,
    data: { full_name: 'Test User', username: 'testuser_' + Date.now() }
  });
  
  let r = await request({
    hostname: 'sbzsgeokspmkewrmuqgi.supabase.co',
    path: '/auth/v1/signup?redirect_to=https://one.heyocco.com/auth',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Length': Buffer.byteLength(signupBody)
    }
  }, signupBody);
  
  console.log('Signup status:', r.status);
  const parsed = JSON.parse(r.body);
  if (r.status >= 400) {
    console.log('ERROR:', JSON.stringify(parsed, null, 2));
  } else {
    console.log('SUCCESS - user id:', parsed.user?.id);
    console.log('Email confirmed:', parsed.user?.email_confirmed_at ? 'yes' : 'no (needs confirm)');
    
    // cleanup - delete this test user
    const userId = parsed.user?.id;
    if (userId) {
      console.log('\n=== Cleaning up test user:', userId);
      let del = await request({
        hostname: 'sbzsgeokspmkewrmuqgi.supabase.co',
        path: `/auth/v1/admin/users/${userId}`,
        method: 'DELETE',
        headers: {
          'apikey': SERVICE_KEY,
          'Authorization': `Bearer ${SERVICE_KEY}`
        }
      }, null);
      console.log('Delete status:', del.status);
    }
  }
}

main().catch(console.error);
