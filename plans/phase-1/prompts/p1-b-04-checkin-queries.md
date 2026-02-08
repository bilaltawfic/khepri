# P1-B-04: Add Daily Check-in Queries

## Task Overview

Create `packages/supabase-client/src/queries/checkins.ts` with typed query functions for the daily_checkins table.

## Prerequisites

- PR #15 must be merged first (contains the types and client)
- Branch from `main` after PR #15 is merged

## Branch Name

```
feat/p1-b-04-checkin-queries
```

## Files to Create

### 1. `packages/supabase-client/src/queries/checkins.ts`

```typescript
/**
 * Daily check-in query functions
 */

import type {
  KhepriSupabaseClient,
  DailyCheckinRow,
  DailyCheckinInsert,
  DailyCheckinUpdate,
  Json,
} from '../types.js';

// Query result type for consistency
export interface QueryResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Get today's check-in for an athlete
 * Uses UTC date for consistency
 */
export async function getTodayCheckin(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<DailyCheckinRow>> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD in UTC
  // Implementation: .from('daily_checkins').select('*').eq('athlete_id', athleteId).eq('checkin_date', today).single()
}

/**
 * Get check-in for a specific date
 */
export async function getCheckinByDate(
  client: KhepriSupabaseClient,
  athleteId: string,
  date: string // YYYY-MM-DD format
): Promise<QueryResult<DailyCheckinRow>> {
  // Implementation
}

/**
 * Get recent check-ins for an athlete (last N days)
 * Ordered by date descending (most recent first)
 */
export async function getRecentCheckins(
  client: KhepriSupabaseClient,
  athleteId: string,
  days: number = 7
): Promise<QueryResult<DailyCheckinRow[]>> {
  // Calculate start date
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString().split('T')[0];
  // Implementation: .from('daily_checkins').select('*').eq('athlete_id', athleteId).gte('checkin_date', startDateStr).order('checkin_date', { ascending: false })
}

/**
 * Create a new daily check-in
 * Note: UNIQUE constraint on (athlete_id, checkin_date) prevents duplicates
 */
export async function createCheckin(
  client: KhepriSupabaseClient,
  data: DailyCheckinInsert
): Promise<QueryResult<DailyCheckinRow>> {
  // Implementation: .from('daily_checkins').insert(data).select().single()
}

/**
 * Update an existing check-in
 */
export async function updateCheckin(
  client: KhepriSupabaseClient,
  checkinId: string,
  data: DailyCheckinUpdate
): Promise<QueryResult<DailyCheckinRow>> {
  // Implementation: .from('daily_checkins').update(data).eq('id', checkinId).select().single()
}

/**
 * Save AI recommendation to a check-in
 */
export async function updateCheckinRecommendation(
  client: KhepriSupabaseClient,
  checkinId: string,
  recommendation: Json
): Promise<QueryResult<DailyCheckinRow>> {
  // Implementation: update with ai_recommendation and ai_recommendation_generated_at = new Date().toISOString()
}

/**
 * Record user's response to AI recommendation
 */
export async function updateCheckinUserResponse(
  client: KhepriSupabaseClient,
  checkinId: string,
  response: 'accepted' | 'modified' | 'skipped' | 'alternative',
  notes?: string
): Promise<QueryResult<DailyCheckinRow>> {
  // Implementation: update user_response and user_response_notes
}

/**
 * Get check-ins with AI recommendations that haven't been responded to
 */
export async function getPendingRecommendations(
  client: KhepriSupabaseClient,
  athleteId: string
): Promise<QueryResult<DailyCheckinRow[]>> {
  // Implementation: where ai_recommendation is not null AND user_response is null
}
```

### 2. Update `packages/supabase-client/src/queries/index.ts`

```typescript
export * from './athlete.js';
export * from './checkins.js';
```

### 3. `packages/supabase-client/src/__tests__/queries/checkins.test.ts`

Write unit tests using Jest mocks. Test cases:

1. `getTodayCheckin` - returns today's check-in when exists
2. `getTodayCheckin` - returns null when no check-in for today
3. `getCheckinByDate` - returns check-in for specific date
4. `getRecentCheckins` - returns array of recent check-ins
5. `getRecentCheckins` - returns empty array when no check-ins
6. `createCheckin` - creates and returns new check-in
7. `createCheckin` - returns error on duplicate date
8. `updateCheckin` - updates and returns check-in
9. `updateCheckinRecommendation` - saves AI recommendation with timestamp
10. `updateCheckinUserResponse` - records user response
11. `getPendingRecommendations` - returns check-ins awaiting response

## Date Handling

**Important**: All dates should use UTC:
- Use `new Date().toISOString().split('T')[0]` for today's date
- The database stores `checkin_date` as DATE type
- Always pass dates as `YYYY-MM-DD` strings

## Mock Pattern for Tests

```typescript
const mockClient = {
  from: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),
  }),
} as unknown as KhepriSupabaseClient;
```

## PR Guidelines

1. Create branch from `main` (after PR #15 merged)
2. Keep PR small (<200 lines)
3. Run `pnpm lint` and `pnpm test` before pushing
4. Wait for Copilot review (~3 min for small PRs)
5. Address all review comments
6. Log conversation to `claude-convos/2026-02-08/`

## Commit Message Format

```
feat(supabase): add daily check-in query functions

- Add getTodayCheckin, getCheckinByDate, getRecentCheckins
- Add createCheckin, updateCheckin, updateCheckinRecommendation
- Add updateCheckinUserResponse, getPendingRecommendations
- Add unit tests with mock Supabase client

Co-Authored-By: Claude <agent>
```
