# P3-B-04: Sync Wellness Data to Daily Check-in

## Goal

Pre-populate the daily check-in form with wellness data from Intervals.icu, reducing manual data entry and improving accuracy. Athletes who log data in Intervals.icu (or through wearables that sync to it) will see their sleep, HRV, and subjective metrics automatically populated.

## Dependencies

- P3-A-03 (get_wellness_data tool) ✅
- P3-B-02 (encrypted credentials storage) ✅

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `apps/mobile/services/intervals.ts` | Create | MCP gateway client for wellness data |
| `apps/mobile/hooks/useWellnessSync.ts` | Create | Hook to fetch and transform wellness data |
| `apps/mobile/hooks/useCheckin.ts` | Modify | Accept initial data and prefill state |
| `apps/mobile/app/(tabs)/checkin.tsx` | Modify | Fetch wellness data on mount |
| `apps/mobile/services/index.ts` | Modify | Export new service |

## Implementation Steps

### Step 1: Create Intervals Service

Create `apps/mobile/services/intervals.ts`:

```typescript
import { supabase } from '@/lib/supabase';

// MCP Gateway response types
interface MCPToolResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

interface WellnessDataPoint {
  date: string;
  ctl: number;
  atl: number;
  tsb: number;
  rampRate: number;
  restingHR?: number;
  hrv?: number;
  sleepQuality?: number; // 1-5 scale
  sleepHours?: number;
  fatigue?: number; // 1-5 scale
  soreness?: number; // 1-5 scale
  stress?: number; // 1-5 scale
  mood?: number; // 1-5 scale
}

interface WellnessResponse {
  wellness: WellnessDataPoint[];
  summary: {
    current_ctl: number;
    current_atl: number;
    current_tsb: number;
    form_status: 'fresh' | 'fatigued' | 'optimal';
    avg_sleep_hours: number;
    avg_hrv: number;
    days_included: number;
  } | null;
  date_range: {
    oldest: string;
    newest: string;
  };
}

function getMCPGatewayUrl(): string {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error('EXPO_PUBLIC_SUPABASE_URL is not configured');
  }
  return `${url}/functions/v1/mcp-gateway`;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Fetch today's wellness data from Intervals.icu via MCP gateway.
 */
export async function getTodayWellness(): Promise<WellnessDataPoint | null> {
  const headers = await getAuthHeaders();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const response = await fetch(getMCPGatewayUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'execute_tool',
      tool_name: 'get_wellness_data',
      tool_input: {
        oldest: today,
        newest: today,
      },
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch wellness data');
  }

  const result: MCPToolResponse<WellnessResponse> = await response.json();

  if (!result.success || !result.data) {
    return null;
  }

  // Return today's data if available
  const todayData = result.data.wellness.find((w) => w.date === today);
  return todayData ?? null;
}

export type { WellnessDataPoint };
```

### Step 2: Create useWellnessSync Hook

Create `apps/mobile/hooks/useWellnessSync.ts`:

```typescript
import { useCallback, useEffect, useState } from 'react';

import { getTodayWellness, type WellnessDataPoint } from '@/services/intervals';
import type { CheckinFormData } from '@/types/checkin';

interface WellnessSyncState {
  isLoading: boolean;
  error: string | null;
  wellnessData: WellnessDataPoint | null;
  prefillData: Partial<CheckinFormData> | null;
}

/**
 * Map Intervals.icu 1-5 scale to our 1-10 scale.
 * Adds more granularity by spreading the 5 values across 10.
 */
function scale5to10(value: number | undefined): number | null {
  if (value == null) return null;
  // Map 1→1, 2→3, 3→5, 4→7, 5→9
  // This preserves the relative meaning while expanding the range
  return Math.round((value - 1) * 2 + 1);
}

/**
 * Map our 1-10 energy level based on Intervals.icu fatigue.
 * Fatigue 1 (low) = high energy, Fatigue 5 (high) = low energy.
 */
function fatigueToEnergy(fatigue: number | undefined): number | null {
  if (fatigue == null) return null;
  // Invert: fatigue 1 → energy 9, fatigue 5 → energy 1
  return Math.round((6 - fatigue) * 2 - 1);
}

/**
 * Transform Intervals.icu wellness data to check-in form prefill data.
 */
function transformWellnessToCheckin(wellness: WellnessDataPoint): Partial<CheckinFormData> {
  return {
    sleepQuality: scale5to10(wellness.sleepQuality),
    sleepHours: wellness.sleepHours ?? null,
    energyLevel: fatigueToEnergy(wellness.fatigue),
    stressLevel: scale5to10(wellness.stress),
    overallSoreness: scale5to10(wellness.soreness),
  };
}

export function useWellnessSync(): WellnessSyncState & {
  refetch: () => Promise<void>;
} {
  const [state, setState] = useState<WellnessSyncState>({
    isLoading: true,
    error: null,
    wellnessData: null,
    prefillData: null,
  });

  const fetchWellness = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const wellness = await getTodayWellness();

      if (wellness) {
        const prefillData = transformWellnessToCheckin(wellness);
        setState({
          isLoading: false,
          error: null,
          wellnessData: wellness,
          prefillData,
        });
      } else {
        // No wellness data for today - not an error, just no data
        setState({
          isLoading: false,
          error: null,
          wellnessData: null,
          prefillData: null,
        });
      }
    } catch (error) {
      // Don't block check-in on wellness sync failure
      console.warn('Failed to fetch wellness data:', error);
      setState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to sync wellness data',
        wellnessData: null,
        prefillData: null,
      });
    }
  }, []);

  useEffect(() => {
    fetchWellness();
  }, [fetchWellness]);

  return {
    ...state,
    refetch: fetchWellness,
  };
}
```

### Step 3: Update useCheckin Hook

Modify `apps/mobile/hooks/useCheckin.ts` to accept initial data:

```typescript
// Add parameter for initial data
export function useCheckin(initialData?: Partial<CheckinFormData>): UseCheckinReturn {
  // Merge initial data with defaults
  const [formData, setFormData] = useState<CheckinFormData>(() => ({
    ...DEFAULT_CHECKIN_FORM,
    ...initialData,
  }));

  // ... rest of hook unchanged

  // Update resetForm to support re-applying initial data
  const resetForm = useCallback(() => {
    setFormData({ ...DEFAULT_CHECKIN_FORM, ...initialData });
    setSubmissionState('idle');
    setSubmissionError(null);
    setRecommendation(null);
  }, [initialData]);

  // ... rest unchanged
}
```

Also add an `applyPrefill` function:

```typescript
// Add method to apply prefill data (for use after initial render)
const applyPrefill = useCallback((prefill: Partial<CheckinFormData>) => {
  setFormData((prev) => {
    const updated = { ...prev };
    // Only apply non-null prefill values to null form fields
    if (prefill.sleepQuality != null && prev.sleepQuality === null) {
      updated.sleepQuality = prefill.sleepQuality;
    }
    if (prefill.sleepHours != null && prev.sleepHours === null) {
      updated.sleepHours = prefill.sleepHours;
    }
    if (prefill.energyLevel != null && prev.energyLevel === null) {
      updated.energyLevel = prefill.energyLevel;
    }
    if (prefill.stressLevel != null && prev.stressLevel === null) {
      updated.stressLevel = prefill.stressLevel;
    }
    if (prefill.overallSoreness != null && prev.overallSoreness === null) {
      updated.overallSoreness = prefill.overallSoreness;
    }
    return updated;
  });
}, []);
```

### Step 4: Update Check-in Screen

Modify `apps/mobile/app/(tabs)/checkin.tsx`:

```typescript
import { useWellnessSync } from '@/hooks/useWellnessSync';

export default function CheckinScreen() {
  const { prefillData, isLoading: wellnessLoading } = useWellnessSync();

  const {
    formData,
    applyPrefill,
    // ... rest of useCheckin
  } = useCheckin();

  // Apply prefill when it becomes available
  useEffect(() => {
    if (prefillData) {
      applyPrefill(prefillData);
    }
  }, [prefillData, applyPrefill]);

  // Show loading indicator while fetching wellness data
  // (but only briefly - don't block the form)

  // In the header, show a sync indicator
  return (
    <ScreenContainer>
      <ScrollView>
        <View style={styles.header}>
          <ThemedText type="title">Daily Check-in</ThemedText>
          {wellnessLoading ? (
            <View style={styles.syncIndicator}>
              <ActivityIndicator size="small" />
              <ThemedText type="caption">Syncing from Intervals.icu...</ThemedText>
            </View>
          ) : prefillData ? (
            <View style={styles.syncIndicator}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <ThemedText type="caption">Pre-filled from Intervals.icu</ThemedText>
            </View>
          ) : null}
        </View>
        {/* ... rest of form */}
      </ScrollView>
    </ScreenContainer>
  );
}
```

### Step 5: Add Visual Indicator for Pre-filled Fields

Add subtle styling to indicate which fields were pre-filled:

```typescript
// In ScaleInput, HoursInput components, add optional prefilled indicator
interface InputProps {
  // ... existing props
  isPrefilled?: boolean;
}

// Show a small indicator when isPrefilled is true
{isPrefilled && (
  <View style={styles.prefilledBadge}>
    <Ionicons name="sync" size={12} />
    <ThemedText type="caption">Synced</ThemedText>
  </View>
)}
```

### Step 6: Export New Service

Update `apps/mobile/services/index.ts`:

```typescript
export * from './intervals';
```

## Testing Requirements

### Unit Tests

Create `apps/mobile/hooks/__tests__/useWellnessSync.test.ts`:

```typescript
import { renderHook, waitFor } from '@testing-library/react-native';

import { useWellnessSync } from '../useWellnessSync';
import * as intervals from '@/services/intervals';

jest.mock('@/services/intervals');

describe('useWellnessSync', () => {
  it('transforms wellness data to checkin prefill', async () => {
    jest.spyOn(intervals, 'getTodayWellness').mockResolvedValue({
      date: '2026-02-13',
      ctl: 70,
      atl: 65,
      tsb: 5,
      rampRate: 2,
      sleepQuality: 4, // 1-5 scale → should become 7 on 1-10 scale
      sleepHours: 7.5,
      fatigue: 2, // low fatigue → high energy (7)
      stress: 3, // mid stress → 5
      soreness: 2, // low soreness → 3
    });

    const { result } = renderHook(() => useWellnessSync());

    await waitFor(() => !result.current.isLoading);

    expect(result.current.prefillData).toEqual({
      sleepQuality: 7,
      sleepHours: 7.5,
      energyLevel: 7,
      stressLevel: 5,
      overallSoreness: 3,
    });
  });

  it('returns null prefill when no wellness data', async () => {
    jest.spyOn(intervals, 'getTodayWellness').mockResolvedValue(null);

    const { result } = renderHook(() => useWellnessSync());

    await waitFor(() => !result.current.isLoading);

    expect(result.current.prefillData).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('handles fetch errors gracefully', async () => {
    jest.spyOn(intervals, 'getTodayWellness').mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useWellnessSync());

    await waitFor(() => !result.current.isLoading);

    expect(result.current.prefillData).toBeNull();
    expect(result.current.error).toBe('Network error');
  });
});
```

### Integration Testing

1. Configure Intervals.icu credentials
2. Add wellness data for today in Intervals.icu
3. Open check-in screen
4. Verify fields are pre-populated
5. Verify "Pre-filled from Intervals.icu" message appears
6. Verify user can still edit pre-filled values

### Test Scenarios

1. **With credentials + today's data**: Fields pre-populate, indicator shows
2. **With credentials + no today's data**: Form shows empty, no indicator
3. **Without credentials**: Form shows empty, no error, no indicator
4. **API error**: Form shows empty, no visible error (logged to console)
5. **User edits pre-filled value**: Value changes, still submittable

## Code Patterns to Follow

1. **Graceful degradation**: Wellness sync failure shouldn't block check-in
2. **Only prefill null fields**: Don't overwrite user edits
3. **Scale mapping**: Document the 1-5 to 1-10 transformation
4. **Visual feedback**: Show where data came from
5. **Loading states**: Brief, non-blocking loading indicator

## Verification Checklist

- [ ] intervals.ts service created and exports getTodayWellness
- [ ] useWellnessSync hook created with correct transformation logic
- [ ] useCheckin accepts initial/prefill data
- [ ] Check-in screen fetches wellness on mount
- [ ] Pre-filled fields show indicator
- [ ] User can still edit pre-filled values
- [ ] Works gracefully when no credentials configured
- [ ] Works gracefully when no wellness data for today
- [ ] Error handling doesn't block check-in
- [ ] Unit tests pass
- [ ] Lint passes (`pnpm lint`)

## Scale Mapping Reference

| Intervals.icu (1-5) | Check-in (1-10) | Description |
|---------------------|-----------------|-------------|
| 1 | 1 | Very low / Poor |
| 2 | 3 | Low |
| 3 | 5 | Moderate |
| 4 | 7 | Good |
| 5 | 9 | Excellent |

**Fatigue → Energy mapping (inverted):**
| Fatigue (1-5) | Energy (1-10) |
|---------------|---------------|
| 1 (low fatigue) | 9 (high energy) |
| 2 | 7 |
| 3 | 5 |
| 4 | 3 |
| 5 (high fatigue) | 1 (low energy) |

## Estimated Time

2-3 hours
