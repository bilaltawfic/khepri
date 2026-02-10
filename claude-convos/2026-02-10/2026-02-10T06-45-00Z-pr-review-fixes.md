# PR Review Fixes for Phase 2 Implementation

**Date:** 2026-02-10
**Session Duration:** ~45 minutes
**PRs Addressed:** #43 (AI Service), #44 (Constraints), #45 (Goals)

## Goals
- Address all Copilot code review comments across three PRs
- Fix SonarCloud issues (2 MAJOR issues in constraint-form.tsx)
- Ensure all CI checks pass and PRs are ready to merge

## Key Decisions

### 1. Local Date Parsing (parseDateOnly helper)
**Problem:** Using `new Date('YYYY-MM-DD')` parses as UTC, causing off-by-one date errors when displayed in local timezone.

**Solution:** Added `parseDateOnly` helper that splits the string and uses `new Date(year, month - 1, day)` to create local dates:
```typescript
function parseDateOnly(dateString: string): Date {
  const parts = dateString.split('-');
  if (parts.length !== 3) return new Date(dateString);
  const [yearStr, monthStr, dayStr] = parts;
  return new Date(Number(yearStr), Number(monthStr) - 1, Number(dayStr));
}
```

Applied in:
- `apps/mobile/app/profile/goals.tsx`
- `apps/mobile/app/profile/constraints.tsx`
- `apps/mobile/app/profile/constraint-form.tsx`

### 2. Local Date Formatting (formatDateLocal helper)
**Problem:** Using `toISOString().slice(0, 10)` converts to UTC first, shifting dates.

**Solution:** Added `formatDateLocal` using local getters:
```typescript
function formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

### 3. Promise-returning onPress Handlers (SonarCloud MAJOR)
**Problem:** Alert.alert expects `onPress: () => void` but async handlers return Promise.

**Solution:** Wrap async handlers in IIFE:
```typescript
onPress: () => {
  void (async () => {
    // async code here
  })();
}
```

### 4. Constraint List Ordering After Mutations
**Problem:** After create/update/resolve, local state order might differ from database order.

**Solution:** Added `sortConstraints` helper that matches database ordering (status ascending, start_date descending):
```typescript
function sortConstraints(constraints: ConstraintRow[]): ConstraintRow[] {
  return [...constraints].sort((a, b) => {
    if (a.status !== b.status) return a.status.localeCompare(b.status);
    return b.start_date.localeCompare(a.start_date);
  });
}
```
Applied after create, update, and resolve operations.

### 5. Test Mock for Chained .order().order() Calls
**Problem:** `getAllConstraints` uses `.order().order()` (chained), but mock only supported single `.order()`.

**Solution:** Created `ChainableQuery` interface with lazy resolution:
```typescript
interface ChainableQuery {
  order: () => ChainableQuery;
  then: <TResult>(onfulfilled?: ...) => Promise<TResult>;
}
```
The `then` method consumes the mock value only when awaited, not when methods are chained.

## Files Changed

### PR #43 - AI Service
- `apps/mobile/services/ai.ts` - Fixed comments, refactored negated conditions
- `apps/mobile/hooks/useConversation.ts` - Added useRef for messages, context window limit

### PR #44 - Constraints
- `apps/mobile/app/profile/constraint-form.tsx` - Date parsing/formatting, async handler fix
- `apps/mobile/app/profile/constraints.tsx` - Date parsing fix
- `apps/mobile/hooks/useConstraints.ts` - sortConstraints helper
- `packages/supabase-client/src/__tests__/queries/constraints.test.ts` - getAllConstraints tests

### PR #45 - Goals
- `packages/supabase-client/src/queries/goals.ts` - Added getAllGoals function
- `apps/mobile/hooks/useGoals.ts` - Loading state reset, use getAllGoals
- `apps/mobile/app/profile/goals.tsx` - Date parsing, validator fixes
- `apps/mobile/app/profile/__tests__/goals.test.tsx` - Loading/error state tests

## Learnings

1. **Jest mock ordering is tricky**: `clearAllMocks()` doesn't clear `mockResolvedValueOnce` queues. Either use `resetAllMocks()` (but this clears implementations too) or carefully track mock consumption order.

2. **Thenable mocking for Supabase**: Supabase query builders are both awaitable and chainable. To mock this, create objects with a `then` method for awaiting and method properties for chaining.

3. **Local vs UTC dates matter**: Always use local date constructors/getters for user-facing dates. Only use ISO strings for API/database storage.

## Review Workflow Used

1. Read Copilot comments via `gh api repos/.../pulls/{N}/comments`
2. Made code changes to address each comment
3. Replied to each comment explaining the fix
4. Resolved threads via GraphQL `resolveReviewThread` mutation
5. Pushed changes and verified CI passes

## Status
- PR #43: All comments addressed, ready to merge
- PR #44: All comments addressed, SonarCloud MAJOR issues closed, ready to merge
- PR #45: All comments addressed, ready to merge
