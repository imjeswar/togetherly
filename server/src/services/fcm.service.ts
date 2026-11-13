import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging, Message } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';

let isFirebaseInitialized = false;

function initializeFirebase(): boolean {
  if (isFirebaseInitialized) return true;

  try {
    if (getApps().length > 0) {
      isFirebaseInitialized = true;
      return true;
    }

    // 1. Check for inline JSON service account string in env
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      try {
        const credentials = JSON.parse(serviceAccountJson);
        initializeApp({
          credential: cert(credentials),
        });
        isFirebaseInitialized = true;
        console.log('[FCM] Firebase Admin SDK initialized from FIREBASE_SERVICE_ACCOUNT env');
        return true;
      } catch (err) {
        console.warn('[FCM] Failed to parse FIREBASE_SERVICE_ACCOUNT env as JSON:', err);
      }
    }

    // 2. Check for GOOGLE_APPLICATION_CREDENTIALS file path
    const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credsPath && fs.existsSync(credsPath)) {
      initializeApp({
        credential: cert(credsPath),
      });
      isFirebaseInitialized = true;
      console.log('[FCM] Firebase Admin SDK initialized from GOOGLE_APPLICATION_CREDENTIALS file');
      return true;
    }

    // 3. Check for local serviceAccountKey.json in server root
    const localKeyPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(localKeyPath)) {
      initializeApp({
        credential: cert(localKeyPath),
      });
      isFirebaseInitialized = true;
      console.log('[FCM] Firebase Admin SDK initialized from local serviceAccountKey.json');
      return true;
    }

    console.warn('[FCM] No Firebase service account credentials found. FCM background delivery in standby mode.');
    return false;
  } catch (error) {
    console.warn('[FCM] Error during Firebase Admin initialization:', error);
    return false;
  }
}

export interface DrawingPushPayload {
  eventId: string;
  drawingId: string;
  title: string;
  senderNickname: string;
  canvasData?: string;
  previewUrl?: string;
}

export interface PhotoPushPayload {
  eventId: string;
  photoId: string;
  caption?: string;
  senderNickname: string;
  photoUrl: string;
}

export const fcmService = {
  /**
   * Sends high-priority data message to partner device for drawing delivery
   */
  sendDrawingPush: async (
    token: string,
    payload: DrawingPushPayload,
    onInvalidToken?: () => Promise<void>
  ): Promise<boolean> => {
    if (!token) return false;
    if (!initializeFirebase()) return false;

    try {
      // Keep payload under 4KB limit
      const safeCanvasData =
        payload.canvasData && payload.canvasData.length < 3500 ? payload.canvasData : '';

      const message: Message = {
        token,
        data: {
          type: 'NEW_DRAWING',
          eventId: payload.eventId,
          drawingId: payload.drawingId,
          title: payload.title || 'Sweet Doodle',
          senderNickname: payload.senderNickname || 'Your Partner',
          canvasData: safeCanvasData,
          previewUrl: payload.previewUrl || '',
        },
        android: {
          priority: 'high',
          ttl: 60 * 60 * 24 * 7, // 7 days retention in Google FCM queues
        },
      };

      const response = await getMessaging().send(message);
      console.log('[FCM] Drawing push dispatched successfully. Message ID:', response);
      return true;
    } catch (error: any) {
      console.error('[FCM] Failed to send drawing push:', error.message);
      if (
        error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token'
      ) {
        await onInvalidToken?.();
      }
      return false;
    }
  },

  /**
   * Sends high-priority data message to partner device for photo delivery
   */
  sendPhotoPush: async (
    token: string,
    payload: PhotoPushPayload,
    onInvalidToken?: () => Promise<void>
  ): Promise<boolean> => {
    if (!token) return false;
    if (!initializeFirebase()) return false;

    try {
      const message: Message = {
        token,
        data: {
          type: 'NEW_PHOTO',
          eventId: payload.eventId,
          photoId: payload.photoId,
          caption: payload.caption || 'Our Latest Moment',
          senderNickname: payload.senderNickname || 'Your Partner',
          photoUrl: payload.photoUrl,
        },
        android: {
          priority: 'high',
          ttl: 60 * 60 * 24 * 7,
        },
      };

      const response = await getMessaging().send(message);
      console.log('[FCM] Photo push dispatched successfully. Message ID:', response);
      return true;
    } catch (error: any) {
      console.error('[FCM] Failed to send photo push:', error.message);
      if (
        error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token'
      ) {
        await onInvalidToken?.();
      }
      return false;
    }
  },
};
