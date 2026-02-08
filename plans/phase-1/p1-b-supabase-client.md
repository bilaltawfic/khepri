# Phase 1 Workstream B: Supabase Client Package

## Goal
Create `packages/supabase-client/` with database queries for athletes, check-ins, goals, and constraints.

---

## Current State
- `packages/supabase-client/` exists as empty placeholder (`.gitkeep` only)
- `packages/ai-client/src/types.ts` has comprehensive types matching Supabase schema
- Database schema defined in `supabase/migrations/001_initial_schema.sql`
- Mobile app uses hooks with mock data (`apps/mobile/hooks/useCheckin.ts`)

---

## Tasks (6 PRs)

### P1-B-01: Create supabase-client package structure
**Branch:** `feat/p1-b-01-supabase-client-structure`

**Create files:**
- `packages/supabase-client/package.json` - Package config with `@supabase/supabase-js` dependency
- `packages/supabase-client/tsconfig.json` - TypeScript config extending root
- `packages/supabase-client/src/index.ts` - Public exports

**Test:** `pnpm build` passes in package

---

### P1-B-02: Add Supabase client initialization
**Branch:** `feat/p1-b-02-supabase-client-init`

**Create files:**
- `packages/supabase-client/src/client.ts` - Client factory with env config
- `packages/supabase-client/src/types.ts` - Database row types (from schema)

**Pattern:**
```typescript
// client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types.js';

export function createSupabaseClient(url: string, anonKey: string) {
  return createClient<Database>(url, anonKey);
}
```

**Test:** Client initializes with mock credentials

---

### P1-B-03: Add athlete profile queries
**Branch:** `feat/p1-b-03-athlete-queries`

**Create file:** `packages/supabase-client/src/queries/athlete.ts`

**Functions:**
- `getAthleteByAuthUser(client, authUserId)` - Get profile by auth user
- `createAthlete(client, data)` - Create new profile
- `updateAthlete(client, athleteId, data)` - Update profile
- `getAthleteFitnessNumbers(client, athleteId)` - Get fitness metrics

**Test:** Mock CRUD operations with jest-mock

---

### P1-B-04: Add daily check-in queries
**Branch:** `feat/p1-b-04-checkin-queries`

**Create file:** `packages/supabase-client/src/queries/checkins.ts`

**Functions:**
- `getTodayCheckin(client, athleteId)` - Get today's check-in
- `getRecentCheckins(client, athleteId, days)` - Get last N days
- `createCheckin(client, data)` - Create new check-in
- `updateCheckinRecommendation(client, checkinId, recommendation)` - Save AI response

**Test:** Mock CRUD with date handling

---

### P1-B-05: Add goals and constraints queries
**Branch:** `feat/p1-b-05-goals-constraints-queries`

**Create files:**
- `packages/supabase-client/src/queries/goals.ts`
- `packages/supabase-client/src/queries/constraints.ts`

**Functions:**
- `getActiveGoals(client, athleteId)` - Get non-completed goals
- `createGoal(client, data)` / `updateGoal` / `deleteGoal`
- `getActiveConstraints(client, athleteId)` - Get current constraints
- `createConstraint` / `updateConstraint` / `deleteConstraint`

**Test:** Mock CRUD operations

---

### P1-B-06: Add integration tests with local Supabase
**Branch:** `feat/p1-b-06-supabase-integration-tests`

**Create files:**
- `packages/supabase-client/src/__tests__/integration/` - Integration test directory
- `packages/supabase-client/src/__tests__/integration/athlete.integration.test.ts`
- `packages/supabase-client/src/__tests__/integration/checkins.integration.test.ts`

**Approach:** Use Supabase CLI
```bash
# Local development
supabase start
pnpm test:integration

# In CI
supabase start --ignore-health-check
pnpm test:integration
supabase stop
```

**Tests:**
- Real CRUD against local Postgres
- RLS policy enforcement
- Constraint validation (foreign keys, checks)

**CI Integration:**
- Add `test:integration` script to package.json
- Update GitHub workflow to start Supabase before integration tests

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Database schema | `supabase/migrations/001_initial_schema.sql` |
| Existing types | `packages/ai-client/src/types.ts` |
| Mobile hook pattern | `apps/mobile/hooks/useCheckin.ts` |
| Mobile types | `apps/mobile/types/checkin.ts` |

---

## Testing Approach

We use two layers of tests:
- **Unit tests** (run via `pnpm test`) use Jest mocks and do **not** connect to a real Supabase instance.
- **Integration tests** (run via `pnpm test:integration`) connect to a local Supabase/Postgres instance and exercise real CRUD operations.

Example unit-test mock pattern for `@supabase/supabase-js`:
```typescript
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockAthlete, error: null })
    }))
  }))
}));
```

---

## Verification

After all 6 PRs merged:
1. `pnpm build` passes for supabase-client
2. `pnpm test` passes with all unit tests (mocked)
3. `pnpm test:integration` passes with local Supabase
4. Mobile app can import: `import { createSupabaseClient } from '@khepri/supabase-client'`
5. RLS policies correctly isolate user data
