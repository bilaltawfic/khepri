/**
 * Push Notification Service for Daily Check-in Reminders
 *
 * Handles permission requests, daily check-in reminder scheduling,
 * and notification tap handling using expo-notifications.
 */

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

type DailyReminderConfig = {
  readonly hour: number;
  readonly minute: number;
  readonly enabled: boolean;
};

type NotificationSettings = {
  readonly dailyReminder: DailyReminderConfig;
  readonly permissionStatus: NotificationPermissionStatus;
};

const DEFAULT_REMINDER_CONFIG: DailyReminderConfig = {
  hour: 7,
  minute: 0,
  enabled: true,
};

function mapPermissionStatus(status: Notifications.PermissionStatus): NotificationPermissionStatus {
  switch (status) {
    case Notifications.PermissionStatus.GRANTED:
      return 'granted';
    case Notifications.PermissionStatus.DENIED:
      return 'denied';
    case Notifications.PermissionStatus.UNDETERMINED:
      return 'undetermined';
    default:
      return 'undetermined';
  }
}

/**
 * Check if notifications are supported on the current device/platform
 */
export function isNotificationsSupported(): boolean {
  return Device.isDevice && Platform.OS !== 'web';
}

/**
 * Request notification permissions from the user
 */
export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  if (!isNotificationsSupported()) {
    return 'undetermined';
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') {
    return 'granted';
  }

  const { status } = await Notifications.requestPermissionsAsync();
  return mapPermissionStatus(status);
}

/**
 * Get the current notification permission status
 */
export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (!isNotificationsSupported()) {
    return 'undetermined';
  }

  const { status } = await Notifications.getPermissionsAsync();
  return mapPermissionStatus(status);
}

/**
 * Schedule the daily check-in reminder notification
 * Returns notification identifier, or null if disabled/not supported
 */
export async function scheduleDailyReminder(
  config: DailyReminderConfig = DEFAULT_REMINDER_CONFIG
): Promise<string | null> {
  if (!config.enabled) {
    await cancelDailyReminder();
    return null;
  }

  if (!isNotificationsSupported()) {
    return null;
  }

  await cancelDailyReminder();

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Good morning!',
      body: 'Time for your daily check-in.',
      data: { screen: 'checkin' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: config.hour,
      minute: config.minute,
    },
  });

  return identifier;
}

/**
 * Cancel the daily check-in reminder
 */
export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications (for debugging)
 */
export async function getScheduledNotifications(): Promise<
  readonly Notifications.NotificationRequest[]
> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Set up notification response handler
 * This should be called in the app root to handle notification taps
 */
export function setupNotificationHandler(
  onNotificationTap: (data: { readonly screen?: string }) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      readonly screen?: string;
    };
    onNotificationTap(data);
  });

  return () => subscription.remove();
}

/**
 * Configure notification behavior (foreground display)
 */
export function configureNotificationBehavior(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Send a local test notification (for development/testing)
 */
export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Test Notification',
      body: 'This is a test notification from Khepri',
      data: { screen: 'checkin' },
    },
    trigger: null,
  });
}

/**
 * Get the default notification settings
 */
export function getDefaultNotificationSettings(): NotificationSettings {
  return {
    dailyReminder: DEFAULT_REMINDER_CONFIG,
    permissionStatus: 'undetermined',
  };
}

/**
 * Set up Android notification channel
 */
async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminders', {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

/**
 * Initialize notifications on app startup
 * Call this in the app root layout
 */
export async function initializeNotifications(): Promise<NotificationSettings> {
  configureNotificationBehavior();

  await setupAndroidChannel();

  const permissionStatus = await getNotificationPermissionStatus();

  if (permissionStatus === 'granted') {
    await scheduleDailyReminder(DEFAULT_REMINDER_CONFIG);
  }

  return {
    dailyReminder: DEFAULT_REMINDER_CONFIG,
    permissionStatus,
  };
}
