/**
 * Notification Service
 * Handles sending push notifications via Supabase Edge Function
 */

import { supabase } from '@/integrations/supabase/client';

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
}

/**
 * Send push notification to a single user
 * Calls Supabase Edge Function that handles FCM API
 */
export const sendPushNotification = async ({
    userId,
    title,
    body,
    data = {},
}: SendNotificationParams): Promise<void> => {
    try {
        // Get user's FCM token from profiles
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('fcm_token, digest_mode')
            .eq('id', userId)
            .single();

        if (profileError || !profile?.fcm_token) {
            return;
        }

        // Skip if user has digest mode enabled
        if (profile.digest_mode) {
            return;
        }

        // Call Supabase Edge Function to send notification
        const { data: result, error } = await supabase.functions.invoke('send-fcm-notification', {
            body: {
                tokens: [profile.fcm_token],
                title,
                body,
                data,
            },
        });

        if (error) {
            console.error('Error sending notification:', error);
            throw error;
        }

    } catch (error) {
        console.error('Error in sendPushNotification:', error);
        throw error;
    }
};

/**
 * Send push notifications to multiple users (bulk)
 * Useful for group messages, announcements, etc.
 */
export const sendBulkNotifications = async ({
    userIds,
    title,
    body,
    data = {},
}: BulkNotificationParams): Promise<void> => {
    try {
        // Get all users' FCM tokens
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('fcm_token, digest_mode')
            .in('id', userIds);

        if (profileError || !profiles || profiles.length === 0) {
            return;
        }

        // Filter out users with digest mode enabled and get tokens
        const tokens = profiles
            .filter(p => p.fcm_token && !p.digest_mode)
            .map(p => p.fcm_token);

        if (tokens.length === 0) {
            return;
        }

        // Call Supabase Edge Function to send bulk notifications
        const { data: result, error } = await supabase.functions.invoke('send-fcm-notification', {
            body: {
                tokens,
                title,
                body,
                data,
            },
        });

        if (error) {
            console.error('Error sending bulk notifications:', error);
            throw error;
        }

    } catch (error) {
        console.error('Error in sendBulkNotifications:', error);
        throw error;
    }
};

/**
 * Send notification when a new message is received
 */
export const sendMessageNotification = async (
    receiverId: string,
    senderName: string,
    messageContent: string
): Promise<void> => {
    await sendPushNotification({
        userId: receiverId,
        title: `New message from ${senderName}`,
        body: messageContent,
        data: {
            type: 'message',
            senderId: receiverId,
        },
    });
};

/**
 * Send notification when someone follows you
 */
export const sendFollowNotification = async (
    userId: string,
    followerName: string
): Promise<void> => {
    await sendPushNotification({
        userId,
        title: 'New Follower',
        body: `${followerName} started following you`,
        data: {
            type: 'follow',
        },
    });
};

/**
 * Send notification when someone likes your post
 */
export const sendLikeNotification = async (
    userId: string,
    likerName: string,
    postTitle: string
): Promise<void> => {
    await sendPushNotification({
        userId,
        title: 'New Like',
        body: `${likerName} liked your post: ${postTitle}`,
        data: {
            type: 'like',
        },
    });
};

/**
 * Send notification when someone comments on your post
 */
export const sendCommentNotification = async (
    userId: string,
    commenterName: string,
    commentText: string
): Promise<void> => {
    await sendPushNotification({
        userId,
        title: 'New Comment',
        body: `${commenterName} commented: ${commentText}`,
        data: {
            type: 'comment',
        },
    });
};
