# P6-A-03: Build Calendar Screen in Mobile App

**Date:** 2026-02-15
**Branch:** feat/p6-a-03-calendar-screen

## Goals

Build a calendar tab screen in the mobile app that displays Intervals.icu events (workouts, races, rest days, notes, travel) fetched via the MCP gateway `get_events` tool. The screen shows a scrollable agenda view grouped by date with event cards, pull-to-refresh, and 2-week navigation.

## Key Decisions

1. **Service layer pattern**: Followed existing `services/intervals.ts` pattern for the MCP gateway integration, reusing `MCPToolResponse<T>` shape and auth helpers.
2. **Hook architecture**: Created `useCalendarEvents` hook following `useDashboard` patterns - state management with loading/error/data, navigation via `setStartDate` with 14-day increments.
3. **Date range**: 14-day window (13 days inclusive from start), navigable forward/back in 2-week increments.
4. **UI structure**: Header with chevron navigation + date range display, ScrollView with RefreshControl, events grouped by date with Ionicons type indicators.
5. **Component composition**: Used existing `ScreenContainer`, `LoadingState`, `ErrorState`, `EmptyState` components for consistency.
6. **Tab placement**: Calendar tab added between Check-in and Coach tabs.

## Files Changed

### New Files
- `apps/mobile/services/calendar.ts` — MCP gateway service for calendar event fetching
- `apps/mobile/hooks/useCalendarEvents.ts` — Data-fetching hook with navigation support
- `apps/mobile/app/(tabs)/calendar.tsx` — Calendar tab screen with agenda view
- `apps/mobile/hooks/__tests__/useCalendarEvents.test.ts` — 10 hook unit tests
- `apps/mobile/app/(tabs)/__tests__/calendar.test.tsx` — 10 screen render tests

### Modified Files
- `apps/mobile/app/(tabs)/_layout.tsx` — Added Calendar tab entry
- `apps/mobile/hooks/index.ts` — Exported useCalendarEvents hook

## Learnings

- React Native `ThemedText` with template literals like `{value} TSS` renders as separate children in JSON, so test assertions need to check for the pieces separately rather than the combined string.
- Biome prefers single-expression JSX without parentheses for simple conditional renders.
- Pre-existing typecheck errors in `chat.test.tsx` and `types/checkin.ts` are not related to this task.
