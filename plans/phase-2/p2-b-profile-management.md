# Phase 2 Workstream B: Profile Management

## Goal

Wire the existing profile management screens to Supabase for full CRUD operations. Currently the screens exist with mock data arrays - need real data fetching and persistence.

---

## Current State

- `apps/mobile/app/profile/personal-info.tsx` - Form UI exists, not wired
- `apps/mobile/app/profile/fitness-numbers.tsx` - Form UI exists, not wired
- `apps/mobile/app/profile/goals.tsx` - Uses `const mockGoals: Goal[] = []`
- `apps/mobile/app/profile/constraints.tsx` - Uses mock data
- `apps/mobile/app/profile/goal-form.tsx` - Add/edit goal form exists
- `apps/mobile/app/profile/constraint-form.tsx` - Add/edit constraint form exists
- `packages/supabase-client/src/queries/` - All queries ready (athlete, goals, constraints)

---

## Tasks (4 PRs)

### P2-B-01: Wire personal info screen to Supabase
**Branch:** `feat/p2-b-01-personal-info-supabase`

**Modify files:**
- `apps/mobile/app/profile/personal-info.tsx` - Fetch and save athlete profile
- `apps/mobile/app/profile/__tests__/personal-info.test.tsx` - Add data flow tests

**Create files:**
- `apps/mobile/hooks/useAthleteProfile.ts` - Fetch/update athlete profile
- `apps/mobile/hooks/__tests__/useAthleteProfile.test.ts`

**useAthleteProfile pattern:**
```typescript
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getAthleteProfile, updateAthleteProfile } from '@khepri/supabase-client';
import { useAuth } from '@/contexts/AuthContext';

export function useAthleteProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<AthleteProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !supabase) {
      setIsLoading(false);
      return;
    }

    async function fetchProfile() {
      try {
        const data = await getAthleteProfile(supabase!, user!.id);
        setProfile(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [user?.id]);

  const updateProfile = useCallback(async (updates: Partial<AthleteProfile>) => {
    if (!user?.id || !supabase) return { success: false };

    try {
      await updateAthleteProfile(supabase, user.id, updates);
      setProfile((prev) => prev ? { ...prev, ...updates } : null);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to save',
      };
    }
  }, [user?.id]);

  return { profile, isLoading, error, updateProfile };
}
```

**Screen changes:**
1. Use `useAthleteProfile()` instead of local state
2. Show loading spinner while fetching
3. Pre-populate form with fetched data
4. Show success/error toast on save

**Test:** Profile loads on mount, save calls updateProfile, errors displayed

---

### P2-B-02: Wire fitness numbers screen to Supabase
**Branch:** `feat/p2-b-02-fitness-numbers-supabase`

**Modify files:**
- `apps/mobile/app/profile/fitness-numbers.tsx` - Use useAthleteProfile hook
- `apps/mobile/app/profile/__tests__/fitness-numbers.test.tsx` - Add data flow tests

**Changes:**
1. Import and use `useAthleteProfile()` hook (shared with personal-info)
2. Pre-populate FTP, resting HR, max HR, weight from profile
3. Validate ranges before saving (same as onboarding)
4. Update profile on save

**Validation rules:**
- FTP: 50-500 watts (optional)
- Resting HR: 30-100 bpm (optional)
- Max HR: 120-220 bpm (optional)
- Weight: 20-200 kg (optional)

**Test:** Data loads and pre-populates, validation rejects invalid, save persists

---

### P2-B-03: Wire goals management to Supabase
**Branch:** `feat/p2-b-03-goals-supabase`

**Modify files:**
- `apps/mobile/app/profile/goals.tsx` - Fetch real goals
- `apps/mobile/app/profile/goal-form.tsx` - Create/update/delete goals
- `apps/mobile/app/profile/__tests__/goals.test.tsx`
- `apps/mobile/app/profile/__tests__/goal-form.test.tsx`

**Create files:**
- `apps/mobile/hooks/useGoals.ts` - Goals CRUD hook
- `apps/mobile/hooks/__tests__/useGoals.test.ts`

**useGoals pattern:**
```typescript
export function useGoals() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch goals on mount
  }, [user?.id]);

  const createGoal = useCallback(async (goal: NewGoal) => {
    // Insert via supabase-client
  }, [user?.id]);

  const updateGoal = useCallback(async (id: string, updates: Partial<Goal>) => {
    // Update via supabase-client
  }, [user?.id]);

  const deleteGoal = useCallback(async (id: string) => {
    // Delete via supabase-client
  }, [user?.id]);

  return { goals, isLoading, error, createGoal, updateGoal, deleteGoal };
}
```

**Screen changes:**
1. Replace `const mockGoals = []` with `useGoals()` data
2. Pass CRUD callbacks to goal-form via route params or context
3. Show loading skeleton while fetching
4. Optimistic updates for better UX

**Test:** Goals load and display, create/update/delete work, errors handled

---

### P2-B-04: Wire constraints management to Supabase
**Branch:** `feat/p2-b-04-constraints-supabase`

**Modify files:**
- `apps/mobile/app/profile/constraints.tsx` - Fetch real constraints
- `apps/mobile/app/profile/constraint-form.tsx` - Create/update/delete constraints
- `apps/mobile/app/profile/__tests__/constraints.test.tsx`
- `apps/mobile/app/profile/__tests__/constraint-form.test.tsx`

**Create files:**
- `apps/mobile/hooks/useConstraints.ts` - Constraints CRUD hook
- `apps/mobile/hooks/__tests__/useConstraints.test.ts`

**useConstraints pattern:**
```typescript
export function useConstraints() {
  const { user } = useAuth();
  const [constraints, setConstraints] = useState<Constraint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Same pattern as useGoals

  return {
    constraints,
    isLoading,
    error,
    createConstraint,
    updateConstraint,
    deleteConstraint,
  };
}
```

**Constraint types to support:**
- Recurring (e.g., "No training on Mondays")
- Date range (e.g., "Vacation Dec 20-27")
- One-time (e.g., "Doctor appointment March 15")

**Test:** Constraints load and display, CRUD operations work, date handling correct

---

## Dependencies

```
P2-B-01 ─────→ P2-B-02 (shared hook)
     │
     └────────────────→ P2-B-03 (independent but similar pattern)
                        P2-B-04 (independent but similar pattern)
```

- P2-B-01 creates the shared pattern (useAthleteProfile hook)
- P2-B-02 depends on P2-B-01 (uses same hook)
- P2-B-03 and P2-B-04 are independent and can run in parallel

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Personal info screen | `apps/mobile/app/profile/personal-info.tsx` |
| Fitness numbers screen | `apps/mobile/app/profile/fitness-numbers.tsx` |
| Goals screen | `apps/mobile/app/profile/goals.tsx` |
| Goal form | `apps/mobile/app/profile/goal-form.tsx` |
| Constraints screen | `apps/mobile/app/profile/constraints.tsx` |
| Constraint form | `apps/mobile/app/profile/constraint-form.tsx` |
| Athlete queries | `packages/supabase-client/src/queries/athlete.ts` |
| Goals queries | `packages/supabase-client/src/queries/goals.ts` |
| Constraints queries | `packages/supabase-client/src/queries/constraints.ts` |

---

## Testing Approach

- Unit tests for each hook with mocked Supabase
- Component tests for screens with mock hooks
- Test loading, success, and error states
- Test optimistic updates and rollback on error

---

## Verification

After all 4 PRs merged:
1. Profile screens load real data from Supabase
2. Changes persist across app restarts
3. Multiple devices see same data
4. Deleting a goal removes it immediately
5. Validation prevents invalid data
6. Error messages display appropriately
