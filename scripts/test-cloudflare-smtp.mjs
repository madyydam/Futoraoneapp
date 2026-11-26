import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMimeMessage,
  dotStuff,
  encodeAuthPlain,
  runSmtpSession,
  SmtpError,
} from '../supabase/functions/_shared/smtp-protocol.ts';
import {
  buildFiveDayDigestEmail,
  buildLoginEmail,
  buildWelcomeEmail,
} from '../supabase/functions/_shared/email-templates.ts';
import {
  FIVE_DAYS_MS,
  isDigestEligible,
  runFiveDayDigest,
} from '../supabase/functions/_shared/digest-logic.ts';

function createMockTransport(serverResponses) {
  const sent = [];
  const queue = [...serverResponses];
  let closed = false;

  return {
    sent,
    get isClosed() {
      return closed;
    },
    async readLine() {
      return queue.length > 0 ? queue.shift() : null;
    },
    async write(data) {
      sent.push(data);
    },
    close() {
      closed = true;
    },
  };
}

test('encodeAuthPlain formats RFC 4616 NUL-delimited credentials', () => {
  const encoded = encodeAuthPlain('api_token', 'secret_123');
  assert.equal(Buffer.from(encoded, 'base64').toString('utf8'), '\0api_token\0secret_123');
});

test('buildMimeMessage sanitizes CRLF header injection and includes text + html parts', () => {
  const { raw, generatedMessageId } = buildMimeMessage({
    from: { email: 'sales@futoragroup.in', name: 'One' },
    to: { email: 'user@example.com', name: 'Dev User' },
    subject: 'Welcome\r\nBcc: attacker@evil.com',
    text: 'Plain text hello 🚀',
    html: '<p>HTML hello 🚀</p>',
  });

  assert.match(generatedMessageId, /^<[^>\s]+@futoragroup\.in>$/);
  assert.equal(raw.includes('\r\nBcc: attacker@evil.com'), false);
  assert.ok(raw.includes('Content-Type: multipart/alternative;'));
  assert.ok(raw.includes('Content-Type: text/plain; charset=UTF-8'));
  assert.ok(raw.includes('Content-Type: text/html; charset=UTF-8'));
});

test('dotStuff escapes leading dots and ends with CRLF.CRLF', () => {
  const stuffed = dotStuff('line1\n.hidden\n..already\nend');
  assert.equal(stuffed, 'line1\r\n..hidden\r\n...already\r\nend\r\n.\r\n');
});

test('runSmtpSession completes AUTH PLAIN and extracts Cloudflare Message-ID', async () => {
  const transport = createMockTransport([
    '220 mx.cloudflare.net Cloudflare Email ESMTP Service ready',
    '250-mx.cloudflare.net greets futoragroup.in',
    '250-AUTH PLAIN LOGIN',
    '250 ENHANCEDSTATUSCODES',
    '235 2.7.0 Authentication successful',
    '250 2.1.0 Ok',
    '250 2.1.5 Ok',
    '354 Start mail input; end with <CR><LF>.<CR><LF>',
    '250 2.0.0 Ok <cf-msg-123@futoragroup.in>',
    '221 2.0.0 Bye',
  ]);

  const result = await runSmtpSession(transport, {
    username: 'api_token',
    password: 'token_value',
    from: { email: 'sales@futoragroup.in', name: 'One' },
    to: { email: 'madhurdhadve7@gmail.com' },
    subject: 'Test',
    text: 'Hello',
    html: '<p>Hello</p>',
  });

  assert.equal(result.messageId, '<cf-msg-123@futoragroup.in>');
  assert.equal(transport.isClosed, true);
  assert.ok(transport.sent[0].startsWith('EHLO futoragroup.in'));
  assert.ok(transport.sent[1].startsWith('AUTH PLAIN '));
  assert.equal(transport.sent[2], 'MAIL FROM:<sales@futoragroup.in>\r\n');
  assert.equal(transport.sent[3], 'RCPT TO:<madhurdhadve7@gmail.com>\r\n');
  assert.equal(transport.sent[4], 'DATA\r\n');
  assert.ok(transport.sent[5].endsWith('\r\n.\r\n'));
});

test('runSmtpSession classifies 535 permanent vs 451 retryable SMTP errors', async () => {
  const authFailTransport = createMockTransport([
    '220 mx.cloudflare.net ready',
    '250 mx.cloudflare.net ok',
    '535 5.7.8 Authentication failed',
  ]);

  await assert.rejects(
    () =>
      runSmtpSession(authFailTransport, {
        username: 'api_token',
        password: 'bad',
        from: { email: 'sales@futoragroup.in', name: 'One' },
        to: { email: 'user@example.com' },
        subject: 'Test',
        text: 'Hello',
        html: '<p>Hello</p>',
      }),
    (err) => err instanceof SmtpError && err.code === 535 && err.retryable === false && err.stage === 'auth'
  );

  const rateLimitTransport = createMockTransport([
    '220 mx.cloudflare.net ready',
    '250 mx.cloudflare.net ok',
    '235 2.7.0 Authentication successful',
    '250 2.1.0 Ok',
    '250 2.1.5 Ok',
    '354 Start mail input',
    '451 4.7.1 Daily sending limit exceeded',
  ]);

  await assert.rejects(
    () =>
      runSmtpSession(rateLimitTransport, {
        username: 'api_token',
        password: 'ok',
        from: { email: 'sales@futoragroup.in', name: 'One' },
        to: { email: 'user@example.com' },
        subject: 'Test',
        text: 'Hello',
        html: '<p>Hello</p>',
      }),
    (err) => err instanceof SmtpError && err.code === 451 && err.retryable === true
  );
});

test('email templates use brand name "One" and escape HTML safely', () => {
  const welcome = buildWelcomeEmail({ name: '<script>alert(1)</script>', username: 'dev1' });
  assert.ok(welcome.subject.includes('Welcome to One'));
  assert.equal(welcome.subject.includes('FutoraOne'), false);
  assert.equal(welcome.html.includes('<script>'), false);
  assert.ok(welcome.html.includes('&lt;script&gt;'));

  const login = buildLoginEmail({ name: 'Madhur' });
  assert.ok(login.subject.includes('One'));
  assert.equal(login.html.includes('FutoraOne'), false);

  const emptyDigest = buildFiveDayDigestEmail({
    name: 'Madhur',
    unreadMessagesCount: 0,
    unreadNotificationsCount: 0,
    recentPosts: [],
  });
  assert.ok(emptyDigest.subject.includes('One'));
  assert.ok(emptyDigest.html.includes('Jump back into One'));
  assert.ok(emptyDigest.text.includes('/messages'));
  assert.ok(emptyDigest.text.includes('/feed'));

  const activeDigest = buildFiveDayDigestEmail({
    name: 'Madhur',
    unreadMessagesCount: 2,
    unreadNotificationsCount: 1,
    recentPosts: [{ id: 'p1', authorName: 'Alice', excerpt: 'Built a new app', createdAt: new Date().toISOString() }],
  });
  assert.ok(activeDigest.subject.includes('2 unread messages'));
  assert.ok(activeDigest.html.includes('Check Messages Now'));
  assert.ok(activeDigest.html.includes('See New Posts'));
});

test('isDigestEligible enforces 5-day window, ban status, and email opt-out', () => {
  const now = Date.parse('2026-11-26T12:00:00Z');
  const sixDaysAgo = new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();

  assert.equal(
    isDigestEligible(
      { id: 'u1', email: 'a@b.com', full_name: 'A', username: 'a', last_digest_at: sixDaysAgo, created_at: sixDaysAgo, is_banned: false, settings: null },
      now
    ).eligible,
    true
  );

  assert.equal(
    isDigestEligible(
      { id: 'u2', email: 'a@b.com', full_name: 'A', username: 'a', last_digest_at: twoDaysAgo, created_at: sixDaysAgo, is_banned: false, settings: null },
      now
    ).reason,
    'within_5_day_window'
  );

  assert.equal(
    isDigestEligible(
      { id: 'u3', email: 'a@b.com', full_name: 'A', username: 'a', last_digest_at: sixDaysAgo, created_at: sixDaysAgo, is_banned: false, settings: { notifications: { email: false } } },
      now
    ).reason,
    'email_notifications_disabled'
  );

  assert.equal(
    isDigestEligible(
      { id: 'u4', email: 'a@b.com', full_name: 'A', username: 'a', last_digest_at: sixDaysAgo, created_at: sixDaysAgo, is_banned: true, settings: null },
      now
    ).reason,
    'user_banned'
  );
});

test('runFiveDayDigest sends retention emails every 5 days even with 0 messages/posts and updates last_digest_at', async () => {
  const now = new Date('2026-11-26T12:00:00Z');
  const sixDaysAgo = new Date(now.getTime() - FIVE_DAYS_MS - 60_000).toISOString();
  const updates = [];
  const logs = [];
  const sentEmails = [];

  function createQuery(table) {
    const state = { filters: [] };
    const builder = {
      select() { return builder; },
      not() { return builder; },
      in() { return builder; },
      or() { return builder; },
      gte() { return builder; },
      eq(col, val) {
        state.filters.push([col, val]);
        return builder;
      },
      order() { return builder; },
      limit() { return builder; },
      update(values) {
        return {
          eq(col, val) {
            updates.push({ table, values, col, val });
            return Promise.resolve({ error: null });
          },
        };
      },
      insert(values) {
        logs.push({ table, values });
        return Promise.resolve({ error: null });
      },
      then(resolve) {
        if (table === 'profiles') {
          return Promise.resolve({
            data: [
              {
                id: 'user-with-msgs',
                email: 'msg@example.com',
                full_name: 'Riya',
                username: 'riya',
                last_digest_at: sixDaysAgo,
                created_at: sixDaysAgo,
                is_banned: false,
                settings: { notifications: { email: true } },
              },
              {
                id: 'user-quiet',
                email: 'quiet@example.com',
                full_name: 'Aarav',
                username: 'aarav',
                last_digest_at: sixDaysAgo,
                created_at: sixDaysAgo,
                is_banned: false,
                settings: null,
              },
            ],
            error: null,
          }).then(resolve);
        }
        if (table === 'posts') return Promise.resolve({ data: [], error: null }).then(resolve);
        if (table === 'conversation_participants') {
          return Promise.resolve({
            data: [{ conversation_id: 'c1', user_id: 'user-with-msgs' }],
            error: null,
          }).then(resolve);
        }
        if (table === 'messages') {
          return Promise.resolve({
            data: [{ conversation_id: 'c1', sender_id: 'other-user' }],
            error: null,
          }).then(resolve);
        }
        if (table === 'notifications') return Promise.resolve({ data: [], error: null }).then(resolve);
        return Promise.resolve({ data: [], error: null }).then(resolve);
      },
    };
    return builder;
  }

  const mockSupabase = { from: (t) => createQuery(t) };

  const summary = await runFiveDayDigest({
    supabase: mockSupabase,
    now,
    sendEmail: async (msg) => {
      sentEmails.push(msg);
      return { messageId: `<id-${sentEmails.length}@futoragroup.in>` };
    },
  });

  assert.equal(summary.processed, 2);
  assert.equal(summary.sent, 2);
  assert.equal(summary.skipped, 0);
  assert.equal(summary.failed, 0);
  assert.equal(sentEmails.length, 2);
  assert.match(sentEmails[0].subject, /1 unread message/i);
  assert.match(sentEmails[1].subject, /Check what is new on One/i);
  assert.equal(updates.length, 2);
  assert.equal(logs.length, 2);
});
