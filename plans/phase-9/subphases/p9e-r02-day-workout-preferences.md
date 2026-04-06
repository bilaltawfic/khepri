# P9E-R-02: Per-Day Workout Preferences UI

## Goal
Add a "Your weekly rhythm" section to block setup where the user can assign workout preferences to specific days (day + sport + optional workout type). Show required sports info card from race distance, and warn when preferences don't meet minimums.

**Depends on:** P9E-R-01 (getSportRequirements) ✅ #159, P9E-R-03 (block dates + season races from hook) ✅ #160

## Files to Create/Modify
- **Modify:** `apps/mobile/contexts/SeasonSetupContext.tsx` — extend `DayConstraint` type with `workoutLabel`
- **Modify:** `apps/mobile/app/plan/block-setup.tsx` — add "Your weekly rhythm" section with day preference rows, info card, and warning
- **Create:** `apps/mobile/components/DayPreferenceRow.tsx` — single day row with sport/workout chips
- **Create:** `apps/mobile/components/AddPreferenceSheet.tsx` — bottom sheet for adding sport + workout type to a day
- **Create:** `apps/mobile/app/plan/__tests__/day-preferences.test.tsx` — tests for the UI components
- **Modify:** `apps/mobile/hooks/useBlockPlanning.ts` — expose season races for sport requirements derivation (if not already from R-03)

## Implementation Steps

### 1. Extend `DayConstraint` type

In `SeasonSetupContext.tsx`, add optional `workoutLabel`:
```typescript
export type DayConstraint = {
  sport: string;
  days: readonly number[];
  type: 'preferred' | 'only';
  workoutLabel?: string; // e.g. "Long Ride", "Technique Swim"
};
```

### 2. Create `DayPreferenceRow` component

New file: `apps/mobile/components/DayPreferenceRow.tsx`

A single row for one day of the week:
- Left: day name (Mon, Tue, etc.)
- Center: chips showing assigned preferences (e.g., "Swim", "Long Ride")
- Right: "+" button to add a preference
- Each chip has an X to remove it

```tsx
interface DayPreferenceRowProps {
  readonly dayIndex: number;              // 0=Mon ... 6=Sun
  readonly preferences: readonly DayPreference[];
  readonly onAdd: (dayIndex: number) => void;
  readonly onRemove: (dayIndex: number, prefIndex: number) => void;
}

interface DayPreference {
  readonly sport: string;
  readonly workoutLabel?: string;
}
```

Sport icons: Swim = water, Bike = bicycle, Run = walk (use Ionicons).

### 3. Create `AddPreferenceSheet` component

New file: `apps/mobile/components/AddPreferenceSheet.tsx`

A bottom sheet (or Modal) that opens when the user taps "+" on a day row:
1. **Sport picker** — list of available sports (filtered by required sports from race, but allow any)
2. **Optional workout type** — text input or picker with common presets: "Long", "Tempo", "Threshold", "Easy/Recovery", "Technique", "Intervals"
3. **Confirm button** — adds the preference to that day

```tsx
interface AddPreferenceSheetProps {
  readonly visible: boolean;
  readonly dayIndex: number;
  readonly availableSports: readonly string[];
  readonly onConfirm: (sport: string, workoutLabel?: string) => void;
  readonly onDismiss: () => void;
}
```

### 4. Add "Your weekly rhythm" section to block-setup.tsx

Insert between the block date header (from R-03) and the unavailability section:

1. **Required sports info card**
   - Use `getSportRequirements()` and `mergeSportRequirements()` from `@khepri/core`
   - Derive requirements from season races (exposed by `useBlockPlanning()`)
   - Display: "Your 70.3 requires: Swim (min 2/wk), Bike (min 3/wk), Run (min 3/wk)"
   - Style: info card with light blue background and info icon

2. **Day preference grid** (7 `DayPreferenceRow` components)
   - State: `dayPreferences: DayPreference[][]` — array of 7 arrays (one per day)
   - Pre-populate from season-level `dayConstraints` if they exist

3. **Min sessions warning**
   - Count total sessions per sport across all 7 days
   - Compare against `SportRequirement.minWeeklySessions`
   - If any sport is under minimum, show warning:
     "You've only assigned 1 swim session. We recommend at least 2/week for your 70.3."
   - Style: warning card with amber background

### 5. State management

Add to block-setup.tsx local state:
```typescript
const [dayPreferences, setDayPreferences] = useState<DayPreference[][]>(
  () => Array.from({ length: 7 }, () => [])
);
const [addSheetVisible, setAddSheetVisible] = useState(false);
const [addSheetDay, setAddSheetDay] = useState(0);
```

Handlers:
```typescript
const handleAddPreference = (dayIndex: number) => {
  setAddSheetDay(dayIndex);
  setAddSheetVisible(true);
};

const handleConfirmPreference = (sport: string, workoutLabel?: string) => {
  setDayPreferences(prev => {
    const updated = [...prev];
    updated[dayIndex] = [...updated[dayIndex], { sport, workoutLabel }];
    return updated;
  });
  setAddSheetVisible(false);
};

const handleRemovePreference = (dayIndex: number, prefIndex: number) => {
  setDayPreferences(prev => {
    const updated = [...prev];
    updated[dayIndex] = updated[dayIndex].filter((_, i) => i !== prefIndex);
    return updated;
  });
};
```

### 6. Write tests

Test file: `apps/mobile/app/plan/__tests__/day-preferences.test.tsx`

- Required sports info card renders with correct text for triathlon race
- Day preference rows render for all 7 days
- Tapping "+" opens the add preference sheet
- Adding a preference shows chip on the correct day
- Removing a preference removes the chip
- Warning appears when swim count < minimum
- No warning when all minimums met
- Pre-populated from season dayConstraints

## Code Patterns

### Required sports info card
```tsx
const { seasonRaces } = useBlockPlanning();

const sportRequirements = useMemo(() => {
  if (!seasonRaces?.length) return [];
  const perRace = seasonRaces.map(r => getSportRequirements(r.distance));
  return mergeSportRequirements(perRace);
}, [seasonRaces]);

// Render
{sportRequirements.length > 0 && (
  <View style={styles.infoCard}>
    <Ionicons name="information-circle" size={20} color={Colors.info} />
    <ThemedText>
      Your race requires: {sportRequirements.map(r => r.label).join(', ')}
    </ThemedText>
  </View>
)}
```

### Min sessions warning
```typescript
const sessionWarnings = useMemo(() => {
  const warnings: string[] = [];
  for (const req of sportRequirements) {
    const count = dayPreferences.reduce(
      (sum, day) => sum + day.filter(p => p.sport === req.sport).length, 0
    );
    if (count < req.minWeeklySessions) {
      warnings.push(
        `You've only assigned ${count} ${req.sport} session${count !== 1 ? 's' : ''}. ` +
        `We recommend at least ${req.minWeeklySessions}/week.`
      );
    }
  }
  return warnings;
}, [dayPreferences, sportRequirements]);
```

## Accessibility
- Day preference rows: `accessibilityRole="button"` on add button
- Chips: `accessibilityRole="button"` with `accessibilityLabel="Remove [sport] on [day]"`
- Info/warning cards: `accessibilityRole="alert"`
- Bottom sheet: focus trap, close on backdrop tap

## Testing Requirements
- Info card renders race sport requirements
- 7 day rows render
- Add/remove preference flow works
- Warning shown when under minimum
- No warning when all met
- Pre-populated from season constraints
- Accessibility roles present

## Verification
- `pnpm test` passes
- `pnpm lint` passes
- `pnpm typecheck` passes
- Manual: can add/remove day preferences, see info card and warnings
