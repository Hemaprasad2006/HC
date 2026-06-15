import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import api from './api';

export async function registerForPushNotifications() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Permission for push notifications not granted.');
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId;

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[Expo Push Token Generated]:', token.data);

    // Save subscription on backend
    await api.post('/push/subscribe', {
      endpoint: token.data,
      p256dh: 'expo',
      auth: 'expo',
    });

    return token.data;
  } catch (e) {
    console.warn('Failed to register for push notifications:', e);
    return null;
  }
}

// Global notifications handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});
