# Push Notification Infrastructure (P7-A-01/A-02)

## Date
2026-02-14

## Goals
- Install expo-notifications and expo-device
- Replace placeholder notification service with real expo-notifications API calls
- Update tests to mock expo-notifications and verify real behavior
- Wire notification initialization into app root layout

## Key Decisions
- Used `SchedulableTriggerInputTypes.DAILY` for daily reminder scheduling
- Mapped expo permission status enum to simpler string union type for app-level API
- Used getter-based mock for `expo-device.isDevice` to support per-test mutation in jest
- Added `shouldShowBanner` and `shouldShowList` to notification behavior (required by newer expo-notifications types)
- Android notification channel set up on initialization with DEFAULT importance
- Added `analysis` Stack.Screen to root layout for future P7-B compatibility

## Files Changed
- `apps/mobile/package.json` - Added expo-notifications, expo-device dependencies
- `apps/mobile/app.json` - Added expo-notifications plugin config
- `apps/mobile/services/notifications.ts` - Replaced all placeholders with real expo-notifications calls
- `apps/mobile/services/__tests__/notifications.test.ts` - Complete rewrite with proper mocking
- `apps/mobile/app/_layout.tsx` - Added notification init and tap handler

## Learnings
- jest-expo/web preset sets `Platform.OS` to `'web'`, requiring explicit override in tests
- `import * as Module` creates non-writable namespace objects in jest - use getter-based mock factories for mutable module properties
- `jest.clearAllMocks()` only clears call history, not mock implementations - use `jest.resetAllMocks()` for full reset between tests
- expo-notifications `NotificationBehavior` type requires `shouldShowBanner` and `shouldShowList` fields (newer API)
