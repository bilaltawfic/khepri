# P2-D-04: Populate CTL/ATL/TSB on Dashboard

## Goal

Wire the dashboard's fitness metrics to display real CTL (Chronic Training Load), ATL (Acute Training Load), and TSB (Training Stress Balance) values from the `get_wellness_data` MCP tool. Currently these are hardcoded to `null` in `useDashboard.ts`.

## Dependencies

- ✅ P2-D-01: Dashboard hook exists
- ✅ P3-A-03: get_wellness_data tool returns CTL/ATL/TSB in summary

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/mobile/hooks/useDashboard.ts` | Modify | Fetch wellness data, populate metrics |
| `apps/mobile/hooks/useDashboard.test.ts` | Modify | Add tests for training load fetch |
| `apps/mobile/services/intervals.ts` | Modify | Add `getWellnessSummary()` service function |

## Implementation Steps

### Step 1: Add Wellness Service Function

In `apps/mobile/services/intervals.ts`, add a function to call the MCP gateway for wellness data:

```typescript
export async function getWellnessSummary(): Promise<{
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
} | null> {
  const { data, error } = await supabase.functions.invoke('mcp-gateway', {
    body: {
      action: 'execute_tool',
      tool_name: 'get_wellness_data',
      tool_input: {
        oldest: getDateDaysAgo(7),
        newest: getToday(),
      },
    },
  });

  if (error || !data?.success) return null;

  const summary = data.data?.summary;
  if (!summary) return null;

  return {
    ctl: summary.current_ctl ?? null,
    atl: summary.current_atl ?? null,
    tsb: summary.current_tsb ?? null,
  };
}
```

### Step 2: Update useDashboard Hook

At ~lines 193-199, replace the hardcoded nulls:

```typescript
// Before:
fitnessMetrics: {
  ftp: athlete.ftp_watts ?? null,
  weight: athlete.weight_kg == null ? null : Number(athlete.weight_kg),
  ctl: null,
  atl: null,
  tsb: null,
},

// After:
fitnessMetrics: {
  ftp: athlete.ftp_watts ?? null,
  weight: athlete.weight_kg == null ? null : Number(athlete.weight_kg),
  ctl: wellness?.ctl ?? null,
  atl: wellness?.atl ?? null,
  tsb: wellness?.tsb ?? null,
},
```

Fetch wellness data alongside other dashboard data:
```typescript
const [athleteResult, activitiesResult, wellnessResult] = await Promise.all([
  getAthleteByAuthId(supabase, user.id),
  getRecentActivities(7),
  getWellnessSummary(),
]);
```

### Step 3: Write Tests

- Tests that wellness data is fetched on dashboard load
- Tests that CTL/ATL/TSB are populated when wellness data available
- Tests that CTL/ATL/TSB remain null when wellness fetch fails
- Tests that dashboard still loads if wellness call errors (graceful degradation)
- Tests parallel fetch (wellness doesn't block athlete data)

## Testing Requirements

- Mock `getWellnessSummary` service function
- Verify metrics display correctly when data is available
- Verify graceful fallback when Intervals.icu not connected
- Verify no regression on existing dashboard data

## Verification

1. `pnpm test` passes
2. Dashboard shows CTL/ATL/TSB values when Intervals.icu connected
3. Dashboard shows "—" or null indicator when not connected
4. No performance regression (parallel fetch)

## Key Considerations

- **Graceful degradation**: If wellness fetch fails, dashboard still loads with nulls
- **Parallel fetch**: Use `Promise.all` to avoid sequential loading
- **No new dependencies**: Uses existing MCP gateway and service patterns
- **Simple scope**: Only populates the 3 metrics — no new UI components needed
