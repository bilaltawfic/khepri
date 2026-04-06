# P9E-R-01: Derive Required Sports + Min Sessions from Race Distance

## Goal
Create a pure utility function that maps a race distance to the sports it requires and a recommended minimum weekly session count for each. When a block targets multiple races, merge requirements by taking the max min-sessions per sport.

## Files to Create/Modify
- **Create:** `packages/core/src/utils/race-sport-requirements.ts`
- **Create:** `packages/core/src/utils/__tests__/race-sport-requirements.test.ts`
- **Modify:** `packages/core/src/index.ts` (add barrel export)

## Implementation Steps

1. **Create `race-sport-requirements.ts`**
   - Define `SportRequirement` interface: `{ sport: Sport; minWeeklySessions: number; label: string }`
   - Define the mapping table (race distance → required sports + min sessions):
     - Sprint Tri: swim 2, bike 2, run 2
     - Olympic Tri: swim 2, bike 3, run 3
     - Ironman 70.3: swim 2, bike 3, run 3
     - Ironman: swim 3, bike 4, run 3
     - T100: swim 2, bike 3, run 3
     - Aquathlon: swim 2, run 3
     - Duathlon: bike 3, run 3
     - 5K/10K: run 3
     - Half Marathon: run 4
     - Marathon/Ultra Marathon: run 5
     - Custom: empty array (no enforcement)
   - Implement `getSportRequirements(raceDistance: string): readonly SportRequirement[]`
   - Implement `mergeSportRequirements(requirements: readonly (readonly SportRequirement[])[]): readonly SportRequirement[]` — takes max min-sessions per sport across all inputs

2. **Add barrel export in `packages/core/src/index.ts`**
   - Export `getSportRequirements`, `mergeSportRequirements`, `SportRequirement`

3. **Write unit tests**
   - Each race distance returns expected sports and counts
   - Multiple races merge correctly (max per sport)
   - Custom returns empty array
   - Unknown distance returns empty array
   - Label format is correct (e.g. "Swim (min 2/week)")

## Code Patterns

```typescript
import type { Sport } from '../types/season.js';

export interface SportRequirement {
  readonly sport: Sport;
  readonly minWeeklySessions: number;
  readonly label: string;
}

const RACE_SPORT_MAP: Readonly<Record<string, readonly SportRequirement[]>> = {
  'Sprint Triathlon': [
    { sport: 'swim', minWeeklySessions: 2, label: 'Swim (min 2/week)' },
    { sport: 'bike', minWeeklySessions: 2, label: 'Bike (min 2/week)' },
    { sport: 'run', minWeeklySessions: 2, label: 'Run (min 2/week)' },
  ],
  // ... etc
};

export function getSportRequirements(raceDistance: string): readonly SportRequirement[] {
  return RACE_SPORT_MAP[raceDistance] ?? [];
}

export function mergeSportRequirements(
  requirements: readonly (readonly SportRequirement[])[],
): readonly SportRequirement[] {
  const merged = new Map<Sport, SportRequirement>();
  for (const reqs of requirements) {
    for (const req of reqs) {
      const existing = merged.get(req.sport);
      if (!existing || req.minWeeklySessions > existing.minWeeklySessions) {
        merged.set(req.sport, req);
      }
    }
  }
  return [...merged.values()];
}
```

## Testing Requirements
- `getSportRequirements('Sprint Triathlon')` → 3 sports, swim 2, bike 2, run 2
- `getSportRequirements('Ironman')` → swim 3, bike 4, run 3
- `getSportRequirements('5K')` → run 3
- `getSportRequirements('Custom')` → []
- `getSportRequirements('unknown')` → []
- `mergeSportRequirements` with [Sprint Tri, Ironman 70.3] → max per sport
- Labels match format "Sport (min N/week)"

## Verification
- `pnpm test` passes (new + existing tests)
- `pnpm lint` passes
- `pnpm typecheck` passes
- Function exported from `@khepri/core`
