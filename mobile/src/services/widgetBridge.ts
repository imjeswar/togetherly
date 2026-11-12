import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { DashboardData } from '../types';

export interface WidgetDataPayload {
  daysTogether: number;
  streakCount: number;
  partnerName: string;
  partnerAvatarUrl?: string;
  dailyQuestionText: string;
  bothAnswered: boolean;
  partnerHasAnswered: boolean;
  latestLoveNoteSnippet?: string;
  latestPhotoUrl?: string;
  updatedAt: number;
}

const WIDGET_DATA_FILENAME = 'togetherly_widget_data.json';

export const widgetBridge = {
  /**
   * Updates widget shared storage for Android AppWidgets and iOS WidgetKit
   */
  updateWidgetData: async (dashboard: DashboardData, latestLoveNoteSnippet?: string) => {
    try {
      const payload: WidgetDataPayload = {
        daysTogether: dashboard.relationship?.daysTogether ?? 1,
        streakCount: dashboard.relationship?.streakCount ?? 1,
        partnerName: dashboard.partner?.firstName ?? 'Partner',
        partnerAvatarUrl: dashboard.partner?.avatarUrl,
        dailyQuestionText: dashboard.dailyQuestion?.text ?? "What made you smile thinking of us today?",
        bothAnswered: Boolean(dashboard.dailyQuestion?.bothAnswered),
        partnerHasAnswered: Boolean((dashboard.dailyQuestion?.partnerAnswer as any)?.hasAnswered),
        latestLoveNoteSnippet: latestLoveNoteSnippet ?? 'Sealed intimate letter',
        latestPhotoUrl: dashboard.photoChallenge?.photos?.[0]?.photoUrl,
        updatedAt: Date.now(),
      };

      const jsonStr = JSON.stringify(payload);

      // Save to local shared document directory
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

