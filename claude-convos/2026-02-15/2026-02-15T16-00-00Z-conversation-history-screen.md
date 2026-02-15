# Conversation History Screen Implementation

**Date:** 2026-02-15
**Task:** P7-A-04 - Conversation History Screen
**PR:** #107

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
- Used direct Supabase query with `limit(1)` for message previews (not `getMessages()` which would fetch all messages — N+1 fix from Copilot review)
- Separated `isLoading` (initial load) from `isRefreshing` (pull-to-refresh) for better UX

## Files Changed
- `apps/mobile/hooks/useConversationHistory.ts` - New data fetching hook with preview fetching
- `apps/mobile/hooks/__tests__/useConversationHistory.test.ts` - 17 hook tests
- `apps/mobile/app/chat/history.tsx` - Conversation history screen with cards, empty state, archive
- `apps/mobile/app/chat/_layout.tsx` - Chat stack layout
- `apps/mobile/app/chat/__tests__/history.test.tsx` - 15 screen tests
- `apps/mobile/app/(tabs)/_layout.tsx` - Added history button to chat tab header
- `apps/mobile/app/_layout.tsx` - Added chat route to root stack
- `apps/mobile/hooks/index.ts` - Exported new hook and types

## Review Feedback Addressed
1. **N+1 query** (Copilot): Replaced `getMessages()` with direct Supabase `.from('messages').select('content').eq(...).order(...).limit(1)` to fetch only the latest message per conversation
2. **Hardcoded `refreshing={false}`** (Copilot): Added `isRefreshing` state to hook, wired to `RefreshControl.refreshing`
3. **`void` operator usage** (SonarCloud CRITICAL `typescript:S3735`): Changed `void archiveConversation(id)` to `await archiveConversation(id)` with async callback

## Learnings
- In `jest-expo/web` preset, `Pressable` renders as HTML `<button>` with `role="button"` attribute
- `accessibilityRole` maps to HTML `role` in web mode, not `accessibilityRole` in JSON
- `getAllByRole('button')` may not work in web test environment; use `getByLabelText` instead
- `toEndWith` is not a standard Jest matcher; use `string.endsWith()` instead
- `void` operator triggers SonarCloud CRITICAL rule `typescript:S3735` — use `await` in async callbacks instead
- SonarCloud Quality Gate can "pass" while still having issues that exceed project severity thresholds — always verify via API
