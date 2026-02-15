/**
 * Firebase Cloud Messaging (FCM) Service
 * Handles push notification registration and token management
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper to get trimmed env vars
const getTrimmedEnv = (key: string) => {
    const val = import.meta.env[key];
    return typeof val === 'string' ? val.trim() : val;
};

// Lazy initialized Firebase app
let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;

const initFirebase = () => {
    if (firebaseApp) return { app: firebaseApp, messaging };

    const config = {
        apiKey: getTrimmedEnv('VITE_FIREBASE_API_KEY'),
        authDomain: getTrimmedEnv('VITE_FIREBASE_AUTH_DOMAIN'),
        projectId: getTrimmedEnv('VITE_FIREBASE_PROJECT_ID'),
        storageBucket: getTrimmedEnv('VITE_FIREBASE_STORAGE_BUCKET'),
        messagingSenderId: getTrimmedEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
        appId: getTrimmedEnv('VITE_FIREBASE_APP_ID'),
    };

    console.log('--- FCM CONFIG INITIALIZING ---');
    console.log('Project:', config.projectId);
    console.log('Key Check:', {
        length: config.apiKey?.length,
        starts: config.apiKey?.substring(0, 5),
        ends: config.apiKey?.substring(config.apiKey.length - 4)
    });

    try {
        if (config.apiKey && config.projectId && config.projectId !== 'undefined') {
            firebaseApp = initializeApp(config);
            messaging = getMessaging(firebaseApp);
            console.log('FCM: Firebase App & Messaging initialized.');
            return { app: firebaseApp, messaging };
        } else {
            console.warn('FCM: Init blocked - Incomplete config');
        }
    } catch (error) {
        console.error('FCM: Initialization error:', error);
    }
    return { app: null, messaging: null };
};

/**
 * Request notification permission and get FCM token
 * @returns FCM token or null
 */
export const requestNotificationPermission = async (): Promise<string | null> => {
    try {
        // Check if browser supports notifications
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return null;
        }

        // Request permission
        const permission = await Notification.requestPermission();

        if (permission !== 'granted') {
            console.log('Notification permission denied');
            toast.error("Notifications were blocked. Please enable them in browser settings.", {
                description: "Click the lock icon in the URL bar to reset."
            });
            return null;
        }

        const { messaging } = initFirebase();

        // Get FCM token
        if (!messaging) {
            console.warn('FCM: Messaging not initialized. Check Vercel Env Vars.');
            return null;
        }

        // Register service worker explicitly
        if ('serviceWorker' in navigator) {
            try {
                const swUrl = `/firebase-messaging-sw.js?v=${Date.now()}`;
                console.log('FCM: Final Step! Registering SW:', swUrl);
                console.log('FCM: Using Project ID:', getTrimmedEnv('VITE_FIREBASE_PROJECT_ID'));
                console.log('FCM: Using API Key:', getTrimmedEnv('VITE_FIREBASE_API_KEY')?.substring(0, 5) + '...');

                const registration = await navigator.serviceWorker.register(swUrl);
                console.log('FCM: Service Worker Registered with Buster:', swUrl);

                const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
                const token = await getToken(messaging, {
                    vapidKey,
                    serviceWorkerRegistration: registration
                });
                return token;
            } catch (swError) {
                console.error('FCM: Service Worker Link Error:', swError);
                toast.error("FCM: SW registration failed.");
                return null;
            }
        } else {
            const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
            const token = await getToken(messaging, { vapidKey });
            return token;
        }

    } catch (error) {
        console.error('Error getting FCM token:', error);
        const errorMessage = error instanceof Error ? error.message : '';

        // If it's a 400 or API Key error, try clearing IndexedDB which often stores old project state
        if (errorMessage.includes('API key not valid') || errorMessage.includes('400')) {
            console.warn('FCM: Attempting to clear stale IndexedDB...');
            try {
                window.indexedDB.deleteDatabase('firebase-installations-database');
                window.indexedDB.deleteDatabase('firebase-messaging-database');
            } catch (e) {
                console.error('FCM: Failed to clear IDB:', e);
            }
        }
        return null;
    }
};

/**
 * Save FCM token to user profile in Supabase
 * @param userId User ID
 * @param fcmToken FCM token
 */
export const saveFCMToken = async (userId: string, fcmToken: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ fcm_token: fcmToken })
            .eq('id', userId);

        if (error) {
            console.error('Error saving FCM token:', error);
            throw error;
        }

    } catch (error) {
        console.error('Error in saveFCMToken:', error);
        throw error;
    }
};

/**
 * Initialize FCM and setup message listener
 * @param userId Current user ID
 */
export const initializeFCM = async (userId: string): Promise<void> => {
    try {
        console.log('FCM: Initializing for user:', userId);

        // Request permission and get token
        const token = await requestNotificationPermission();

        if (token) {
            console.log('FCM: Token generated successfully:', token.substring(0, 10) + '...');

            // Save token to database
            await saveFCMToken(userId, token);
            console.log('FCM: Token saved to Supabase profile.');
            toast.success("Push notifications enabled! 🚀");

            // Listen for foreground messages
            if (messaging) {
                onMessage(messaging, (payload) => {
                    console.log('FCM: Foreground message received:', payload);

                    // Show in-app notification if title exists
                    if (payload.notification?.title) {
                        toast(payload.notification.title, {
                            description: payload.notification.body,
                        });
                    }

                    // Show browser notification
                    if (payload.notification) {
                        new Notification(payload.notification.title || 'FutoraOne', {
                            body: payload.notification.body,
                            icon: '/app-icon.png',
                            badge: '/favicon.png',
                        });
                    }
                });
                console.log('FCM: Foreground listener active.');
            }
        } else {
            console.warn('FCM: No token generated. Check console for errors or permission status.');
            // Only toast if permission was explicitly granted but token failed
            if (Notification.permission === 'granted') {
                toast.error("FCM Token failed. Refresh and try again.");
            }
        }
    } catch (error) {
        console.error('FCM: Initialization failed:', error);
        toast.error("Failed to setup notifications. Check console.");
    }
};

/**
 * Check if notifications are enabled
 */
export const areNotificationsEnabled = (): boolean => {
    if (!('Notification' in window)) {
        return false;
    }
    return Notification.permission === 'granted';
};

/**
 * Remove FCM token from user profile
 * @param userId User ID
 */
export const removeFCMToken = async (userId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ fcm_token: null })
            .eq('id', userId);

        if (error) {
            console.error('Error removing FCM token:', error);
            throw error;
        }

    } catch (error) {
        console.error('Error in removeFCMToken:', error);
        throw error;
    }
};
