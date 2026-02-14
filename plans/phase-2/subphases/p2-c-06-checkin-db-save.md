# P2-C-06: Persist Check-in Data to Supabase

## Goal

Wire the daily check-in form submission to save the check-in record to the `daily_checkins` table in Supabase. Currently the form captures data and calls the AI orchestrator, but the check-in itself is never persisted (there is a `TODO` with a simulated `setTimeout`).

## Dependencies

- ✅ P1-B-04: Daily check-in queries exist in `supabase-client`
- ✅ P2-C-04: Check-in flow calls real AI

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/mobile/hooks/useCheckin.ts` | Modify | Replace TODO with real Supabase insert |
| `apps/mobile/hooks/useCheckin.test.ts` | Modify | Add tests for DB persistence |

## Implementation Steps

### Step 1: Replace TODO in `useCheckin.ts`

At ~line 151, replace:
```typescript
// TODO: Submit check-in data to Supabase in a future task
await new Promise((resolve) => setTimeout(resolve, 500));
```

With a call to `createCheckin()` from `@khepri/supabase-client`:

```typescript
const { data: athlete } = await getAthleteByAuthId(supabase, user.id);
if (!athlete) throw new Error('Athlete profile not found');

const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

const { error } = await createCheckin(supabase, {
  athlete_id: athlete.id,
  checkin_date: today,
  sleep_quality: formData.sleepQuality,
  sleep_hours: formData.sleepHours,
  energy_level: formData.energyLevel,
  stress_level: formData.stressLevel,
  overall_soreness: formData.overallSoreness,
  soreness_areas: formData.sorenessAreas,
  available_time_minutes: formData.availableTimeMinutes,
  travel_status: formData.travelStatus,
  notes: formData.notes,
});

if (error) throw new Error(`Failed to save check-in: ${error.message}`);
```

### Step 2: Handle Duplicate Check-ins

The `daily_checkins` table has a UNIQUE constraint on `(athlete_id, checkin_date)`. If a user does a second check-in the same day, use `updateCheckin()` instead:

```typescript
const { data: existing } = await getTodayCheckin(supabase, athlete.id);
if (existing) {
  await updateCheckin(supabase, existing.id, { ...checkinData });
} else {
  await createCheckin(supabase, { athlete_id: athlete.id, ...checkinData });
}
```

### Step 3: Store AI Recommendation with Check-in

After the AI responds, update the check-in record with the recommendation:
```typescript
await updateCheckin(supabase, checkinId, {
  ai_recommendation: JSON.stringify(recommendation),
});
```

### Step 4: Write Tests

- Mocks `createCheckin` and verifies it's called with correct field mapping
- Verifies camelCase → snake_case field mapping
- Tests duplicate check-in handling (update instead of insert)
- Tests error handling when DB save fails
- Tests AI recommendation is stored after successful response

## Testing Requirements

- Unit tests with mocked Supabase client
- Verify field mapping between `CheckinFormData` and `DailyCheckinInsert`
- Test the create-or-update logic for same-day check-ins
- Test error states (no athlete profile, DB write failure)

## Verification

1. `pnpm test` passes
2. Complete a check-in in the app
3. Query `daily_checkins` table — record exists with correct data
4. Do a second check-in same day — record is updated, not duplicated
5. AI recommendation is stored in the check-in record

## Key Considerations

- **Field mapping**: Form uses camelCase, DB uses snake_case — map carefully
- **Unique constraint**: `(athlete_id, checkin_date)` — must handle gracefully
- **Auth context**: Need the Supabase client and user from auth context
- **Date**: Use local date (not UTC) for `checkin_date` since it represents the athlete's day
