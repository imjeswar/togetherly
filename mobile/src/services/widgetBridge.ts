import { Platform, NativeModules } from 'react-native';
import * as FileSystem from 'expo-file-system';

const { TogetherlyWidgetModule } = NativeModules;

export interface WidgetDataPayload {
  partnerName: string;
  isOnline: boolean;
  latestDrawingPreview?: string;
  latestDrawingTitle?: string;
  latestPhotoUrl?: string;
  latestPhotoCaption?: string;
  daysTogether: number;
  updatedAt: number;
}

const WIDGET_DATA_FILENAME = 'togetherly_widget_data.json';

export const widgetBridge = {
  /**
   * Updates drawing widget with actual rendered vector bitmap
   */
  updateDrawingWidget: async (title: string, canvasData: any) => {
    try {
      let strokesJson = '';
      if (typeof canvasData === 'string') {
        strokesJson = canvasData;
      } else if (Array.isArray(canvasData)) {
        strokesJson = JSON.stringify(canvasData);
      }

      if (!strokesJson) return;

      if (Platform.OS === 'android' && TogetherlyWidgetModule?.updateDrawing) {
        await TogetherlyWidgetModule.updateDrawing(title || 'Our Latest Doodle', strokesJson);
      }
    } catch (e) {
      console.warn('Failed to update drawing widget:', e);
    }
  },

  /**
   * Updates photo widget with latest received photo bitmap
   */
  updatePhotoWidget: async (localPhotoUriOrBase64: string, caption?: string) => {
    try {
      if (!localPhotoUriOrBase64) return;

      let finalTarget = localPhotoUriOrBase64;

      // If remote HTTP/HTTPS URL, download locally first via FileSystem for instant availability
      if (localPhotoUriOrBase64.startsWith('http://') || localPhotoUriOrBase64.startsWith('https://')) {
        try {
          const localCachePath = `${FileSystem.cacheDirectory}partner_widget_photo.jpg`;
          const downloadRes = await FileSystem.downloadAsync(localPhotoUriOrBase64, localCachePath);
          if (downloadRes?.uri) {
            finalTarget = downloadRes.uri;
          }
        } catch {
          // If JS download fails, keep remote URL for native background downloader
          finalTarget = localPhotoUriOrBase64;
        }
      }

      if (Platform.OS === 'android' && TogetherlyWidgetModule?.updatePhoto) {
        await TogetherlyWidgetModule.updatePhoto(finalTarget, caption || 'Our Latest Moment');
      }
    } catch (e) {
      console.warn('Failed to update photo widget:', e);
    }
  },

  /**
   * Updates space sanctuary widget with partner presence
   */
  updateSpaceWidget: async (partnerName: string, isOnline: boolean, daysTogether = 1) => {
    try {
      if (Platform.OS === 'android' && TogetherlyWidgetModule?.updatePartnerStatus) {
        await TogetherlyWidgetModule.updatePartnerStatus(partnerName || 'My Love', isOnline, daysTogether);
      }
    } catch (e) {
      console.warn('Failed to update space widget:', e);
    }
  },

  /**
   * Backward-compatible general update
   */
  updateWidgetData: async (data: Partial<WidgetDataPayload>) => {
    try {
      if (data.latestDrawingPreview) {
        await widgetBridge.updateDrawingWidget(
          data.latestDrawingTitle || 'Our Latest Doodle',
          data.latestDrawingPreview
        );
      }
      if (data.latestPhotoUrl) {
        await widgetBridge.updatePhotoWidget(
          data.latestPhotoUrl,
          data.latestPhotoCaption || 'Our Latest Moment'
        );
      }
      if (data.partnerName !== undefined || data.isOnline !== undefined) {
        await widgetBridge.updateSpaceWidget(
          data.partnerName || 'My Love',
          Boolean(data.isOnline),
          data.daysTogether || 1
        );
      }

      // Also persist JSON as fallback
      if (Platform.OS !== 'web') {
        const fileUri = `${FileSystem.documentDirectory}${WIDGET_DATA_FILENAME}`;
        await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Failed to sync widget data:', e);
    }
  },

  getWidgetData: async (): Promise<WidgetDataPayload | null> => {
    try {
      if (Platform.OS === 'web') return null;
      const fileUri = `${FileSystem.documentDirectory}${WIDGET_DATA_FILENAME}`;
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(fileUri);
        return JSON.parse(content);
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Syncs active credentials to native SharedPreferences for background FCM delivery
   */
  setSessionCredentials: async (authToken: string, deviceId: string, spaceId: string, apiUrl: string) => {
    try {
      if (Platform.OS === 'android' && TogetherlyWidgetModule?.setSessionCredentials) {
        await TogetherlyWidgetModule.setSessionCredentials(authToken, deviceId, spaceId, apiUrl);
      }
    } catch (e) {
      console.warn('Failed to set session credentials in native widget module:', e);
    }
  },

  /**
   * Gets current FCM push token from native module
   */
  getPushToken: async (): Promise<string | null> => {
    try {
      if (Platform.OS === 'android' && TogetherlyWidgetModule?.getPushToken) {
        return await TogetherlyWidgetModule.getPushToken();
      }
      return null;
    } catch {
      return null;
    }
  },
};
