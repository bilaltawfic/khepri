/**
 * Push Notification Service for Daily Check-in Reminders
 *
 * This module provides the foundation for push notifications in the Khepri app.
 * It handles:
 * - Permission requests
 * - Daily check-in reminder scheduling
 * - Notification tap handling
 *
 * SETUP REQUIRED:
 * 1. Install expo-notifications: `npx expo install expo-notifications expo-device`
 * 2. Add to app.json:
 *    {
 *      "expo": {
 *        "plugins": [
 *          [
 *            "expo-notifications",
 *            {
 *              "icon": "./assets/notification-icon.png",
 *              "color": "#1a5f4a"
 *            }
 *          ]
 *        ]
 *      }
 *    }
 * 3. For iOS, configure push notification entitlements in Xcode
 * 4. For Android, configure Firebase Cloud Messaging
 */

// Placeholder types until expo-notifications is installed
type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';

type DailyReminderConfig = {
  hour: number;
  minute: number;
  enabled: boolean;
};

type NotificationSettings = {
  dailyReminder: DailyReminderConfig;
  permissionStatus: NotificationPermissionStatus;
};

const DEFAULT_REMINDER_CONFIG: DailyReminderConfig = {
  hour: 7,
  minute: 0,
  enabled: true,
};

/**
 * Check if notifications are supported on the current device/platform
 */
export function isNotificationsSupported(): boolean {
  // Web doesn't support Expo notifications in the same way
  // This will be properly implemented when expo-notifications is installed
  return true;
}

/**
 * Request notification permissions from the user
 * Returns the permission status
 */
export async function requestNotificationPermissions(): Promise<NotificationPermissionStatus> {
  // TODO: Implement with expo-notifications
  // const { status: existingStatus } = await Notifications.getPermissionsAsync();
  // let finalStatus = existingStatus;
  //
  // if (existingStatus !== 'granted') {
  //   const { status } = await Notifications.requestPermissionsAsync();
  //   finalStatus = status;
  // }
  //
  // return finalStatus;

  console.log('[Notifications] Permission request - expo-notifications not yet installed');
  return 'undetermined';
}

/**
 * Get the current notification permission status
 */
export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  // TODO: Implement with expo-notifications
  // const { status } = await Notifications.getPermissionsAsync();
  // return status;

  console.log('[Notifications] Get permission status - expo-notifications not yet installed');
  return 'undetermined';
}

/**
 * Schedule the daily check-in reminder notification
 */
export async function scheduleDailyReminder(
  config: DailyReminderConfig = DEFAULT_REMINDER_CONFIG
): Promise<string | null> {
  if (!config.enabled) {
    await cancelDailyReminder();
    return null;
  }

  // TODO: Implement with expo-notifications
  // First cancel any existing daily reminder
  // await cancelDailyReminder();
  //
  // const identifier = await Notifications.scheduleNotificationAsync({
  //   content: {
  //     title: "Good morning! 🌅",
  //     body: "Time for your daily check-in. How are you feeling today?",
  //     data: { screen: 'checkin' },
  //     sound: true,
  //   },
  //   trigger: {
  //     type: 'daily',
  //     hour: config.hour,
  //     minute: config.minute,
  //   },
  // });
  //
  // return identifier;

  console.log(
    `[Notifications] Schedule daily reminder at ${config.hour}:${config.minute.toString().padStart(2, '0')} - expo-notifications not yet installed`
  );
  return null;
}

/**
 * Cancel the daily check-in reminder
 */
export async function cancelDailyReminder(): Promise<void> {
  // TODO: Implement with expo-notifications
  // await Notifications.cancelAllScheduledNotificationsAsync();

  console.log('[Notifications] Cancel daily reminder - expo-notifications not yet installed');
}

/**
 * Get all scheduled notifications (for debugging)
 */
export async function getScheduledNotifications(): Promise<unknown[]> {
  // TODO: Implement with expo-notifications
  // return await Notifications.getAllScheduledNotificationsAsync();

  console.log('[Notifications] Get scheduled - expo-notifications not yet installed');
  return [];
}

/**
 * Set up notification response handler
 * This should be called in the app root to handle notification taps
 */
export function setupNotificationHandler(
  _onNotificationTap: (data: { screen?: string }) => void
): () => void {
  // TODO: Implement with expo-notifications
  // const subscription = Notifications.addNotificationResponseReceivedListener(response => {
  //   const data = response.notification.request.content.data;
  //   _onNotificationTap(data);
  // });
  //
  // return () => subscription.remove();

  console.log('[Notifications] Setup handler - expo-notifications not yet installed');
  return () => {
    // Cleanup function
  };
}

/**
 * Configure notification behavior (e.g., should show alerts when app is foreground)
 */
export function configureNotificationBehavior(): void {
  // TODO: Implement with expo-notifications
  // Notifications.setNotificationHandler({
  //   handleNotification: async () => ({
  //     shouldShowAlert: true,
  //     shouldPlaySound: true,
  //     shouldSetBadge: false,
  //   }),
  // });

  console.log('[Notifications] Configure behavior - expo-notifications not yet installed');
}

/**
 * Send a local test notification (for development/testing)
 */
export async function sendTestNotification(): Promise<void> {
  // TODO: Implement with expo-notifications
  // await Notifications.scheduleNotificationAsync({
  //   content: {
  //     title: "Test Notification",
  //     body: "This is a test notification from Khepri",
  //     data: { screen: 'checkin' },
  //   },
  //   trigger: null, // Immediate
  // });

  console.log('[Notifications] Send test notification - expo-notifications not yet installed');
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
 * Initialize notifications on app startup
 * Call this in the app root layout
 */
export async function initializeNotifications(): Promise<NotificationSettings> {
  // Configure notification behavior
  configureNotificationBehavior();

  // Get current permission status
  const permissionStatus = await getNotificationPermissionStatus();

  // If permissions are granted, ensure daily reminder is scheduled
  if (permissionStatus === 'granted') {
    await scheduleDailyReminder(DEFAULT_REMINDER_CONFIG);
  }

  return {
    dailyReminder: DEFAULT_REMINDER_CONFIG,
    permissionStatus,
  };
}
