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

const ALLOWED_SCREENS = ['checkin'] as const;

const ANDROID_CHANNEL_ID = 'daily-reminders';

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

function isAllowedScreen(screen: unknown): screen is (typeof ALLOWED_SCREENS)[number] {
  return (
    typeof screen === 'string' &&
    ALLOWED_SCREENS.includes(screen as (typeof ALLOWED_SCREENS)[number])
  );
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

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') {
      return 'granted';
    }

    const { status } = await Notifications.requestPermissionsAsync();
    return mapPermissionStatus(status);
  } catch {
    return 'undetermined';
  }
}

/**
 * Get the current notification permission status
 */
export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (!isNotificationsSupported()) {
    return 'undetermined';
  }

  try {
    const { status } = await Notifications.getPermissionsAsync();
    return mapPermissionStatus(status);
  } catch {
    return 'undetermined';
  }
}

/**
 * Schedule the daily check-in reminder notification.
 * Returns notification identifier, or null if disabled/not supported/not permitted.
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

  try {
    const permissionStatus = await getNotificationPermissionStatus();
    if (permissionStatus !== 'granted') {
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
        channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
      },
    });

    return identifier;
  } catch {
    return null;
  }
}

/**
 * Cancel the daily check-in reminder
 */
export async function cancelDailyReminder(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Gracefully ignore cancellation errors
  }
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
 * Set up notification response handler.
 * Only navigates to whitelisted screens for security.
 */
export function setupNotificationHandler(
  onNotificationTap: (data: { readonly screen: string }) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const { screen } = response.notification.request.content.data as {
      readonly screen?: unknown;
    };
    if (isAllowedScreen(screen)) {
      onNotificationTap({ screen });
    }
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
 * Set up Android notification channel.
 * expo-notifications uses the default channel when channelId is specified in the trigger.
 */
async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: 'Daily Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    } catch {
      // Gracefully ignore channel setup errors on non-Android or older versions
    }
  }
}

/**
 * Initialize notifications on app startup.
 * Call this in the app root layout.
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
