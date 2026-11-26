import { buildFiveDayDigestEmail, type DigestPostPreview, type EmailTemplate } from './email-templates.ts';
import { isValidEmailAddress, type EmailAddress } from './smtp-protocol.ts';

export const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

export interface DigestProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  username: string | null;
  last_digest_at: string | null;
  created_at: string | null;
  is_banned: boolean | null;
  settings: {
    notifications?: {
      email?: boolean;
    };
  } | null;
}

export interface DigestSummaryResult {
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  details: Array<{
    userId: string;
    email: string;
    status: 'sent' | 'skipped' | 'failed';
    reason?: string;
    messageId?: string | null;
  }>;
}

export type SendEmailFn = (params: {
  to: EmailAddress;
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
}) => Promise<{ messageId: string | null }>;

export interface DigestQueryResult<T = unknown> {
  data: T[] | null;
  error: { message: string } | null;
}

export interface DigestFilterBuilder {
  not(column: string, operator: string, value: unknown): DigestFilterBuilder;
  in(column: string, values: string[]): DigestFilterBuilder;
  or(filters: string): DigestFilterBuilder;
  gte(column: string, value: string): DigestFilterBuilder;
  eq(column: string, value: unknown): DigestFilterBuilder;
  order(column: string, opts?: { ascending?: boolean }): DigestFilterBuilder;
  limit(count: number): DigestFilterBuilder;
  then<TResult1 = DigestQueryResult>(
    onfulfilled?: ((value: DigestQueryResult) => TResult1 | PromiseLike<TResult1>) | null
  ): Promise<TResult1>;
}

export interface DigestSupabaseClient {
  from(table: string): {
    select(columns: string): DigestFilterBuilder;
    update(values: Record<string, unknown>): {
      eq(column: string, value: unknown): PromiseLike<{ error: { message: string } | null }>;
    };
    insert(values: Record<string, unknown>): PromiseLike<{ error: { message: string } | null }>;
  };
}

export function isDigestEligible(
  profile: DigestProfileRow,
  nowMs: number,
  force = false
): { eligible: boolean; reason?: string } {
  const email = (profile.email ?? '').trim();
  if (!isValidEmailAddress(email)) {
    return { eligible: false, reason: 'missing_or_invalid_email' };
  }
  if (profile.is_banned) {
    return { eligible: false, reason: 'user_banned' };
  }
  if (profile.settings?.notifications?.email === false && !force) {
    return { eligible: false, reason: 'email_notifications_disabled' };
  }
  if (!force) {
    const anchorIso = profile.last_digest_at ?? profile.created_at;
    if (anchorIso) {
      const anchorMs = Date.parse(anchorIso);
      if (Number.isFinite(anchorMs) && nowMs - anchorMs < FIVE_DAYS_MS) {
        return { eligible: false, reason: 'within_5_day_window' };
      }
    }
  }
  return { eligible: true };
}

export function formatPostExcerpt(content: string, maxLength = 120): string {
  const normalized = content.replace(/```[\s\S]*?```/g, '[code]').replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function runFiveDayDigest(params: {
  supabase: DigestSupabaseClient;
  sendEmail: SendEmailFn;
  appUrl?: string;
  now?: Date;
  force?: boolean;
  dryRun?: boolean;
  userIds?: string[];
  limit?: number;
}): Promise<DigestSummaryResult> {
  const now = params.now ?? new Date();
  const nowMs = now.getTime();
  const cutoffIso = new Date(nowMs - FIVE_DAYS_MS).toISOString();
  const batchLimit = Math.min(Math.max(params.limit ?? 100, 1), 500);

  let profilesQuery = params.supabase
    .from('profiles')
    .select('id, email, full_name, username, last_digest_at, created_at, is_banned, settings')
    .not('email', 'is', null)
    .limit(batchLimit);

  if (params.userIds && params.userIds.length > 0) {
    profilesQuery = profilesQuery.in('id', params.userIds);
  } else if (!params.force) {
    profilesQuery = profilesQuery.or(`last_digest_at.is.null,last_digest_at.lte.${cutoffIso}`);
  }

  const { data: profilesData, error: profilesError } = await profilesQuery;
  if (profilesError) {
    throw new Error(`Failed to fetch profiles for digest: ${profilesError.message}`);
  }

  const profiles = (profilesData ?? []) as DigestProfileRow[];
  const eligibleProfiles = profiles.filter((p) => isDigestEligible(p, nowMs, Boolean(params.force)).eligible);

  if (eligibleProfiles.length === 0) {
    return { processed: 0, sent: 0, skipped: 0, failed: 0, details: [] };
  }

  const eligibleIds = eligibleProfiles.map((p) => p.id);

  // Fetch recent posts from the past 5 days once for the whole batch
  const { data: recentPostsRaw } = await params.supabase
    .from('posts')
    .select('id, user_id, content, created_at')
    .gte('created_at', cutoffIso)
    .order('created_at', { ascending: false })
    .limit(10);

  const postRows = (recentPostsRaw ?? []) as Array<{
    id: string;
    user_id: string;
    content: string;
    created_at: string;
  }>;

  const postAuthorIds = [...new Set(postRows.map((p) => p.user_id))];
  const authorNameMap = new Map<string, string>();
  if (postAuthorIds.length > 0) {
    const { data: authorsData } = await params.supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', postAuthorIds);
    for (const a of (authorsData ?? []) as Array<{ id: string; full_name: string | null; username: string | null }>) {
      authorNameMap.set(a.id, (a.full_name || a.username || 'FutoraOne Member').trim());
    }
  }

  // Fetch conversation memberships and unread DMs for eligible users
  const { data: participantRows } = await params.supabase
    .from('conversation_participants')
    .select('conversation_id, user_id')
    .in('user_id', eligibleIds);

  const participants = (participantRows ?? []) as Array<{ conversation_id: string; user_id: string }>;
  const userConvs = new Map<string, Set<string>>();
  const allConvIds = new Set<string>();
  for (const row of participants) {
    if (!userConvs.has(row.user_id)) userConvs.set(row.user_id, new Set());
    userConvs.get(row.user_id)!.add(row.conversation_id);
    allConvIds.add(row.conversation_id);
  }

  const unreadDms: Array<{ conversation_id: string; sender_id: string }> = [];
  if (allConvIds.size > 0) {
    const { data: dmRows } = await params.supabase
      .from('messages')
      .select('conversation_id, sender_id')
      .in('conversation_id', [...allConvIds])
      .eq('is_read', false)
      .limit(2000);
    unreadDms.push(...((dmRows ?? []) as Array<{ conversation_id: string; sender_id: string }>));
  }

  // Fetch unread in-app notifications for eligible users
  const { data: notifRows } = await params.supabase
    .from('notifications')
    .select('user_id')
    .in('user_id', eligibleIds)
    .eq('is_read', false)
    .limit(2000);

  const unreadNotifCountMap = new Map<string, number>();
  for (const row of (notifRows ?? []) as Array<{ user_id: string }>) {
    unreadNotifCountMap.set(row.user_id, (unreadNotifCountMap.get(row.user_id) ?? 0) + 1);
  }

  const result: DigestSummaryResult = {
    processed: eligibleProfiles.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    details: [],
  };

  for (const profile of eligibleProfiles) {
    const recipientEmail = (profile.email ?? '').trim();
    const convSet = userConvs.get(profile.id) ?? new Set<string>();
    const unreadMessagesCount = unreadDms.filter(
      (m) => convSet.has(m.conversation_id) && m.sender_id !== profile.id
    ).length;
    const unreadNotificationsCount = unreadNotifCountMap.get(profile.id) ?? 0;

    const recentPosts: DigestPostPreview[] = postRows
      .filter((p) => p.user_id !== profile.id)
      .slice(0, 3)
      .map((p) => ({
        id: p.id,
        authorName: authorNameMap.get(p.user_id) ?? 'One Member',
        excerpt: formatPostExcerpt(p.content),
        createdAt: p.created_at,
      }));

    const template: EmailTemplate = buildFiveDayDigestEmail({
      name: profile.full_name || profile.username,
      unreadMessagesCount,
      unreadNotificationsCount,
      recentPosts,
      appUrl: params.appUrl,
    });

    if (params.dryRun) {
      result.sent += 1;
      result.details.push({
        userId: profile.id,
        email: recipientEmail,
        status: 'sent',
        reason: 'dry_run',
        messageId: null,
      });
      continue;
    }

    try {
      const sendRes = await params.sendEmail({
        to: { email: recipientEmail, name: profile.full_name || profile.username || undefined },
        subject: template.subject,
        text: template.text,
        html: template.html,
        headers: {
          'List-Unsubscribe': `<${(params.appUrl ?? 'https://futora1.vercel.app').replace(/\/+$/, '')}/settings>`,
        },
      });

      await Promise.all([
        params.supabase
          .from('profiles')
          .update({ last_digest_at: now.toISOString() })
          .eq('id', profile.id),
        params.supabase.from('email_logs').insert({
          user_id: profile.id,
          recipient_email: recipientEmail,
          email_type: 'digest_5day',
          subject: template.subject,
          status: 'sent',
          message_id: sendRes.messageId,
          metadata: { unreadMessagesCount, unreadNotificationsCount, newPostsCount: recentPosts.length },
        }),
      ]);

      result.sent += 1;
      result.details.push({
        userId: profile.id,
        email: recipientEmail,
        status: 'sent',
        messageId: sendRes.messageId,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      await params.supabase.from('email_logs').insert({
        user_id: profile.id,
        recipient_email: recipientEmail,
        email_type: 'digest_5day',
        subject: template.subject,
        status: 'failed',
        error_message: errorMessage,
        metadata: { unreadMessagesCount, unreadNotificationsCount, newPostsCount: recentPosts.length },
      });
      result.failed += 1;
      result.details.push({
        userId: profile.id,
        email: recipientEmail,
        status: 'failed',
        reason: errorMessage,
      });
    }
  }

  return result;
}
