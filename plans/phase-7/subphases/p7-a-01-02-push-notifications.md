# P7-A-01 + P7-A-02: Push Notification Infrastructure

## Goal

Install `expo-notifications` and `expo-device`, replace the placeholder implementations in the existing notification service (`apps/mobile/services/notifications.ts`) with real expo-notifications API calls, wire notification initialization into the app root layout, and update tests to verify the real implementations with mocked expo-notifications.

## Dependencies

- None (standalone task)

## Existing Code

The notification service skeleton **already exists** with full function signatures, placeholder implementations, and a test suite:
- `apps/mobile/services/notifications.ts` — All functions defined with TODO comments showing the intended implementation
- `apps/mobile/services/__tests__/notifications.test.ts` — Test suite with placeholder assertions

## Files to Modify

1. `apps/mobile/package.json` — Add `expo-notifications` and `expo-device` dependencies
2. `apps/mobile/app.json` — Add `expo-notifications` plugin config
3. `apps/mobile/services/notifications.ts` — Replace all placeholder implementations with real expo-notifications calls
4. `apps/mobile/services/__tests__/notifications.test.ts` — Update tests to mock expo-notifications and verify real behavior
5. `apps/mobile/app/_layout.tsx` — Add notification initialization and tap handler on app startup

## Implementation Steps

### Step 1: Install Dependencies

```bash
cd apps/mobile
npx expo install expo-notifications expo-device
```

This will add the packages at Expo SDK-compatible versions.

### Step 2: Update `app.json`

Add `expo-notifications` to the plugins array:

```json
"plugins": [
  "expo-router",
  "expo-font",
  [
    "expo-notifications",
    {
      "color": "#1a5f4a"
    }
  ]
]
```

Note: Skip the `icon` field if no notification-specific icon exists yet — it will fall back to the app icon.

### Step 3: Replace Notification Service Implementations

Update `apps/mobile/services/notifications.ts`:

**Imports to add:**
```ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
```

**Remove:** Placeholder `NotificationPermissionStatus` type (use Notifications API types instead).

**Function implementations:**

1. **`isNotificationsSupported()`** — Check `Device.isDevice` (notifications don't work on simulators) and `Platform.OS !== 'web'`

2. **`requestNotificationPermissions()`** — Call `Notifications.getPermissionsAsync()`, then `Notifications.requestPermissionsAsync()` if not granted. Return mapped status string. On Android 13+, also set up notification channel.

3. **`getNotificationPermissionStatus()`** — Call `Notifications.getPermissionsAsync()`, return status string.

4. **`scheduleDailyReminder(config)`** — Cancel existing reminders first, then call `Notifications.scheduleNotificationAsync()` with:
   - Content: title "Good morning!", body "Time for your daily check-in.", data `{ screen: 'checkin' }`
   - Trigger: `{ type: 'daily', hour: config.hour, minute: config.minute }` (use `SchedulableTriggerInputTypes.DAILY`)
   - Return the notification identifier string

5. **`cancelDailyReminder()`** — Call `Notifications.cancelAllScheduledNotificationsAsync()`

6. **`getScheduledNotifications()`** — Call `Notifications.getAllScheduledNotificationsAsync()`

7. **`setupNotificationHandler(onTap)`** — Call `Notifications.addNotificationResponseReceivedListener()`, extract `data` from response, call `onTap(data)`. Return cleanup function that calls `subscription.remove()`.

8. **`configureNotificationBehavior()`** — Call `Notifications.setNotificationHandler()` with `shouldShowAlert: true`, `shouldPlaySound: true`, `shouldSetBadge: false`.

9. **`sendTestNotification()`** — Call `Notifications.scheduleNotificationAsync()` with `trigger: null` (immediate).

10. **`initializeNotifications()`** — Keep current logic but with real API calls. Also set up Android notification channel:
    ```ts
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('daily-reminders', {
        name: 'Daily Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
    ```

**Edge cases to handle:**
- `isNotificationsSupported()` returns `false` → early return in schedule/request functions
- Permission denied → don't schedule, return appropriate status
- Platform-specific: Android needs notification channel setup
- Guard against `Device.isDevice === false` (emulators)

### Step 4: Update Tests

Update `apps/mobile/services/__tests__/notifications.test.ts`:

**Mock setup:**
```ts
jest.mock('expo-notifications');
jest.mock('expo-device', () => ({
  isDevice: true,
}));
jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));
```

**Updated test cases:**

- `isNotificationsSupported()` — returns `true` when `Device.isDevice` is true and platform is not web; returns `false` on web or simulator
- `requestNotificationPermissions()` — mocks `getPermissionsAsync` and `requestPermissionsAsync`, verifies correct status mapping
- `getNotificationPermissionStatus()` — mocks `getPermissionsAsync`, verifies return
- `scheduleDailyReminder()` — mocks `scheduleNotificationAsync`, verifies trigger config, verifies cancellation of previous reminders
- `scheduleDailyReminder({ enabled: false })` — verifies cancellation only
- `cancelDailyReminder()` — verifies `cancelAllScheduledNotificationsAsync` called
- `setupNotificationHandler()` — mocks `addNotificationResponseReceivedListener`, verifies callback wiring and cleanup
- `configureNotificationBehavior()` — verifies `setNotificationHandler` called with correct config
- `sendTestNotification()` — verifies `scheduleNotificationAsync` called with `trigger: null`
- `initializeNotifications()` — verifies behavior flow (configure → check perms → schedule if granted)

### Step 5: Wire Into App Root Layout

Update `apps/mobile/app/_layout.tsx`:

Add a `useEffect` for notification initialization after splash screen hides:

```tsx
import { router } from 'expo-router';
import { initializeNotifications, setupNotificationHandler } from '@/services/notifications';

// Inside RootLayout component:
useEffect(() => {
  void initializeNotifications();
  const cleanup = setupNotificationHandler((data) => {
    if (data.screen === 'checkin') {
      router.push('/checkin');
    }
  });
  return cleanup;
}, []);
```

Also add the `analysis` Stack.Screen entry (for P7-B-02/B-03 compatibility):
```tsx
<Stack.Screen name="analysis" options={{ headerShown: false }} />
```

### Step 6: Update Tests for Root Layout

If `apps/mobile/app/__tests__/_layout.test.tsx` exists, add:
- Mock `initializeNotifications` and `setupNotificationHandler`
- Verify initialization is called on mount
- Verify cleanup is called on unmount

## Code Patterns to Follow

- Follow existing service patterns: pure functions, no hooks
- Error handling: log + graceful degradation, don't crash
- Mock imports at module level with `jest.mock()`
- `readonly` on type properties
- Named exports only
- Keep `DailyReminderConfig` and `NotificationSettings` types (they're stable)

## Testing Requirements

- All notification service functions are tested with mocked expo-notifications
- Platform-specific behavior tested (iOS vs Android vs web)
- Edge cases: unsupported platform, permission denied, emulator
- Run `pnpm test` — all tests pass
- Run `pnpm lint` — no lint errors
- Run `pnpm typecheck` — no type errors

## Verification

1. `pnpm test` passes
2. `pnpm lint` passes
3. `pnpm typecheck` passes
4. `expo-notifications` and `expo-device` in package.json dependencies
5. `expo-notifications` plugin in app.json
6. All notification functions use real expo-notifications APIs
7. Notification initialization runs on app startup
8. Notification tap navigates to check-in screen
