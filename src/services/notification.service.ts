import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const PUSH_UNAVAILABLE_KEY = 'one_push_fn_unavailable';

function isPushTemporarilyDisabled(): boolean {
  try {
    return sessionStorage.getItem(PUSH_UNAVAILABLE_KEY) === '1';
  } catch {
    return false;
  }
}

function markPushTemporarilyDisabled(): void {
  try {
    sessionStorage.setItem(PUSH_UNAVAILABLE_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

interface SendNotificationParams {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface BulkNotificationParams {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  isBroadcast?: boolean;
}

/**
 * Send push notification to a single user via hardened Edge Function.
 * FCM tokens are resolved strictly server-side.
 */
export const sendPushNotification = async ({
  userId,
  title,
  body,
  data = {},
}: SendNotificationParams): Promise<void> => {
  if (isPushTemporarilyDisabled()) return;

  try {
    const { error } = await supabase.functions.invoke('send-fcm-notification', {
      body: {
        userIds: [userId],
        title,
        body,
        data,
        isBroadcast: false,
      },
    });

    if (error) {
      // Avoid spamming repeated 400/404/503 preflight/invoke errors in browser DevTools
      markPushTemporarilyDisabled();
      logger.warn('Push notification skipped');
    }
  } catch {
    markPushTemporarilyDisabled();
    logger.warn('Push notification unavailable');
  }
};

/**
 * Send push notifications to multiple users (admin broadcasts).
 */
export const sendBulkNotifications = async ({
  userIds,
  title,
  body,
  data = {},
  isBroadcast = true,
}: BulkNotificationParams): Promise<void> => {
  if (!userIds.length) return;
  const { error } = await supabase.functions.invoke('send-fcm-notification', {
    body: {
      userIds,
      title,
      body,
      data,
      isBroadcast,
    },
  });

  if (error) {
    throw error;
  }
};

export const sendMessageNotification = async (
  receiverId: string,
  senderName: string,
  messageContent: string
): Promise<void> => {
  await sendPushNotification({
    userId: receiverId,
    title: `New message from ${senderName}`,
    body: messageContent.slice(0, 200),
    data: { type: 'message' },
  });
};

export const sendFollowNotification = async (
  userId: string,
  followerName: string
): Promise<void> => {
  await sendPushNotification({
    userId,
    title: 'New Follower',
    body: `${followerName} started following you`,
    data: { type: 'follow' },
  });
};

export const sendLikeNotification = async (
  userId: string,
  likerName: string,
  postTitle: string
): Promise<void> => {
  await sendPushNotification({
    userId,
    title: 'New Like',
    body: `${likerName} liked your post: ${postTitle.slice(0, 100)}`,
    data: { type: 'like' },
  });
};

export const sendCommentNotification = async (
  userId: string,
  commenterName: string,
  commentText: string
): Promise<void> => {
  await sendPushNotification({
    userId,
    title: 'New Comment',
    body: `${commenterName} commented: ${commentText.slice(0, 120)}`,
    data: { type: 'comment' },
  });
};
