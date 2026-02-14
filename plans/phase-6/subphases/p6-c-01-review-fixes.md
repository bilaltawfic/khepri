# P6-C-01: Code Review Fixes (PRs #95, #96, #97)

**Branch:** `fix/review-findings-pr95-97`
**Depends on:** P6-A-01 (✅ Complete), P6-B-01 (✅ Complete), P6-B-03 (✅ Complete)
**Blocks:** None

## Goal

Address 1 High and 5 Medium severity issues identified during Opus code review of PRs #95, #96, #97. The most impactful fix harmonizes field names across event MCP tools so the AI consumer sees a consistent interface.

## Issues Addressed

| # | Severity | Issue | Source PR |
|---|----------|-------|-----------|
| 1 | **HIGH** | Field naming inconsistency between get/create/update event tools | #97 |
| 2 | MEDIUM | `event_id` not validated as numeric; unsanitized in URL | #97 |
| 3 | MEDIUM | Missing `NOT NULL` on `training_plans.status` column | #95 |
| 4 | MEDIUM | Dead code undocumented (recovery phase, unused focus values) | #96 |
| 5 | MEDIUM | Duplicated `IntervalsApiError` in test helpers undocumented | #97 |
| 6 | MEDIUM | JSONB schema examples don't match TypeScript types | #95 |

## Files to Modify

### MCP Event Tools (Issues 1, 2, 5)
- `supabase/functions/mcp-gateway/tools/event-validation.ts`
- `supabase/functions/mcp-gateway/tools/create-event.ts`
- `supabase/functions/mcp-gateway/tools/update-event.ts`
- `supabase/functions/mcp-gateway/utils/intervals-api.ts`
- `supabase/functions/mcp-gateway/tools/__tests__/event-test-helpers.ts`
- `supabase/functions/mcp-gateway/tools/__tests__/create-event.test.ts`
- `supabase/functions/mcp-gateway/tools/__tests__/update-event.test.ts`
- `supabase/functions/mcp-gateway/tools/__tests__/event-validation.test.ts`

### Schema & Types (Issue 3)
- `supabase/migrations/007_training_plans_status_not_null.sql` (NEW)
- `packages/supabase-client/src/types.ts`

### Documentation & Comments (Issues 4, 6)
- `packages/core/src/types/training.ts`
- `supabase/migrations/006_training_plans.sql`
- `plans/phase-6/subphases/p6-b-01-training-plans-schema.md`

## Implementation Steps

### 1. Harmonize Event Field Names (HIGH)

**Problem:** `get_events` returns `planned_duration`, `planned_tss`, `start_date`, `priority` with lowercase types. But `create_event`/`update_event` expect `moving_time`, `icu_training_load`, `start_date_local`, `event_priority` with uppercase types. An AI calling `get_events` sees one convention and must use a different one for writes.

**Solution:** Accept CalendarEvent field names (matching `get_events` output) in create/update tools. Internally map them to Intervals.icu API names when building payloads. Accept BOTH old and new names for backward compatibility.

#### 1a. Add field mapping to `event-validation.ts`

```typescript
/** Map CalendarEvent field names (as returned by get_events) → Intervals.icu API names. */
export const FIELD_NAME_MAP: Readonly<Record<string, string>> = {
  start_date: 'start_date_local',
  end_date: 'end_date_local',
  planned_duration: 'moving_time',
  planned_tss: 'icu_training_load',
  planned_distance: 'distance',
  priority: 'event_priority',
};

/**
 * Normalize input field names from CalendarEvent convention to Intervals.icu API names.
 * Accepts both conventions for backward compatibility — unmapped keys pass through.
 */
export function normalizeInputFieldNames(
  input: Record<string, unknown>
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    const apiName = FIELD_NAME_MAP[key] ?? key;
    if (!(apiName in normalized)) {
      normalized[apiName] = value;
    }
  }
  return normalized;
}
```

#### 1b. Update `EVENT_SCHEMA_PROPERTIES` to advertise CalendarEvent names

Change the MCP tool schema to use the same field names that `get_events` returns:
- `start_date_local` → `start_date` (description: "Start date/time in ISO 8601 format")
- `end_date_local` → `end_date`
- `moving_time` → `planned_duration` (description: "Planned duration in seconds")
- `icu_training_load` → `planned_tss` (description: "Planned TSS")
- `distance` → `planned_distance` (description: "Planned distance in meters")
- `event_priority` → `priority` (description: "Race priority: A, B, or C")
- Type enum values: lowercase `['workout', 'race', 'note', 'rest_day', 'travel']`

#### 1c. Update `formatEventResponse()` to return CalendarEvent field names

The response from create/update should match `get_events` output shape:
```typescript
event: {
  id: String(event.id),
  name: event.name,
  type: (event.type ?? '').toLowerCase(),
  start_date: event.start_date_local,
  end_date: event.end_date_local,
  description: event.description,
  category: event.category,
  planned_duration: event.moving_time,
  planned_tss: event.icu_training_load,
  planned_distance: event.distance,
  indoor: event.indoor,
  priority: event.event_priority,
}
```

#### 1d. Update create-event.ts and update-event.ts handlers

- Call `normalizeInputFieldNames(input)` at the top of each handler, before validation
- Update `REQUIRED_KEYS` in create-event.ts to `['name', 'type', 'start_date_local']` (post-normalization API names)
- Update schema `required` to `['name', 'type', 'start_date']` (pre-normalization CalendarEvent names)

#### 1e. Clean up `buildEventPayload`

- Remove the unused `_requiredKeys` parameter (dead code)

### 2. Validate event_id as Numeric (MEDIUM)

#### 2a. In `update-event.ts` handler

After the existing empty-string check for `event_id`, add:
```typescript
if (!/^\d+$/.test(eventId)) {
  return { success: false, error: 'event_id must be a numeric value', code: 'INVALID_INPUT' };
}
```

#### 2b. In `intervals-api.ts` `updateEvent()`

Add `encodeURIComponent()` as defense-in-depth:
```typescript
`/events/${encodeURIComponent(eventId)}`
```

### 3. Add NOT NULL to training_plans.status (MEDIUM)

#### 3a. Create `supabase/migrations/007_training_plans_status_not_null.sql`

```sql
-- Ensure training_plans.status cannot be null.
-- The column has DEFAULT 'active' and a CHECK constraint but was missing NOT NULL.
UPDATE training_plans SET status = 'active' WHERE status IS NULL;
ALTER TABLE training_plans ALTER COLUMN status SET NOT NULL;
```

#### 3b. Update `packages/supabase-client/src/types.ts`

In the `training_plans` table types:
- **Row:** `status: string | null` → `status: string`
- **Insert:** `status?: string | null` → `status?: string`
- **Update:** `status?: string | null` → `status?: string`

### 4. Document Dead Code in Periodization (MEDIUM)

#### 4a. In `packages/core/src/types/training.ts`

Add JSDoc to `PERIODIZATION_PHASES`:
```typescript
/**
 * Training periodization phase types.
 *
 * Note: 'recovery' is reserved for future mesocycle recovery blocks
 * in annual plans. Currently calculatePhaseBreakdown() only produces
 * base, build, peak, and taper phases.
 */
```

Add JSDoc to `TRAINING_FOCUS`:
```typescript
/**
 * Training focus areas for each phase.
 *
 * Note: 'vo2max' and 'strength' are reserved for future sport-specific
 * periodization models. Currently getTrainingFocus() only returns
 * aerobic_endurance, threshold_work, race_specific, and recovery.
 */
```

### 5. Document IntervalsApiError Duplication (MEDIUM)

#### 5a. In `event-test-helpers.ts`

Add JSDoc above the duplicated class:
```typescript
/**
 * Local copy of IntervalsApiError for ESM module mocking.
 *
 * Intentionally duplicated from utils/intervals-api.ts because
 * jest.unstable_mockModule() requires the class defined before module
 * setup — importing from the real module would bypass the mock.
 *
 * COUPLING: If you change the constructor signature in intervals-api.ts,
 * you must update this copy to match.
 */
```

### 6. Fix JSONB Schema Examples (MEDIUM)

#### 6a. In `supabase/migrations/006_training_plans.sql`

Update the example comment block (around line 165) from:
```sql
-- {
--   "phase": "base",
--   "weeks": 4,
--   "focus": "aerobic_endurance",
--   "intensity_distribution": [80, 15, 5]
-- }
```

To match the TypeScript `TrainingPhase` interface and seed data:
```sql
-- {
--   "name": "Base Building",
--   "start_week": 1,
--   "end_week": 4,
--   "focus": "aerobic_endurance",
--   "description": "Build aerobic base with high volume, low intensity"
-- }
```

#### 6b. In `plans/phase-6/subphases/p6-b-01-training-plans-schema.md`

Update any JSONB examples that use `{ "phase": "base", "weeks": 4 }` format to match the TypeScript/seed convention with `name`, `start_week`, `end_week`.

## Testing

### Updated Tests
- `create-event.test.ts`: Update `VALID_INPUT` to use CalendarEvent field names (`start_date`, `planned_duration`, `type: 'workout'`). Verify normalization produces correct API-name payload.
- `update-event.test.ts`: Same field name updates. Add tests for non-numeric `event_id` (letters, path traversal `../`, empty after trim).
- `event-validation.test.ts`: Add tests for `normalizeInputFieldNames()`. Update existing field name references. Verify `buildEventPayload` still builds API-named payloads correctly.

### Verification Checklist
- [ ] `pnpm test` — all tests pass
- [ ] `pnpm lint` — no linting errors
- [ ] `pnpm build` — builds successfully
- [ ] `pnpm typecheck` — type checking passes
- [ ] Backward compat: old-style API field names still accepted by create/update tools
- [ ] Forward compat: CalendarEvent field names (matching get_events output) now accepted

## PR Details

- **Branch:** `fix/review-findings-pr95-97`
- **Title:** `fix: address high and medium review findings from PRs #95-97`
- **Conversation log:** `claude-convos/YYYY-MM-DD/` (worker creates this)
