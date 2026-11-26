const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sbzsgeokspmkewrmuqgi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNienNnZW9rc3Bta2V3cm11cWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3NjQ1OCwiZXhwIjoyMDgxOTUyNDU4fQ.X8-vdb4DaQ4_sOuOXo5Z5Spm6DDuYzyW9KjNmoAcWwo';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const { data: p1 } = await supabase.from('profiles').select('id, username, email').eq('id', 'f8a2a3dc-68a9-4902-9a8a-bcce377d9094');
  const { data: p2 } = await supabase.from('profiles').select('id, username, email').eq('id', '1268349c-e3da-4d38-a58f-cad8de4c0d2c');
  const { data: p3 } = await supabase.from('profiles').select('id, username, email').eq('id', '62ffe83a-2f6c-4d28-980d-11cd75506af1');
  const { data: p4 } = await supabase.from('profiles').select('id, username, email').eq('id', '4cf81170-4c72-4992-a1d7-a1b13830e0fe');

  console.log('f8a2a3dc in profiles:', p1);
  console.log('1268349c in profiles:', p2);
  console.log('62ffe83a in profiles:', p3);
  console.log('4cf81170 in profiles:', p4);
}

main().catch(console.error);
