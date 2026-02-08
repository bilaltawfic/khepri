# P1-B-03: Add Athlete Profile Queries

## Task Overview

Create `packages/supabase-client/src/queries/athlete.ts` with typed query functions for the athletes table.

## Prerequisites

- PR #15 must be merged first (contains the types and client)
- Branch from `main` after PR #15 is merged

## Branch Name

```
feat/p1-b-03-athlete-queries
```

## Files to Create

### 1. `packages/supabase-client/src/queries/athlete.ts`

```typescript
/**
 * Athlete profile query functions
 */

import type { KhepriSupabaseClient, AthleteRow, AthleteInsert, AthleteUpdate } from '../types.js';

// Query result type for consistency
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Get athlete profile by Supabase auth user ID
 */
export async function getAthleteByAuthUser(
  client: KhepriSupabaseClient,
  authUserId: string
): Promise<QueryResult<AthleteRow>> {
  // Implementation: .from('athletes').select('*').eq('auth_user_id', authUserId).single()
}

/**
 * Get athlete profile by athlete ID
 */
export async function getAthleteById(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<AthleteRow>> {
  // Implementation
}

/**
 * Create a new athlete profile
 */
export async function createAthlete(
  client: KhepriSupabaseClient,
  data: AthleteInsert
): Promise<QueryResult<AthleteRow>> {
  // Implementation: .from('athletes').insert(data).select().single()
}

/**
 * Update an athlete profile
 */
export async function updateAthlete(
  client: KhepriSupabaseClient,
  athleteId: string,
  data: AthleteUpdate
): Promise<QueryResult<AthleteRow>> {
  // Implementation: .from('athletes').update(data).eq('id', athleteId).select().single()
}

/**
 * Get athlete's current fitness numbers (FTP, threshold pace, CSS, HR zones)
 */
export async function getAthleteFitnessNumbers(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<Pick<AthleteRow, 'ftp_watts' | 'running_threshold_pace_sec_per_km' | 'css_sec_per_100m' | 'resting_heart_rate' | 'max_heart_rate' | 'lthr'>>> {
  // Implementation: .from('athletes').select('ftp_watts, running_threshold_pace_sec_per_km, css_sec_per_100m, resting_heart_rate, max_heart_rate, lthr').eq('id', athleteId).single()
}

/**
 * Update athlete's Intervals.icu connection status
 */
export async function updateIntervalsConnection(
  client: KhepriSupabaseClient,
  athleteId: string,
  connected: boolean,
  intervalsAthleteId?: string
): Promise<QueryResult<AthleteRow>> {
  // Implementation
}
```

### 2. `packages/supabase-client/src/queries/index.ts`

```typescript
export * from './athlete.js';
```

### 3. Update `packages/supabase-client/src/index.ts`

Add exports:
```typescript
// QUERIES
export * from './queries/index.js';
```

### 4. `packages/supabase-client/src/__tests__/queries/athlete.test.ts`

Write unit tests using Jest mocks. Pattern:

```typescript
import { describe, expect, it, jest, beforeEach } from '@jest/globals';

// Create mock client
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockSingle = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();

const mockClient = {
  from: mockFrom.mockReturnValue({
    select: mockSelect.mockReturnValue({
      eq: mockEq.mockReturnValue({
        single: mockSingle,
      }),
    }),
    insert: mockInsert.mockReturnValue({
      select: mockSelect.mockReturnValue({
        single: mockSingle,
      }),
    }),
    update: mockUpdate.mockReturnValue({
      eq: mockEq.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
    }),
  }),
} as unknown as KhepriSupabaseClient;

// Test cases for each function
```

## Test Cases to Implement

1. `getAthleteByAuthUser` - returns athlete when found
2. `getAthleteByAuthUser` - returns null when not found
3. `getAthleteByAuthUser` - returns error on failure
4. `getAthleteById` - returns athlete when found
5. `createAthlete` - creates and returns new athlete
6. `createAthlete` - returns error on duplicate auth_user_id
7. `updateAthlete` - updates and returns athlete
8. `updateAthlete` - returns error when athlete not found
9. `getAthleteFitnessNumbers` - returns fitness metrics
10. `updateIntervalsConnection` - updates connection status

## PR Guidelines

1. Create branch from `main` (after PR #15 merged)
2. Keep PR small (<200 lines)
3. Run `pnpm lint` and `pnpm test` before pushing
4. Wait for Copilot review (~3 min for small PRs)
5. Address all review comments
6. Log conversation to `claude-convos/2026-02-08/`

## Commit Message Format

```
feat(supabase): add athlete profile query functions

- Add getAthleteByAuthUser, getAthleteById, createAthlete, updateAthlete
- Add getAthleteFitnessNumbers, updateIntervalsConnection
- Add unit tests with mock Supabase client

Co-Authored-By: Claude <agent>
```
