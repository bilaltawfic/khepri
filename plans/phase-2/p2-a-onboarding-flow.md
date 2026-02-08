# Phase 2 Workstream A: Complete Onboarding Flow

## Goal

Wire the existing onboarding UI screens to persist data to Supabase via `@khepri/supabase-client`. Currently the screens exist but inputs are disabled and no data is saved.

---

## Current State

- `apps/mobile/app/onboarding/connect.tsx` - Intervals.icu connection UI exists, inputs disabled
- `apps/mobile/app/onboarding/fitness.tsx` - Fitness numbers UI exists
- `apps/mobile/app/onboarding/goals.tsx` - Goals setup UI exists
- `apps/mobile/app/onboarding/plan.tsx` - Plan duration UI exists
- `packages/supabase-client/src/queries/athlete.ts` - Athlete profile queries ready
- `packages/supabase-client/src/queries/goals.ts` - Goals CRUD ready
- Auth flow complete (P1-C) - user context available

---

## Tasks (5 PRs)

### P2-A-01: Enable Intervals.icu connect screen inputs
**Branch:** `feat/p2-a-01-connect-screen-inputs`

**Modify files:**
- `apps/mobile/app/onboarding/connect.tsx` - Enable inputs, add state management
- `apps/mobile/app/onboarding/__tests__/connect.test.tsx` - Add input tests

**Changes:**
1. Remove `editable={false}` from TextInput components
2. Add state for `athleteId` and `apiKey`
3. Add validation (athleteId required if apiKey provided, vice versa)
4. Store credentials temporarily in context (encrypted storage comes in P3)
5. For now, "Connect" just validates and proceeds (real connection in P3)

**Pattern:**
```typescript
const [athleteId, setAthleteId] = useState('');
const [apiKey, setApiKey] = useState('');

const handleConnect = () => {
  // Validate both or neither
  if ((athleteId && !apiKey) || (!athleteId && apiKey)) {
    setError('Please provide both Athlete ID and API Key');
    return;
  }
  // Store in onboarding context if provided
  if (athleteId && apiKey) {
    setIntervalsCredentials({ athleteId, apiKey });
  }
  router.push('/onboarding/fitness');
};
```

**Test:** Inputs are editable, validation works, navigation proceeds

---

### P2-A-02: Create onboarding context for multi-step data
**Branch:** `feat/p2-a-02-onboarding-context`

**Create files:**
- `apps/mobile/contexts/OnboardingContext.tsx` - Holds data across steps
- `apps/mobile/contexts/__tests__/OnboardingContext.test.tsx`

**Update files:**
- `apps/mobile/contexts/index.ts` - Re-export
- `apps/mobile/app/onboarding/_layout.tsx` - Wrap with OnboardingProvider

**OnboardingContext pattern:**
```typescript
type OnboardingData = {
  // Step 1: Intervals.icu (optional)
  intervalsAthleteId?: string;
  intervalsApiKey?: string;

  // Step 2: Fitness numbers (all optional)
  ftp?: number;
  restingHR?: number;
  maxHR?: number;
  weight?: number;

  // Step 3: Goals
  goals: OnboardingGoal[];

  // Step 4: Plan duration
  planDurationWeeks?: number;
};

type OnboardingGoal = {
  goalType: 'race' | 'performance' | 'fitness' | 'health';
  title: string;
  targetDate?: string; // ISO date
  priority: 'A' | 'B' | 'C';
};

type OnboardingContextValue = {
  data: OnboardingData;
  setIntervalsCredentials: (creds: { athleteId: string; apiKey: string }) => void;
  setFitnessNumbers: (numbers: Partial<OnboardingData>) => void;
  addGoal: (goal: OnboardingGoal) => void;
  removeGoal: (index: number) => void;
  setPlanDuration: (weeks: number | undefined) => void;
  reset: () => void;
};
```

**Test:** Context provides values, setters update state, reset clears data

---

### P2-A-03: Wire fitness numbers screen to context
**Branch:** `feat/p2-a-03-fitness-screen-wire`

**Modify files:**
- `apps/mobile/app/onboarding/fitness.tsx` - Use OnboardingContext
- `apps/mobile/app/onboarding/__tests__/fitness.test.tsx` - Add data flow tests

**Changes:**
1. Import and use `useOnboarding()` context
2. Wire each input to context setters
3. Pre-populate from context if navigating back
4. Validate number ranges (FTP: 50-500, HR: 30-220, weight: 20-200)

**Test:** Inputs update context, validation rejects out-of-range values

---

### P2-A-04: Wire goals screen to context
**Branch:** `feat/p2-a-04-goals-screen-wire`

**Modify files:**
- `apps/mobile/app/onboarding/goals.tsx` - Use OnboardingContext
- `apps/mobile/app/onboarding/__tests__/goals.test.tsx` - Add goal management tests

**Changes:**
1. Use `useOnboarding()` for goals state
2. Implement add/remove goal functionality
3. Allow 0-5 goals (can skip, but limit max)
4. Each goal needs: type, title, optional date, priority (default B)

**Test:** Can add goal, can remove goal, max 5 enforced

---

### P2-A-05: Wire final step to save data to Supabase
**Branch:** `feat/p2-a-05-save-onboarding-data`

**Modify files:**
- `apps/mobile/app/onboarding/plan.tsx` - Save to Supabase on complete
- `apps/mobile/app/onboarding/__tests__/plan.test.tsx` - Add save flow tests

**Create files:**
- `apps/mobile/services/onboarding.ts` - Orchestrates saving all data
- `apps/mobile/services/__tests__/onboarding.test.ts`

**onboarding.ts pattern:**
```typescript
import { supabase } from '@/lib/supabase';
import { updateAthleteProfile, insertGoal } from '@khepri/supabase-client';

export async function saveOnboardingData(
  userId: string,
  data: OnboardingData
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) return { success: true }; // Dev mode bypass

  try {
    // 1. Update athlete profile with fitness numbers
    await updateAthleteProfile(supabase, userId, {
      ftp: data.ftp,
      restingHR: data.restingHR,
      maxHR: data.maxHR,
      weight: data.weight,
    });

    // 2. Save goals
    for (const goal of data.goals) {
      await insertGoal(supabase, userId, {
        goal_type: goal.goalType,
        title: goal.title,
        target_date: goal.targetDate,
        priority: goal.priority,
        status: 'active',
      });
    }

    // 3. Intervals.icu credentials saved in P3 (needs encryption)

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save'
    };
  }
}
```

**Test:** Mock supabase calls, verify all data passed correctly

---

## Dependencies

```
P2-A-01 ─────┐
             ├──→ P2-A-03 (needs context)
P2-A-02 ─────┤
             ├──→ P2-A-04 (needs context)
             │
             └──→ P2-A-05 (needs all screens wired)
```

- P2-A-01 and P2-A-02 can run in parallel
- P2-A-03 and P2-A-04 can run in parallel (both need P2-A-02)
- P2-A-05 needs all previous tasks

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Connect screen | `apps/mobile/app/onboarding/connect.tsx` |
| Fitness screen | `apps/mobile/app/onboarding/fitness.tsx` |
| Goals screen | `apps/mobile/app/onboarding/goals.tsx` |
| Plan screen | `apps/mobile/app/onboarding/plan.tsx` |
| Athlete queries | `packages/supabase-client/src/queries/athlete.ts` |
| Goals queries | `packages/supabase-client/src/queries/goals.ts` |
| Auth context | `apps/mobile/contexts/AuthContext.tsx` |

---

## Testing Approach

- Unit tests for OnboardingContext state management
- Component tests for each screen with mock context
- Integration test for saveOnboardingData with mocked Supabase
- No real Supabase calls in tests - use mocks

---

## Verification

After all 5 PRs merged:
1. Complete onboarding flow from start to finish
2. Check Supabase dashboard - athlete profile updated
3. Check Supabase dashboard - goals created
4. Navigate back through screens - data persists
5. Log out and log in - profile and goals visible in profile screens
