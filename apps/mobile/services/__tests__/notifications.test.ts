import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  cancelDailyReminder,
  configureNotificationBehavior,
  getDefaultNotificationSettings,
  getNotificationPermissionStatus,
  getScheduledNotifications,
  initializeNotifications,
  isNotificationsSupported,
  requestNotificationPermissions,
  scheduleDailyReminder,
  sendTestNotification,
  setupNotificationHandler,
} from '../notifications';

let mockIsDevice = true;

jest.mock('expo-notifications', () => ({
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
    UNDETERMINED: 'undetermined',
  },
  SchedulableTriggerInputTypes: {
    DAILY: 'daily',
  },
  AndroidImportance: {
    DEFAULT: 5,
  },
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
}));

jest.mock('expo-device', () => ({
  get isDevice() {
    return mockIsDevice;
  },
}));

const mockedNotifications = Notifications as jest.Mocked<typeof Notifications>;

describe('Notification Service', () => {
  const originalOS = Platform.OS;

  beforeEach(() => {
    jest.resetAllMocks();
    // Default to iOS physical device for most tests
    Platform.OS = 'ios';
    mockIsDevice = true;
  });

  afterEach(() => {
    Platform.OS = originalOS;
  });

  describe('isNotificationsSupported', () => {
    it('returns true on a physical device (non-web)', () => {
      expect(isNotificationsSupported()).toBe(true);
    });

    it('returns false on web platform', () => {
      Platform.OS = 'web';
      expect(isNotificationsSupported()).toBe(false);
    });

    it('returns false on simulator', () => {
      mockIsDevice = false;
      expect(isNotificationsSupported()).toBe(false);
    });
  });

  describe('requestNotificationPermissions', () => {
    it('returns granted when already granted', async () => {
      mockedNotifications.getPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      const status = await requestNotificationPermissions();
      expect(status).toBe('granted');
      expect(mockedNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it('requests permissions when not granted', async () => {
      mockedNotifications.getPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.UNDETERMINED,
        granted: false,
        canAskAgain: true,
        expires: 'never',
      });
      mockedNotifications.requestPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      const status = await requestNotificationPermissions();
      expect(status).toBe('granted');
      expect(mockedNotifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('returns denied when user denies', async () => {
      mockedNotifications.getPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.UNDETERMINED,
        granted: false,
        canAskAgain: true,
        expires: 'never',
      });
      mockedNotifications.requestPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: false,
        expires: 'never',
      });

      const status = await requestNotificationPermissions();
      expect(status).toBe('denied');
    });

    it('returns undetermined on unsupported platform', async () => {
      mockIsDevice = false;

      const status = await requestNotificationPermissions();
      expect(status).toBe('undetermined');
      expect(mockedNotifications.getPermissionsAsync).not.toHaveBeenCalled();
    });
  });

  describe('getNotificationPermissionStatus', () => {
    it('returns granted status', async () => {
      mockedNotifications.getPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });

      const status = await getNotificationPermissionStatus();
      expect(status).toBe('granted');
    });

    it('returns denied status', async () => {
      mockedNotifications.getPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: false,
        expires: 'never',
      });

      const status = await getNotificationPermissionStatus();
      expect(status).toBe('denied');
    });

    it('returns undetermined on unsupported platform', async () => {
      mockIsDevice = false;

      const status = await getNotificationPermissionStatus();
      expect(status).toBe('undetermined');
    });
  });

  describe('scheduleDailyReminder', () => {
    it('schedules a daily notification with default config', async () => {
      mockedNotifications.scheduleNotificationAsync.mockResolvedValue('notif-123');

      const id = await scheduleDailyReminder();
      expect(id).toBe('notif-123');
      expect(mockedNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Good morning!',
          body: 'Time for your daily check-in.',
          data: { screen: 'checkin' },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 7,
          minute: 0,
        },
      });
    });

    it('schedules with custom time', async () => {
      mockedNotifications.scheduleNotificationAsync.mockResolvedValue('notif-456');

      const id = await scheduleDailyReminder({ hour: 9, minute: 30, enabled: true });
      expect(id).toBe('notif-456');
      expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: 9,
            minute: 30,
          },
        })
      );
    });

    it('cancels and returns null when disabled', async () => {
      const id = await scheduleDailyReminder({ hour: 7, minute: 0, enabled: false });
      expect(id).toBeNull();
      expect(mockedNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
      expect(mockedNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('returns null on unsupported platform', async () => {
      mockIsDevice = false;

      const id = await scheduleDailyReminder({ hour: 7, minute: 0, enabled: true });
      expect(id).toBeNull();
      expect(mockedNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });
  });

  describe('cancelDailyReminder', () => {
    it('calls cancelAllScheduledNotificationsAsync', async () => {
      await cancelDailyReminder();
      expect(mockedNotifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    });
  });

  describe('getScheduledNotifications', () => {
    it('returns scheduled notifications', async () => {
      const mockNotifications = [
        { identifier: 'notif-1', content: {}, trigger: {} },
      ] as unknown as Notifications.NotificationRequest[];

      mockedNotifications.getAllScheduledNotificationsAsync.mockResolvedValue(mockNotifications);

      const result = await getScheduledNotifications();
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('setupNotificationHandler', () => {
    it('registers a response listener and returns cleanup', () => {
      const mockRemove = jest.fn();
      mockedNotifications.addNotificationResponseReceivedListener.mockReturnValue({
        remove: mockRemove,
      } as unknown as Notifications.EventSubscription);

      const onTap = jest.fn();
      const cleanup = setupNotificationHandler(onTap);

      expect(mockedNotifications.addNotificationResponseReceivedListener).toHaveBeenCalled();
      expect(typeof cleanup).toBe('function');

      cleanup();
      expect(mockRemove).toHaveBeenCalled();
    });

    it('calls onTap with notification data when tapped', () => {
      mockedNotifications.addNotificationResponseReceivedListener.mockImplementation((callback) => {
        callback({
          notification: {
            request: {
              content: {
                data: { screen: 'checkin' },
              },
            },
          },
        } as unknown as Notifications.NotificationResponse);

        return { remove: jest.fn() } as unknown as Notifications.EventSubscription;
      });

      const onTap = jest.fn();
      setupNotificationHandler(onTap);

      expect(onTap).toHaveBeenCalledWith({ screen: 'checkin' });
    });
  });

  describe('configureNotificationBehavior', () => {
    it('calls setNotificationHandler with correct config', () => {
      configureNotificationBehavior();

      expect(mockedNotifications.setNotificationHandler).toHaveBeenCalledWith({
        handleNotification: expect.any(Function),
      });
    });

    it('handler returns correct notification behavior', async () => {
      configureNotificationBehavior();

      const handlerCall = mockedNotifications.setNotificationHandler.mock.calls[0];
      if (!handlerCall) {
        throw new Error('setNotificationHandler was not called');
      }

      const handler = (handlerCall[0] as { handleNotification: () => Promise<unknown> })
        .handleNotification;
      const result = await handler();

      expect(result).toEqual({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      });
    });
  });

  describe('sendTestNotification', () => {
    it('schedules an immediate notification', async () => {
      await sendTestNotification();

      expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Test Notification',
          body: 'This is a test notification from Khepri',
          data: { screen: 'checkin' },
        },
        trigger: null,
      });
    });
  });

  describe('getDefaultNotificationSettings', () => {
    it('returns correct default settings', () => {
      const settings = getDefaultNotificationSettings();
      expect(settings).toEqual({
        dailyReminder: {
          hour: 7,
          minute: 0,
          enabled: true,
        },
        permissionStatus: 'undetermined',
      });
    });
  });

  describe('initializeNotifications', () => {
    it('configures behavior and returns settings', async () => {
      mockedNotifications.getPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.UNDETERMINED,
        granted: false,
        canAskAgain: true,
        expires: 'never',
      });

      const settings = await initializeNotifications();

      expect(mockedNotifications.setNotificationHandler).toHaveBeenCalled();
      expect(settings).toEqual({
        dailyReminder: { hour: 7, minute: 0, enabled: true },
        permissionStatus: 'undetermined',
      });
    });

    it('schedules reminders when permissions are granted', async () => {
      mockedNotifications.getPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.GRANTED,
        granted: true,
        canAskAgain: true,
        expires: 'never',
      });
      mockedNotifications.scheduleNotificationAsync.mockResolvedValue('notif-init');

      const settings = await initializeNotifications();

      expect(settings.permissionStatus).toBe('granted');
      expect(mockedNotifications.scheduleNotificationAsync).toHaveBeenCalled();
    });

    it('does not schedule reminders when permissions not granted', async () => {
      mockedNotifications.getPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.DENIED,
        granted: false,
        canAskAgain: false,
        expires: 'never',
      });

      const settings = await initializeNotifications();

      expect(settings.permissionStatus).toBe('denied');
      expect(mockedNotifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    });

    it('sets up Android notification channel', async () => {
      Platform.OS = 'android';

      mockedNotifications.getPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.UNDETERMINED,
        granted: false,
        canAskAgain: true,
        expires: 'never',
      });

      await initializeNotifications();

      expect(mockedNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
        'daily-reminders',
        {
          name: 'Daily Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
          vibrationPattern: [0, 250, 250, 250],
        }
      );
    });

    it('does not set up notification channel on iOS', async () => {
      mockedNotifications.getPermissionsAsync.mockResolvedValue({
        status: Notifications.PermissionStatus.UNDETERMINED,
        granted: false,
        canAskAgain: true,
        expires: 'never',
      });

      await initializeNotifications();

      expect(mockedNotifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    });
  });
});
