import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

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
   * Updates widget shared storage for Android AppWidgets & iOS WidgetKit
   */
  updateWidgetData: async (data: Partial<WidgetDataPayload>) => {
    try {
      const payload: WidgetDataPayload = {
        partnerName: data.partnerName || 'Partner',
        isOnline: Boolean(data.isOnline),
        latestDrawingPreview: data.latestDrawingPreview,
        latestDrawingTitle: data.latestDrawingTitle || 'Quick Doodle',
        latestPhotoUrl: data.latestPhotoUrl,
        latestPhotoCaption: data.latestPhotoCaption,
        daysTogether: data.daysTogether || 1,
        updatedAt: Date.now(),
      };

      const jsonStr = JSON.stringify(payload);

      if (Platform.OS !== 'web') {
        const fileUri = `${FileSystem.documentDirectory}${WIDGET_DATA_FILENAME}`;
        await FileSystem.writeAsStringAsync(fileUri, jsonStr);
      }

      return payload;
    } catch {
      return null;
    }
  },

  /**
   * Reads widget shared data payload
   */
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
};
