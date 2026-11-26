export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

export interface DigestPostPreview {
  id: string;
  authorName: string;
  excerpt: string;
  createdAt: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getBaseUrl(appUrl?: string): string {
  const raw = (appUrl ?? 'https://futora1.vercel.app').trim();
  return raw.replace(/\/+$/, '');
}

function wrapLayout(params: {
  preheader: string;
  heading: string;
  badge: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  secondaryCtaLabel?: string;
  secondaryCtaUrl?: string;
  settingsUrl: string;
}): string {
  const secondaryButton = params.secondaryCtaLabel && params.secondaryCtaUrl
    ? `<a href="${escapeHtml(params.secondaryCtaUrl)}" style="display:inline-block;margin-left:10px;padding:12px 20px;border-radius:10px;background:#1e293b;color:#f8fafc;text-decoration:none;font-weight:600;font-size:14px;border:1px solid #334155;">${escapeHtml(params.secondaryCtaLabel)}</a>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(params.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b1120;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(params.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0b1120;padding:28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;background:#111827;border:1px solid #1f2937;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px;background:linear-gradient(135deg,#1e1b4b 0%,#0f172a 100%);border-bottom:1px solid #1f2937;">
              <div style="font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#a5b4fc;margin-bottom:8px;">${escapeHtml(params.badge)}</div>
              <h1 style="margin:0;font-size:22px;line-height:1.3;color:#ffffff;font-weight:800;">${escapeHtml(params.heading)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px;font-size:15px;line-height:1.65;color:#cbd5e1;">
              ${params.bodyHtml}
              <div style="margin-top:24px;">
                <a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#6366f1;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">${escapeHtml(params.ctaLabel)}</a>
                ${secondaryButton}
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px;background:#0f172a;border-top:1px solid #1f2937;font-size:12px;line-height:1.5;color:#94a3b8;">
              Sent by One via <a href="mailto:sales@futoragroup.in" style="color:#93c5fd;text-decoration:none;">sales@futoragroup.in</a>.<br />
              You can manage email alerts anytime in <a href="${escapeHtml(params.settingsUrl)}" style="color:#93c5fd;text-decoration:none;">Account Settings</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildWelcomeEmail(params: {
  name?: string | null;
  username?: string | null;
  appUrl?: string;
}): EmailTemplate {
  const baseUrl = getBaseUrl(params.appUrl);
  const displayName = (params.name || params.username || 'Developer').trim();
  const handle = params.username ? `@${params.username.replace(/^@/, '')}` : '';

  const subject = `Welcome to One, ${displayName}!`;
  const text = [
    `Hi ${displayName}${handle ? ` (${handle})` : ''},`,
    '',
    'Welcome to One — your developer community, tech networking hub, and builder ecosystem.',
    '',
    'Here is what you can do right away:',
    `- Explore trending builder posts: ${baseUrl}/feed`,
    `- Connect and chat with developers: ${baseUrl}/messages`,
    `- Claim & grow your One Wallet rewards: ${baseUrl}/wallet`,
    '',
    `Open One: ${baseUrl}/feed`,
    `Email preferences: ${baseUrl}/settings`,
  ].join('\n');

  const bodyHtml = `
    <p style="margin:0 0 14px;">Hi <strong style="color:#ffffff;">${escapeHtml(displayName)}</strong>${handle ? ` <span style="color:#94a3b8;">(${escapeHtml(handle)})</span>` : ''},</p>
    <p style="margin:0 0 14px;">Welcome to <strong style="color:#ffffff;">One</strong>! Your account is ready, and your 1,000-coin welcome bonus is waiting in your wallet.</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#cbd5e1;">
      <li style="margin-bottom:6px;">Share projects, insights, and tech updates on the feed</li>
      <li style="margin-bottom:6px;">Message founders, collaborators, and developer communities</li>
      <li>Compete in Tech Match, Arcade games, and the developer leaderboard</li>
    </ul>`;

  const html = wrapLayout({
    preheader: `Welcome to One, ${displayName}! Jump into the feed.`,
    heading: `Welcome to One, ${displayName}`,
    badge: 'One • New Member',
    bodyHtml,
    ctaLabel: 'Open Your Feed',
    ctaUrl: `${baseUrl}/feed`,
    secondaryCtaLabel: 'Check Messages',
    secondaryCtaUrl: `${baseUrl}/messages`,
    settingsUrl: `${baseUrl}/settings`,
  });

  return { subject, text, html };
}

export function buildLoginEmail(params: {
  name?: string | null;
  loginTimeIso?: string;
  appUrl?: string;
}): EmailTemplate {
  const baseUrl = getBaseUrl(params.appUrl);
  const displayName = (params.name || 'Developer').trim();
  const formattedTime = new Date(params.loginTimeIso || Date.now()).toUTCString();

  const subject = 'Welcome back — new login to your One account';
  const text = [
    `Hi ${displayName},`,
    '',
    `You signed in to your One account on ${formattedTime}.`,
    '',
    `Jump back into your feed: ${baseUrl}/feed`,
    `Check your messages: ${baseUrl}/messages`,
    '',
    `If this wasn't you, please update your password immediately at ${baseUrl}/settings.`,
  ].join('\n');

  const bodyHtml = `
    <p style="margin:0 0 14px;">Hi <strong style="color:#ffffff;">${escapeHtml(displayName)}</strong>,</p>
    <p style="margin:0 0 14px;">You just signed in to your <strong style="color:#ffffff;">One</strong> account.</p>
    <div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:14px 16px;margin:0 0 16px;font-size:13px;color:#94a3b8;">
      <div><strong style="color:#e2e8f0;">Sign-in time:</strong> ${escapeHtml(formattedTime)}</div>
    </div>
    <p style="margin:0;">If this wasn't you, please change your password right away in Settings.</p>`;

  const html = wrapLayout({
    preheader: `Successful sign-in to One on ${formattedTime}`,
    heading: 'Welcome back to One',
    badge: 'One • Account Activity',
    bodyHtml,
    ctaLabel: 'Go to Feed',
    ctaUrl: `${baseUrl}/feed`,
    secondaryCtaLabel: 'Check Messages',
    secondaryCtaUrl: `${baseUrl}/messages`,
    settingsUrl: `${baseUrl}/settings`,
  });

  return { subject, text, html };
}

export function buildFiveDayDigestEmail(params: {
  name?: string | null;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  recentPosts: DigestPostPreview[];
  appUrl?: string;
}): EmailTemplate {
  const baseUrl = getBaseUrl(params.appUrl);
  const displayName = (params.name || 'Developer').trim();
  const msgCount = Math.max(0, params.unreadMessagesCount);
  const notifCount = Math.max(0, params.unreadNotificationsCount);
  const postCount = params.recentPosts.length;

  let subject = 'Check what is new on One — see messages & latest posts';
  if (msgCount > 0 && postCount > 0) {
    subject = `You got ${msgCount} unread message${msgCount === 1 ? '' : 's'} & ${postCount} new post${postCount === 1 ? '' : 's'} on One`;
  } else if (msgCount > 0) {
    subject = `You got ${msgCount} unread message${msgCount === 1 ? '' : 's'} — check now on One`;
  } else if (postCount > 0) {
    subject = `See ${postCount} new post${postCount === 1 ? '' : 's'} on One`;
  }

  const textLines: string[] = [
    `Hi ${displayName},`,
    '',
    'Your 5-day check-in from One is here!',
  ];

  if (msgCount > 0) {
    textLines.push(`- You have ${msgCount} unread message${msgCount === 1 ? '' : 's'}. Check now: ${baseUrl}/messages`);
  }
  if (notifCount > 0) {
    textLines.push(`- You have ${notifCount} unread notification${notifCount === 1 ? '' : 's'}: ${baseUrl}/notifications`);
  }
  if (postCount > 0) {
    textLines.push('', 'Latest posts from the community:');
    for (const post of params.recentPosts) {
      textLines.push(`  • ${post.authorName}: "${post.excerpt}" (${baseUrl}/post/${post.id})`);
    }
  }
  if (msgCount === 0 && notifCount === 0 && postCount === 0) {
    textLines.push(
      '',
      'People are sharing projects, opening new chats, and playing challenges on One.',
      `- Check your messages: ${baseUrl}/messages`,
      `- See new posts on your feed: ${baseUrl}/feed`,
    );
  }
  textLines.push('', `Open feed: ${baseUrl}/feed`, `Manage email settings: ${baseUrl}/settings`);

  const statsBlocks: string[] = [];
  if (msgCount > 0) {
    statsBlocks.push(`
      <div style="background:#172554;border:1px solid #1d4ed8;border-radius:10px;padding:14px 16px;margin-bottom:12px;">
        <div style="font-size:15px;font-weight:700;color:#ffffff;">You have ${msgCount} unread message${msgCount === 1 ? '' : 's'}</div>
        <div style="font-size:13px;color:#bfdbfe;margin-top:4px;">Someone messaged you — open your inbox to check now.</div>
      </div>`);
  }
  if (notifCount > 0) {
    statsBlocks.push(`
      <div style="background:#1e1b4b;border:1px solid #4338ca;border-radius:10px;padding:12px 16px;margin-bottom:12px;font-size:14px;color:#e0e7ff;">
        <strong>${notifCount} unread notification${notifCount === 1 ? '' : 's'}</strong> waiting in your activity tab.
      </div>`);
  }

  const postsHtml = postCount > 0
    ? `
      <div style="margin-top:18px;">
        <div style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;margin-bottom:10px;">See New Posts</div>
        ${params.recentPosts
          .map(
            (post) => `
          <div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:12px 14px;margin-bottom:10px;">
            <div style="font-size:13px;font-weight:700;color:#ffffff;margin-bottom:4px;">${escapeHtml(post.authorName)}</div>
            <div style="font-size:13px;color:#cbd5e1;line-height:1.5;">${escapeHtml(post.excerpt)}</div>
            <div style="margin-top:6px;"><a href="${escapeHtml(`${baseUrl}/post/${post.id}`)}" style="font-size:12px;color:#818cf8;text-decoration:none;font-weight:600;">View post &rarr;</a></div>
          </div>`
          )
          .join('')}
      </div>`
    : `
      <div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:14px 16px;margin-top:14px;">
        <div style="font-size:14px;font-weight:700;color:#ffffff;margin-bottom:4px;">Jump back into One</div>
        <div style="font-size:13px;color:#cbd5e1;line-height:1.5;">See new posts from builders, check your messages, and keep your streak alive.</div>
      </div>`;

  const bodyHtml = `
    <p style="margin:0 0 14px;">Hi <strong style="color:#ffffff;">${escapeHtml(displayName)}</strong>,</p>
    <p style="margin:0 0 16px;">It has been 5 days — come check out what is happening on <strong style="color:#ffffff;">One</strong>:</p>
    ${statsBlocks.join('')}
    ${postsHtml}`;

  const primaryCtaLabel = msgCount > 0 ? 'Check Messages Now' : 'See New Posts';
  const primaryCtaUrl = msgCount > 0 ? `${baseUrl}/messages` : `${baseUrl}/feed`;

  const html = wrapLayout({
    preheader: subject,
    heading: msgCount > 0 ? 'You got a message on One' : 'See what is new on One',
    badge: 'One • 5-Day Check-In',
    bodyHtml,
    ctaLabel: primaryCtaLabel,
    ctaUrl: primaryCtaUrl,
    secondaryCtaLabel: msgCount > 0 ? 'See New Posts' : 'Check Messages',
    secondaryCtaUrl: msgCount > 0 ? `${baseUrl}/feed` : `${baseUrl}/messages`,
    settingsUrl: `${baseUrl}/settings`,
  });

  return { subject, text: textLines.join('\n'), html };
}

export function buildTestEmail(params: {
  recipientEmail: string;
  appUrl?: string;
}): EmailTemplate {
  const baseUrl = getBaseUrl(params.appUrl);
  const subject = 'Welcome to One — Cloudflare SMTP Test';
  const text = `Hi!\n\nCloudflare SMTP (sales@futoragroup.in via smtp.mx.cloudflare.net:465) delivered this test email from One to ${params.recipientEmail}.\n\nOpen One: ${baseUrl}/feed\nCheck Messages: ${baseUrl}/messages`;
  const html = wrapLayout({
    preheader: 'One Cloudflare SMTP delivery verification succeeded.',
    heading: 'Welcome to One — SMTP Verified',
    badge: 'One • Cloudflare SMTP Test',
    bodyHtml: `<p style="margin:0 0 12px;">Your Cloudflare SMTP pipeline (<strong>smtp.mx.cloudflare.net:465</strong> via <strong>sales@futoragroup.in</strong>) is live for <strong style="color:#ffffff;">One</strong>.</p><p style="margin:0;">Delivered to <strong>${escapeHtml(params.recipientEmail)}</strong>.</p>`,
    ctaLabel: 'Open One Feed',
    ctaUrl: `${baseUrl}/feed`,
    secondaryCtaLabel: 'Check Messages',
    secondaryCtaUrl: `${baseUrl}/messages`,
    settingsUrl: `${baseUrl}/settings`,
  });
  return { subject, text, html };
}
