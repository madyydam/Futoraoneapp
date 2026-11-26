import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { runFiveDayDigest } from '../supabase/functions/_shared/digest-logic.ts';
import { buildTestEmail } from '../supabase/functions/_shared/email-templates.ts';
import { getNodeCloudflareSmtpConfig, sendNodeCloudflareSmtpEmail } from './node-smtp.mjs';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    force: false,
    testEmail: null,
    limit: 100,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--test' && argv[i + 1]) {
      args.testEmail = argv[i + 1];
      i++;
    } else if (arg === '--limit' && argv[i + 1]) {
      args.limit = Number(argv[i + 1]) || 100;
      i++;
    }
  }
  return args;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const appUrl = (process.env.APP_URL || 'https://futora1.vercel.app').trim();
  const smtpConfig = getNodeCloudflareSmtpConfig();

  if (opts.testEmail) {
    const template = buildTestEmail({ recipientEmail: opts.testEmail, appUrl });
    const res = await sendNodeCloudflareSmtpEmail({
      to: { email: opts.testEmail },
      subject: template.subject,
      text: template.text,
      html: template.html,
      config: smtpConfig,
    });
    console.log(JSON.stringify({ ok: true, to: opts.testEmail, from: smtpConfig.from.email, ...res }, null, 2));
    return;
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing VITE_SUPABASE_URL/SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const summary = await runFiveDayDigest({
    supabase,
    sendEmail: (msg) => sendNodeCloudflareSmtpEmail({ ...msg, config: smtpConfig }),
    appUrl,
    dryRun: opts.dryRun,
    force: opts.force,
    limit: opts.limit,
  });

  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0 && summary.sent === 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('5-day digest error:', err);
  process.exit(1);
});
