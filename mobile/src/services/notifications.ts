import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { api } from './api';
import { ENV } from '../config/env';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isPrivacyMode = notification.request.content.data?.isPrivate ?? true;
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      // If privacy mode is on, don't preview sensitive intimacy content on lock screen
      priority: Notifications.AndroidNotificationPriority.HIGH,
    };
  },
});

export const notificationService = {
  /**
   * Request push notification permissions and register token with backend
   */
  registerForPushNotifications: async (): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') return null;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync();
      const pushToken = tokenData.data;

      // Update backend user profile / settings with push token
      await api.updateProfile({ pushToken }).catch(() => {});

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('togetherly_intimate', {
          name: 'Togetherly Moments',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E8A0A8',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE, // Redact on lock screen
        });
      }

      return pushToken;
    } catch {
      return null;
    }
  },

  /**
   * Listen to user tapping a notification to deep-link to the right screen
   */
  setupNotificationListeners: () => {
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.url) {
        Linking.openURL(data.url);
      } else if (data?.screen) {
        Linking.openURL(`${ENV.APP_SCHEME}${data.screen}`);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(responseListener);
    };
  },

  /**
   * Schedule anniversary reminder
   */
  scheduleAnniversaryReminder: async (title: string, body: string, triggerDate: Date) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { screen: 'memories' },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
        },
      });
    } catch {}
  },
};

