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
  downloadUrl?: string;
}

export interface PhotoPushPayload {
  eventId: string;
  photoId: string;
  caption?: string;
  senderNickname: string;
  photoUrl: string;
}

function minifyCanvasData(raw: string): string {
  try {
    // 1. Minify whitespace
    let minified = JSON.stringify(JSON.parse(raw));
    // 2. Reduce decimal precision in SVG paths: e.g. 123.45678 -> 123.5
    minified = minified.replace(/(\d+\.\d{2,})/g, (m) => parseFloat(m).toFixed(1));
    return minified;
  } catch {
    return raw;
  }
}

export const fcmService = {
  /**
   * Sends high-priority FCM message (Notification + Data) to partner device for drawing delivery.
   * Having both notification AND data ensures Android delivers the heads-up notification
   * even if the app has been swiped away/killed by the user.
   */
  sendDrawingPush: async (
    token: string,
    payload: DrawingPushPayload,
    onInvalidToken?: () => Promise<void>
  ): Promise<boolean> => {
    if (!token) {
      console.warn('[FCM-DRAWING] Aborted: Token is empty');
      return false;
    }
    if (!initializeFirebase()) {
      console.warn('[FCM-DRAWING] Aborted: Firebase Admin not initialized');
      return false;
    }

    try {
      // Minify and check if it fits into FCM 4KB limit
      let safeCanvasData = '';
      if (payload.canvasData) {
        const minified = minifyCanvasData(payload.canvasData);
        if (minified.length <= 3700) {
          safeCanvasData = minified;
        }
      }

      const maskedToken = token.length > 12 ? `${token.substring(0, 6)}...${token.substring(token.length - 6)}` : 'token';
      console.log(`[FCM-DRAWING] Dispatching high-priority push for drawing ${payload.drawingId} to ${maskedToken}. Inline bytes: ${safeCanvasData.length}`);

      const message: Message = {
        token,
        notification: {
          title: `A sweet doodle from ${payload.senderNickname || 'Your Partner'} ✨`,
          body: payload.title || 'Tap to view the new drawing',
        },
        data: {
          type: 'NEW_DRAWING',
          eventId: payload.eventId,
          drawingId: payload.drawingId,
          title: payload.title || 'Sweet Doodle',
          senderNickname: payload.senderNickname || 'Your Partner',
          canvasData: safeCanvasData,
          previewUrl: payload.previewUrl || '',
          downloadUrl: payload.downloadUrl || '',
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'togetherly_moments',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
            clickAction: 'togetherly://canvas/quick',
          },
          ttl: 60 * 60 * 24 * 7, // 7 days retention in Google FCM queues
        },
      };

      const response = await getMessaging().send(message);
      console.log(`[FCM-DRAWING] Push ACCEPTED by Google FCM! Message ID: ${response}`);
      return true;
    } catch (error: any) {
      console.error('[FCM-DRAWING] Failed to send drawing push:', error.message);
      if (
        error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token'
      ) {
        console.warn('[FCM-DRAWING] Token invalid or unregistered. Cleaning up stale token.');
        await onInvalidToken?.();
      }
      return false;
    }
  },

  /**
   * Sends high-priority FCM message (Notification + Data) to partner device for photo delivery
   */
  sendPhotoPush: async (
    token: string,
    payload: PhotoPushPayload,
    onInvalidToken?: () => Promise<void>
  ): Promise<boolean> => {
    if (!token) {
      console.warn('[FCM-PHOTO] Aborted: Token is empty');
      return false;
    }
    if (!initializeFirebase()) {
      console.warn('[FCM-PHOTO] Aborted: Firebase Admin not initialized');
      return false;
    }

    try {
      const maskedToken = token.length > 12 ? `${token.substring(0, 6)}...${token.substring(token.length - 6)}` : 'token';
      console.log(`[FCM-PHOTO] Dispatching high-priority push for photo ${payload.photoId} to ${maskedToken}`);

      const message: Message = {
        token,
        notification: {
          title: `A live moment from ${payload.senderNickname || 'Your Partner'} 📷`,
          body: payload.caption || 'Tap to view the new photo moment',
        },
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
          notification: {
            channelId: 'togetherly_moments',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
            clickAction: 'togetherly://photos',
          },
          ttl: 60 * 60 * 24 * 7,
        },
      };

      const response = await getMessaging().send(message);
      console.log(`[FCM-PHOTO] Push ACCEPTED by Google FCM! Message ID: ${response}`);
      return true;
    } catch (error: any) {
      console.error('[FCM-PHOTO] Failed to send photo push:', error.message);
      if (
        error.code === 'messaging/registration-token-not-registered' ||
        error.code === 'messaging/invalid-registration-token'
      ) {
        console.warn('[FCM-PHOTO] Token invalid or unregistered. Cleaning up stale token.');
        await onInvalidToken?.();
      }
      return false;
    }
  },
};
