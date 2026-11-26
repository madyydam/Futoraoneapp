import { initializeApp, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const getTrimmedEnv = (key: string) => {
  const val = import.meta.env[key];
  return typeof val === 'string' ? val.trim() : val;
};

let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let foregroundListenerAttached = false;

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

  try {
    if (config.apiKey && config.projectId && config.projectId !== 'undefined') {
      firebaseApp = initializeApp(config);
      messaging = getMessaging(firebaseApp);
      return { app: firebaseApp, messaging };
    }
  } catch (error) {
    console.error('FCM initialization error:', error);
  }
  return { app: null, messaging: null };
};

export const requestNotificationPermission = async (): Promise<string | null> => {
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  try {
    if (!('Notification' in window)) {
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.error('Notifications were blocked. Please enable them in browser settings.');
      return null;
    }

    const { messaging: fcm } = initFirebase();
    if (!fcm) return null;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope',
      });
      return await getToken(fcm, { vapidKey, serviceWorkerRegistration: registration });
    }

    return await getToken(fcm, { vapidKey });
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

export const saveFCMToken = async (userId: string, fcmToken: string): Promise<void> => {
  const platform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web';
  const { error: tokenErr } = await supabase
    .from('user_push_tokens' as never)
    .upsert({ user_id: userId, fcm_token: fcmToken, platform, updated_at: new Date().toISOString() } as never);

  if (tokenErr) throw tokenErr;
};

export const initializeFCM = async (userId: string): Promise<void> => {
  try {
    const token = await requestNotificationPermission();
    if (token) {
      await saveFCMToken(userId, token);

      if (messaging && !foregroundListenerAttached) {
        foregroundListenerAttached = true;
        onMessage(messaging, (payload) => {
          if (payload.notification?.title) {
            toast(payload.notification.title, {
              description: payload.notification.body,
            });
          }
        });
      }
    }
  } catch (error) {
    console.error('FCM initialization failed:', error);
  }
};

export const areNotificationsEnabled = (): boolean => {
  if (!('Notification' in window)) return false;
  return Notification.permission === 'granted';
};

export const removeFCMToken = async (userId: string): Promise<void> => {
  await supabase.from('user_push_tokens' as never).delete().eq('user_id', userId);
};
