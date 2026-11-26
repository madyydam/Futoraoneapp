import { sendPushNotification as sendFCMPush } from "@/services/notification.service";

/**
 * @deprecated Use @/services/notification.service instead
 * Wrapper for backward compatibility
 */
export const sendPushNotification = async (userId: string, message: string) => {
    try {
        await sendFCMPush({
            userId,
            title: "One",
            body: message
        });
    } catch (error) {
        console.error('Error sending push notification (wrapper):', error);
    }
};
