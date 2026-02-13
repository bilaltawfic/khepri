# P2-A-05: Wire Final Onboarding Step to Save Data

## Branch
```bash
git checkout feat/p2-a-05-save-onboarding-data
```

## Goal
Wire the onboarding plan screen (`apps/mobile/app/onboarding/plan.tsx`) to save all collected onboarding data to Supabase when the user completes onboarding. Currently the screen has a `// TODO: Save onboarding preferences` comment and just navigates to the main app.

## Current State
- `apps/mobile/app/onboarding/plan.tsx` - UI complete, but `handleFinish` just calls `router.replace('/(tabs)')`
- `apps/mobile/contexts/OnboardingContext.tsx` - Has all collected data (intervals credentials, fitness numbers, goals, plan duration)
- `packages/supabase-client/src/queries/athlete.ts` - Has `updateAthlete` function
- `packages/supabase-client/src/queries/goals.ts` - Has `createGoal` function

## Changes Required

### 1. Create onboarding service

Create `apps/mobile/services/onboarding.ts`:

```typescript
import { supabase } from '@/lib/supabase';
import {
  createGoal,
  getAthleteByAuthUser,
  updateAthlete,
  type GoalInsert,
} from '@khepri/supabase-client';
import type { OnboardingData, OnboardingGoal } from '@/contexts';

export type SaveOnboardingResult = {
  success: boolean;
  error?: string;
};

/**
 * Saves all onboarding data to Supabase.
 * - Updates athlete profile with fitness numbers
 * - Creates goals from onboarding goals list
 * - Plan duration is stored in athlete profile
 *
 * Note: Intervals.icu credentials are NOT saved here (Phase 3 - needs encryption)
 */
export async function saveOnboardingData(
  authUserId: string,
  data: OnboardingData
): Promise<SaveOnboardingResult> {
  // Dev mode bypass - no Supabase configured
  if (!supabase) {
    return { success: true };
  }

  try {
    // 1. Resolve athlete record from auth user ID
    const athleteResult = await getAthleteByAuthUser(supabase, authUserId);

    if (athleteResult.error) {
      return { success: false, error: athleteResult.error.message };
    }

    if (!athleteResult.data) {
      return { success: false, error: 'Athlete profile not found' };
    }

    const athlete = athleteResult.data;

    // 2. Update athlete profile with fitness numbers and plan preferences
    const updateResult = await updateAthlete(supabase, athlete.id, {
      ftp_watts: data.ftp ?? null,
      resting_heart_rate: data.restingHR ?? null,
      max_heart_rate: data.maxHR ?? null,
      // Note: weight_kg might not be in OnboardingData yet
      // Add plan_duration_weeks if the field exists in schema
    });

    if (updateResult.error) {
      return { success: false, error: updateResult.error.message };
    }

    // 3. Create goals from onboarding
    const goalErrors: string[] = [];

    for (const goal of data.goals) {
      const goalInsert: GoalInsert = {
        athlete_id: athlete.id,
        goal_type: goal.goalType,
        title: goal.title,
        target_date: goal.targetDate ?? null,
        priority: goal.priority,
        status: 'active',
      };

      const goalResult = await createGoal(supabase, goalInsert);

      if (goalResult.error) {
        goalErrors.push(`Failed to create goal "${goal.title}": ${goalResult.error.message}`);
      }
    }

    // Report partial success if some goals failed
    if (goalErrors.length > 0) {
      return {
        success: true,
        error: `Profile saved but some goals failed: ${goalErrors.join('; ')}`,
      };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save onboarding data',
    };
  }
}
```

### 2. Create test file

Create `apps/mobile/services/__tests__/onboarding.test.ts`:

```typescript
import { saveOnboardingData } from '../onboarding';

// Mock supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {},
}));

const mockAthleteResult = {
  data: { id: 'athlete-123', display_name: 'Test User' },
  error: null,
};

const mockUpdateResult = { data: {}, error: null };
const mockGoalResult = { data: { id: 'goal-1' }, error: null };

jest.mock('@khepri/supabase-client', () => ({
  getAthleteByAuthUser: jest.fn(() => Promise.resolve(mockAthleteResult)),
  updateAthlete: jest.fn(() => Promise.resolve(mockUpdateResult)),
  createGoal: jest.fn(() => Promise.resolve(mockGoalResult)),
}));

describe('saveOnboardingData', () => {
  const mockAuthUserId = 'auth-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates athlete profile with fitness numbers', async () => {
    const { updateAthlete } = require('@khepri/supabase-client');

    const result = await saveOnboardingData(mockAuthUserId, {
      ftp: 250,
      restingHR: 52,
      maxHR: 185,
      goals: [],
    });

    expect(result.success).toBe(true);
    expect(updateAthlete).toHaveBeenCalledWith(
      expect.anything(),
      'athlete-123',
      expect.objectContaining({
        ftp_watts: 250,
        resting_heart_rate: 52,
        max_heart_rate: 185,
      })
    );
  });

  it('creates goals from onboarding data', async () => {
    const { createGoal } = require('@khepri/supabase-client');

    const result = await saveOnboardingData(mockAuthUserId, {
      goals: [
        {
          goalType: 'race',
          title: 'Complete Ironman',
          targetDate: '2024-09-15',
          priority: 'A',
        },
        {
          goalType: 'fitness',
          title: 'Build base fitness',
          priority: 'B',
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(createGoal).toHaveBeenCalledTimes(2);
    expect(createGoal).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        athlete_id: 'athlete-123',
        goal_type: 'race',
        title: 'Complete Ironman',
        target_date: '2024-09-15',
        priority: 'A',
        status: 'active',
      })
    );
  });

  it('handles missing athlete profile', async () => {
    const { getAthleteByAuthUser } = require('@khepri/supabase-client');
    getAthleteByAuthUser.mockResolvedValueOnce({ data: null, error: null });

    const result = await saveOnboardingData(mockAuthUserId, { goals: [] });

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('handles update errors gracefully', async () => {
    const { updateAthlete } = require('@khepri/supabase-client');
    updateAthlete.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database error' },
    });

    const result = await saveOnboardingData(mockAuthUserId, { goals: [] });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Database error');
  });

  it('reports partial success when some goals fail', async () => {
    const { createGoal } = require('@khepri/supabase-client');
    createGoal
      .mockResolvedValueOnce({ data: { id: 'goal-1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Duplicate goal' } });

    const result = await saveOnboardingData(mockAuthUserId, {
      goals: [
        { goalType: 'race', title: 'Goal 1', priority: 'A' },
        { goalType: 'race', title: 'Goal 2', priority: 'B' },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.error).toContain('some goals failed');
  });
});
```

### 3. Update plan.tsx to save data

Update `apps/mobile/app/onboarding/plan.tsx`:

```typescript
import { Alert } from 'react-native';
import { useAuth, useOnboarding } from '@/contexts';
import { saveOnboardingData } from '@/services/onboarding';

export default function PlanScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { user } = useAuth();
  const { data: onboardingData, setPlanDuration, reset } = useOnboarding();
  const [selectedPlan, setSelectedPlan] = useState<PlanOption>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(12);
  const [isSaving, setIsSaving] = useState(false);

  const handleFinish = async () => {
    // Update plan duration in context before saving
    if (selectedPlan === 'structured') {
      setPlanDuration(selectedDuration);
    } else {
      setPlanDuration(undefined);
    }

    // Save to Supabase
    if (user?.id) {
      setIsSaving(true);

      const result = await saveOnboardingData(user.id, {
        ...onboardingData,
        planDurationWeeks: selectedPlan === 'structured' ? selectedDuration : undefined,
      });

      setIsSaving(false);

      if (!result.success) {
        Alert.alert(
          'Save Error',
          result.error ?? 'Failed to save your preferences. You can update them later in your profile.',
          [
            { text: 'Continue Anyway', onPress: () => finishOnboarding() },
            { text: 'Try Again', style: 'cancel' },
          ]
        );
        return;
      }

      // Show warning if partial success (some goals failed)
      if (result.error) {
        Alert.alert('Note', result.error, [{ text: 'OK', onPress: () => finishOnboarding() }]);
        return;
      }
    }

    finishOnboarding();
  };

  const finishOnboarding = () => {
    // Reset onboarding context
    reset();
    // Navigate to main app
    router.replace('/(tabs)');
  };

  // ... rest of component

  return (
    <ScreenContainer>
      {/* ... existing UI ... */}

      <View style={styles.actions}>
        <Button
          title={isSaving ? 'Saving...' : 'Start Training'}
          onPress={handleFinish}
          disabled={!selectedPlan || isSaving}
          accessibilityLabel="Start training"
        />
        <Button
          title="Decide later"
          variant="text"
          onPress={finishOnboarding}
          disabled={isSaving}
          accessibilityLabel="Decide later"
        />
      </View>
    </ScreenContainer>
  );
}
```

### 4. Add test for plan screen

Create/update `apps/mobile/app/onboarding/__tests__/plan.test.tsx`:

```typescript
import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import PlanScreen from '../plan';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

const mockSaveOnboardingData = jest.fn();
jest.mock('@/services/onboarding', () => ({
  saveOnboardingData: (...args: unknown[]) => mockSaveOnboardingData(...args),
}));

jest.mock('@/contexts', () => ({
  useAuth: () => ({ user: { id: 'test-user' } }),
  useOnboarding: () => ({
    data: { goals: [] },
    setPlanDuration: jest.fn(),
    reset: jest.fn(),
  }),
}));

describe('PlanScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSaveOnboardingData.mockResolvedValue({ success: true });
  });

  it('saves onboarding data when Start Training is pressed', async () => {
    render(<PlanScreen />);

    // Select a plan first (required)
    const structuredPlan = screen.getByLabelText('Select Structured Training Plan');
    fireEvent.press(structuredPlan);

    const startButton = screen.getByLabelText('Start training');
    fireEvent.press(startButton);

    await waitFor(() => {
      expect(mockSaveOnboardingData).toHaveBeenCalled();
    });
  });

  it('navigates to tabs after successful save', async () => {
    render(<PlanScreen />);

    const structuredPlan = screen.getByLabelText('Select Structured Training Plan');
    fireEvent.press(structuredPlan);

    const startButton = screen.getByLabelText('Start training');
    fireEvent.press(startButton);

    await waitFor(() => {
      expect(require('expo-router').router.replace).toHaveBeenCalledWith('/(tabs)');
    });
  });

  it('allows skipping without saving', async () => {
    render(<PlanScreen />);

    const skipButton = screen.getByLabelText('Decide later');
    fireEvent.press(skipButton);

    expect(mockSaveOnboardingData).not.toHaveBeenCalled();
    expect(require('expo-router').router.replace).toHaveBeenCalledWith('/(tabs)');
  });
});
```

## Files to Create
- `apps/mobile/services/onboarding.ts` - Save onboarding data service
- `apps/mobile/services/__tests__/onboarding.test.ts` - Service tests
- `apps/mobile/app/onboarding/__tests__/plan.test.tsx` - Screen tests

## Files to Modify
- `apps/mobile/app/onboarding/plan.tsx` - Wire to save service

## Checklist
- [ ] Create `saveOnboardingData` service function
- [ ] Handle athlete lookup via `getAthleteByAuthUser`
- [ ] Update athlete profile with fitness numbers
- [ ] Create goals from onboarding context
- [ ] Handle errors gracefully with Alert
- [ ] Show loading state while saving
- [ ] Reset onboarding context after successful save
- [ ] Add "Decide later" path that skips saving
- [ ] Write unit tests for service
- [ ] Write component tests for screen
- [ ] Run `pnpm lint` and `pnpm test`

## Notes
- Intervals.icu credentials are NOT saved here - that requires encryption (Phase 3)
- Plan duration might not have a schema field yet - could add to athlete profile or skip
- Use `getAthleteByAuthUser` to resolve athlete ID from auth user ID
- Goals should be created with `status: 'active'`

## PR Guidelines
- Follow conventional commit: `feat(mobile): wire onboarding plan screen to save data`
- Keep PR focused on this single task
- Test the full onboarding flow manually before submitting
