# Conversation History Screen Implementation

**Date:** 2026-02-15
**Task:** P7-A-04 - Conversation History Screen

## Goals
- Build a conversation history screen to browse past coaching conversations
- Add navigation from chat tab to history screen
- Wire up routing with Expo Router

## Key Decisions
- Created `useConversationHistory` hook following existing hook patterns (useGoals, useDashboard)
- History screen uses FlatList with pull-to-refresh and empty state
- Conversation cards show title, message preview (truncated to 100 chars), and relative timestamps
- Long-press on cards shows archive option via Alert.alert
- Added history button (clock icon) to chat tab header in tab layout
- Created chat route group (`app/chat/`) with Stack layout for history screen
- Navigation from history back to chat uses `router.back()`

## Files Changed
- `apps/mobile/hooks/useConversationHistory.ts` - New data fetching hook
- `apps/mobile/hooks/__tests__/useConversationHistory.test.ts` - 16 hook tests
- `apps/mobile/app/chat/history.tsx` - Conversation history screen
- `apps/mobile/app/chat/_layout.tsx` - Chat stack layout
- `apps/mobile/app/chat/__tests__/history.test.tsx` - 15 screen tests
- `apps/mobile/app/(tabs)/_layout.tsx` - Added history button to chat tab header
- `apps/mobile/app/_layout.tsx` - Added chat route to root stack
- `apps/mobile/hooks/index.ts` - Exported new hook and types

## Learnings
- In `jest-expo/web` preset, `Pressable` renders as HTML `<button>` with `role="button"` attribute
- `accessibilityRole` maps to HTML `role` in web mode, not `accessibilityRole` in JSON
- `getAllByRole('button')` may not work in web test environment; use `getByLabelText` instead
- `toEndWith` is not a standard Jest matcher; use `string.endsWith()` instead
