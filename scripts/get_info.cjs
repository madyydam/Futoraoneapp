const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://sbzsgeokspmkewrmuqgi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNienNnZW9rc3Bta2V3cm11cWdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjM3NjQ1OCwiZXhwIjoyMDgxOTUyNDU4fQ.X8-vdb4DaQ4_sOuOXo5Z5Spm6DDuYzyW9KjNmoAcWwo';
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  const setup = `
    CREATE OR REPLACE FUNCTION public.check_user_counts()
    RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN
      RETURN jsonb_build_object(
        'auth_users_count', (SELECT count(*) FROM auth.users),
        'profiles_count', (SELECT count(*) FROM public.profiles),
        'target_user_in_profiles', (SELECT row_to_json(p) FROM public.profiles p WHERE p.id = '62ffe83a-2f6c-4d28-980d-11cd75506af1'),
        'target_user_in_auth', (SELECT row_to_json(u) FROM (SELECT id, email FROM auth.users WHERE id = '62ffe83a-2f6c-4d28-980d-11cd75506af1') u),
        'target_madhur_profile', (SELECT row_to_json(p) FROM public.profiles p WHERE p.id = '1268349c-e3da-4d38-a58f-cad8de4c0d2c')
      );
    END;
    $$;
    NOTIFY pgrst, 'reload schema';
  `;
  await supabase.rpc('exec_sql', { query: setup });
  await new Promise(r => setTimeout(r, 600));
  const { data } = await supabase.rpc('check_user_counts');
  console.log('Counts & user info:\n', JSON.stringify(data, null, 2));
}

main().catch(console.error);
