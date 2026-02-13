# P3-B-03: Fetch and Display Recent Activities

**Date:** 2026-02-13
**Task:** Add Recent Activities card to dashboard
**Branch:** feat/p3-b-03-dashboard-activities
**PR:** #71

## Goals

- Fetch completed workouts from Intervals.icu via the MCP gateway
- Display them in a new "Recent Activities" dashboard card
- Handle graceful fallback when Intervals.icu is not connected

## Key Decisions

1. **Reused existing `intervals.ts` service** instead of creating a new `mcp-client.ts` as the plan suggested. The existing file already had MCP gateway helpers (`getAuthHeaders`, `getMCPGatewayUrl`, `MCPToolResponse`), so adding `getRecentActivities` there avoided code duplication.

2. **Matched actual gateway response format** - The plan assumed `moving_time` and `icu_training_load` fields, but the real `get_activities` tool returns `duration` (seconds) and `tss`. Used the actual API contract.

3. **Graceful error handling** - Activities fetch uses `.catch(() => [])` in `Promise.all` so a failure doesn't break the entire dashboard. Other data (goals, check-in) still loads.

4. **Duration conversion** - Gateway returns seconds, UI displays minutes. Conversion happens in `activityToDisplay()` with `Math.round(duration / 60)`.

5. **Activity limit** - Capped at 5 activities on the dashboard via `.slice(0, 5)`.

## Files Changed

### New Code
- `apps/mobile/services/intervals.ts` - Added `ActivityData` interface, `ActivitiesResponse`, `getRecentActivities()`
- `apps/mobile/hooks/useDashboard.ts` - Added `RecentActivity` type, `activityToDisplay()`, wired into `fetchDashboardData`
- `apps/mobile/app/(tabs)/index.tsx` - Added `ActivityRow` component, `formatActivityDuration()`, Recent Activities card

### Updated Exports
- `apps/mobile/services/index.ts` - Export `ActivityData`, `getRecentActivities`
- `apps/mobile/hooks/index.ts` - Export `RecentActivity`

### Tests
- `apps/mobile/services/__tests__/intervals.test.ts` - 7 new tests for `getRecentActivities`
- `apps/mobile/hooks/__tests__/useDashboard.test.ts` - 5 new tests for activities integration
- `apps/mobile/app/(tabs)/__tests__/index.test.tsx` - 2 new tests for UI card, updated mock data

## Learnings

- React Native renders `{value} TSS` as separate text children `["55"," TSS"]` in `toJSON()`, so `toContain("55 TSS")` doesn't work - need separate assertions.
- The `get_activities` MCP tool response uses `tss` (not `icu_training_load`) and `duration` (not `moving_time`) - always check the actual handler code, not just the plan.
