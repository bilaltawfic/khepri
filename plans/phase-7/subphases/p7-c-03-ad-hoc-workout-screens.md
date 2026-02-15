# P7-C-03: Ad-Hoc Workout Screens

## Goal

Build mobile screens for browsing and viewing gym and travel workout templates. Users can filter by category/difficulty, view exercise details, and select workouts to follow during training sessions.

## Dependencies

- P7-C-01 (Gym workout templates) — **COMPLETE** (#108)
- P7-C-02 (Travel workout templates) — **REQUIRED** (must merge first)

**IMPORTANT:** This task requires P7-C-02 to be merged first so travel templates are available for import. Start only after P7-C-02 has landed on main.

## Files to Create

| File | Purpose |
|------|---------|
| `apps/mobile/hooks/useWorkoutTemplates.ts` | Hook to provide filtered workout templates |
| `apps/mobile/hooks/__tests__/useWorkoutTemplates.test.ts` | Hook unit tests |
| `apps/mobile/app/workouts/_layout.tsx` | Stack layout for workout screens |
| `apps/mobile/app/workouts/index.tsx` | Template list/browse screen |
| `apps/mobile/app/workouts/__tests__/index.test.tsx` | List screen tests |
| `apps/mobile/app/workouts/[id].tsx` | Template detail screen |
| `apps/mobile/app/workouts/__tests__/[id].test.tsx` | Detail screen tests |

## Files to Modify

| File | Change |
|------|--------|
| `apps/mobile/hooks/index.ts` | Add useWorkoutTemplates export |
| `apps/mobile/app/_layout.tsx` | Add workouts Stack.Screen entry |

## Implementation Steps

### 1. Create `useWorkoutTemplates` Hook

This hook provides template data with filtering. Templates are static data from `@khepri/core`, so no async fetching needed—just in-memory filtering.

```typescript
import { useMemo, useState } from 'react';
import {
  GYM_TEMPLATES,
  TRAVEL_TEMPLATES,
  type DifficultyLevel,
  type WorkoutCategory,
  type WorkoutTemplate,
} from '@khepri/core';

type TemplateSource = 'all' | 'gym' | 'travel';

export type UseWorkoutTemplatesReturn = {
  readonly templates: readonly WorkoutTemplate[];
  readonly source: TemplateSource;
  readonly setSource: (source: TemplateSource) => void;
  readonly category: WorkoutCategory | null;
  readonly setCategory: (category: WorkoutCategory | null) => void;
  readonly difficulty: DifficultyLevel | null;
  readonly setDifficulty: (difficulty: DifficultyLevel | null) => void;
  readonly getTemplateById: (id: string) => WorkoutTemplate | undefined;
};

export function useWorkoutTemplates(): UseWorkoutTemplatesReturn {
  const [source, setSource] = useState<TemplateSource>('all');
  const [category, setCategory] = useState<WorkoutCategory | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);

  const allTemplates = useMemo(() => {
    let base: readonly WorkoutTemplate[];
    switch (source) {
      case 'gym':
        base = GYM_TEMPLATES;
        break;
      case 'travel':
        base = TRAVEL_TEMPLATES;
        break;
      default:
        base = [...GYM_TEMPLATES, ...TRAVEL_TEMPLATES];
    }

    return base.filter((t) => {
      if (category != null && t.category !== category) return false;
      if (difficulty != null && t.difficulty !== difficulty) return false;
      return true;
    });
  }, [source, category, difficulty]);

  const getTemplateById = useMemo(() => {
    const combined = [...GYM_TEMPLATES, ...TRAVEL_TEMPLATES];
    return (id: string) => combined.find((t) => t.id === id);
  }, []);

  return {
    templates: allTemplates,
    source,
    setSource,
    category,
    setCategory,
    difficulty,
    setDifficulty,
    getTemplateById,
  };
}
```

### 2. Create `useWorkoutTemplates` Tests

Test filtering logic:
- Default returns all templates (gym + travel combined)
- Setting source to 'gym' returns only gym templates
- Setting source to 'travel' returns only travel templates
- Category filter narrows results
- Difficulty filter narrows results
- Combined filters work (source + category + difficulty)
- `getTemplateById` finds known templates, returns undefined for unknown
- Clearing filters (null) returns all

### 3. Create Workout Screens Layout

`apps/mobile/app/workouts/_layout.tsx` — Stack layout following `analysis/_layout.tsx` pattern:

```typescript
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

export default function WorkoutsLayout() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors[colorScheme].surface },
        headerTintColor: Colors[colorScheme].text,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Workouts' }} />
      <Stack.Screen name="[id]" options={{ title: 'Workout Detail' }} />
    </Stack>
  );
}
```

### 4. Create Template List Screen (`workouts/index.tsx`)

**UI Structure:**
- Header with filter chips: Source (All/Gym/Travel), Category, Difficulty
- ScrollView with template cards
- Each card shows: name, category badge, difficulty badge, duration, exercise count
- Tap card navigates to `workouts/[id]`
- Pull-to-refresh not needed (static data)
- Empty state if no templates match filters

**Filter Chips Pattern:**
- Row of pressable chips for source (All | Gym | Travel)
- Row for category (All | Strength | Mobility | Core | Plyometric)
- Row for difficulty (All | Beginner | Intermediate | Advanced)
- Active chip gets `tint` background color

**Card Pattern (following race-countdown):**
- ThemedView with shadow styling
- Name as title, description as subtitle
- Badge row: category (colored), difficulty, `~{duration}min`
- Exercise count: `{n} exercises`
- `accessibilityRole="button"` with label
- onPress → `router.push(\`/workouts/${template.id}\`)`

### 5. Create Template Detail Screen (`workouts/[id].tsx`)

**UI Structure:**
- Get `id` from `useLocalSearchParams()`
- Look up template via `getTemplateById(id)`
- Header: template name, description
- Meta row: category badge, difficulty badge, duration, estimated TSS
- Exercise list: numbered exercises with sets/reps/rest/notes/target muscles
- Error state if template not found

**Exercise Card Pattern:**
- Exercise number + name as header
- Sets x Reps display (handle both number and string reps like "45s")
- Rest: `{restSeconds}s rest`
- Notes in italics
- Target muscle tags as small badges

### 6. Update Navigation

**`apps/mobile/hooks/index.ts`** — Add export:
```typescript
export { useWorkoutTemplates, type UseWorkoutTemplatesReturn } from './useWorkoutTemplates';
```

**`apps/mobile/app/_layout.tsx`** — Add screen entry:
```typescript
<Stack.Screen name="workouts" options={{ headerShown: false }} />
```

### 7. Navigation Entry Point

The workout screens are accessed via navigation from elsewhere (dashboard quick actions, or analysis screens). Add a link from the dashboard or plan tab to `/workouts`. This can be a simple `router.push('/workouts')` from a button on the dashboard.

**Consider adding to the dashboard screen:**
- A "Workouts" quick-action card or button that navigates to `/workouts`
- This is a small addition to `apps/mobile/app/(tabs)/index.tsx`

## Code Patterns to Follow

- `ScreenContainer` wrapper for all screens
- `ScrollView` with content
- `ThemedView` and `ThemedText` for themed components
- `useColorScheme()` for theme-aware colors
- `Colors[colorScheme].xxx` for color values
- `StyleSheet.create()` for styles
- `accessibilityRole` and `accessibilityLabel` on interactive elements
- `Ionicons` for icons (barbell, fitness, body, etc.)
- Shadow: `shadowColor: '#000'`, `shadowOpacity: 0.04`, `shadowRadius: 4`, `elevation: 1`
- Loading/error/empty states

## Testing Requirements

### Hook Tests
- All filter combinations
- getTemplateById positive/negative
- Source switching
- Combined filters

### Screen Tests
- List screen renders templates
- Filter chips change displayed templates
- Empty state when no matches
- Detail screen renders exercise list
- Detail screen handles invalid ID gracefully
- Accessibility properties present

### Commands
- `pnpm test` — all tests pass
- `pnpm lint` — no lint errors
- `pnpm build` — builds cleanly
- `pnpm typecheck` — no type errors

## Verification Checklist

- [ ] `useWorkoutTemplates` hook with source/category/difficulty filters
- [ ] Hook tests cover all filter combinations
- [ ] `workouts/_layout.tsx` with Stack navigation
- [ ] `workouts/index.tsx` list screen with filter chips and template cards
- [ ] `workouts/[id].tsx` detail screen with exercise breakdown
- [ ] Screen tests for rendering and interaction
- [ ] Navigation wired in `_layout.tsx` (root)
- [ ] Hook exported from `hooks/index.ts`
- [ ] Accessibility attributes on all interactive elements
- [ ] `pnpm test && pnpm lint && pnpm build && pnpm typecheck` all pass
- [ ] Conversation log created in `claude-convos/2026-02-15/`
