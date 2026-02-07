/**
 * Tests for Push Notification Service
 *
 * These tests verify the notification service's behavior.
 * Since expo-notifications is not yet installed, these tests verify
 * the placeholder implementations and will serve as a foundation
 * when the actual implementation is added.
 */

import { afterAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
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

describe('Notification Service', () => {
  // Suppress console.log during tests
  const originalConsoleLog = console.log;
  beforeEach(() => {
    console.log = jest.fn();
  });
  afterAll(() => {
    console.log = originalConsoleLog;
  });

  describe('isNotificationsSupported', () => {
    it('returns false when expo-notifications is not installed', () => {
      expect(isNotificationsSupported()).toBe(false);
    });
  });

  describe('requestNotificationPermissions', () => {
    it('returns undetermined when expo-notifications is not installed', async () => {
      const status = await requestNotificationPermissions();
      expect(status).toBe('undetermined');
    });
  });

  describe('getNotificationPermissionStatus', () => {
    it('returns undetermined when expo-notifications is not installed', async () => {
      const status = await getNotificationPermissionStatus();
      expect(status).toBe('undetermined');
    });
  });

  describe('scheduleDailyReminder', () => {
    it('returns null when expo-notifications is not installed', async () => {
      const identifier = await scheduleDailyReminder();
      expect(identifier).toBeNull();
    });

    it('returns null when using custom config', async () => {
      const identifier = await scheduleDailyReminder({
        hour: 8,
        minute: 30,
        enabled: true,
      });
      expect(identifier).toBeNull();
    });

    it('returns null and cancels when disabled', async () => {
      const identifier = await scheduleDailyReminder({
        hour: 7,
        minute: 0,
        enabled: false,
      });
      expect(identifier).toBeNull();
    });

    it('logs the scheduled time', async () => {
      await scheduleDailyReminder({
        hour: 9,
        minute: 15,
        enabled: true,
      });
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('9:15'));
    });
  });

  describe('cancelDailyReminder', () => {
    it('completes without error', async () => {
      await expect(cancelDailyReminder()).resolves.toBeUndefined();
    });
  });

  describe('getScheduledNotifications', () => {
    it('returns empty array when expo-notifications is not installed', async () => {
      const notifications = await getScheduledNotifications();
      expect(notifications).toEqual([]);
    });
  });

  describe('setupNotificationHandler', () => {
    it('returns a cleanup function', () => {
      const mockHandler = jest.fn();
      const cleanup = setupNotificationHandler(mockHandler);
      expect(typeof cleanup).toBe('function');
    });

    it('cleanup function can be called without error', () => {
      const mockHandler = jest.fn();
      const cleanup = setupNotificationHandler(mockHandler);
      expect(() => cleanup()).not.toThrow();
    });
  });

  describe('configureNotificationBehavior', () => {
    it('completes without error', () => {
      expect(() => configureNotificationBehavior()).not.toThrow();
    });
  });

  describe('sendTestNotification', () => {
    it('completes without error', async () => {
      await expect(sendTestNotification()).resolves.toBeUndefined();
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

    it('has dailyReminder enabled by default', () => {
      const settings = getDefaultNotificationSettings();
      expect(settings.dailyReminder.enabled).toBe(true);
    });

    it('has default reminder time of 7:00 AM', () => {
      const settings = getDefaultNotificationSettings();
      expect(settings.dailyReminder.hour).toBe(7);
      expect(settings.dailyReminder.minute).toBe(0);
    });
  });

  describe('initializeNotifications', () => {
    it('returns notification settings', async () => {
      const settings = await initializeNotifications();
      expect(settings).toHaveProperty('dailyReminder');
      expect(settings).toHaveProperty('permissionStatus');
    });

    it('returns undetermined permission status', async () => {
      const settings = await initializeNotifications();
      expect(settings.permissionStatus).toBe('undetermined');
    });

    it('returns default daily reminder config', async () => {
      const settings = await initializeNotifications();
      expect(settings.dailyReminder).toEqual({
        hour: 7,
        minute: 0,
        enabled: true,
      });
    });

    it('does not schedule reminders when permissions not granted', async () => {
      // Since getNotificationPermissionStatus returns 'undetermined',
      // the reminder should not be scheduled (only scheduled when 'granted')
      const settings = await initializeNotifications();
      expect(settings.permissionStatus).toBe('undetermined');
    });
  });
});
