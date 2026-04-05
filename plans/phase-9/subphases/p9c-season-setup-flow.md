# P9C: Season Setup Flow

## Goal

Build the guided multi-step season setup flow accessible from the dashboard CTA. Athletes create their annual season by adding races, setting goals, configuring preferences, and reviewing an AI-generated season skeleton.

**Design doc:** [docs/design/training-plan-redesign.md](../../../docs/design/training-plan-redesign.md) — Section 6
**Wave:** 2 (parallel with 9B, 9D, 9F)
**Depends on:** 9A
**Blocks:** 9E

## Context

After onboarding, the dashboard shows a "Set Up Season" CTA. This flow creates the `season` record and populates it with goals, preferences, and a high-level phase skeleton. The skeleton shows how the full year will be structured around races before any detailed workouts are generated.

### Flow
1. **Race Calendar** — Add A/B/C races (or import from Intervals.icu)
2. **Other Goals** — Performance, fitness, health goals
3. **Preferences** — Weekly hours, training days, sport priority, day constraints
4. **Season Overview** — AI generates skeleton, athlete reviews and approves

## Dependencies

- **P9-A** (data model) — seasons, goals with season_id
- **P9-B-07** (dashboard CTA) — entry point to this flow

## Tasks

| ID | Task | Status |
|----|------|--------|
| P9-C-01 | Create season setup screen: race calendar | ⬜ |
| P9-C-02 | Create season setup screen: other goals | ⬜ |
| P9-C-03 | Create season setup screen: preferences | ⬜ |
| P9-C-04 | Season skeleton generation (AI) | ⬜ |
| P9-C-05 | Create season overview screen | ⬜ |

## Files to Create

| File | Purpose |
|------|---------|
| `apps/mobile/app/season/_layout.tsx` | Stack navigator for season setup flow |
| `apps/mobile/app/season/races.tsx` | Step 1: Race calendar (add/remove/import) |
| `apps/mobile/app/season/goals.tsx` | Step 2: Other goals (performance/fitness/health) |
| `apps/mobile/app/season/preferences.tsx` | Step 3: Training preferences |
| `apps/mobile/app/season/overview.tsx` | Step 4: AI-generated skeleton review |
| `apps/mobile/contexts/SeasonSetupContext.tsx` | State management for the multi-step flow |
| `supabase/functions/generate-season-skeleton/index.ts` | Edge Function: AI skeleton generation |

## Implementation Details

### SeasonSetupContext

Manages state across the 4-step flow:

```typescript
interface SeasonSetupData {
  // Step 1: Races
  races: SeasonRace[];

  // Step 2: Goals
  goals: SeasonGoalInput[];

  // Step 3: Preferences
  preferences: SeasonPreferences;

  // Step 4: Generated skeleton (from AI)
  skeleton?: SeasonSkeleton;
}

interface SeasonRace {
  name: string;
  date: string;           // YYYY-MM-DD
  distance: string;       // e.g., "70.3", "Marathon", "Olympic", "Sprint"
  priority: 'A' | 'B' | 'C';
  location?: string;
  target_time_seconds?: number;
}
```

### Step 1: Race Calendar Screen

- List of races with add/edit/remove
- "Import from Intervals.icu" button (if connected) — reuse existing `fetchEvents` from intervals service, filter for race types
- Each race: name, date picker, distance selector, priority (A/B/C)
- Validates at least one race OR allows "No races — standalone training" path
- Race distance options: Sprint Tri, Olympic Tri, 70.3, Ironman, 5K, 10K, Half Marathon, Marathon, Ultra, Custom

### Step 2: Other Goals Screen

- Optional step — can skip
- Goal types: performance, fitness, health
- Each goal: type selector, title, target date (optional)
- Examples shown as placeholders: "FTP from 190W to 220W", "Stay injury-free"

### Step 3: Preferences Screen

```
Weekly hours:  [min] - [max]  (sliders or number inputs)

Training days:
[x] Mon [x] Tue [x] Wed [x] Thu [ ] Fri [x] Sat [x] Sun

Sport priority (drag to reorder):
1. Run
2. Bike
3. Swim

Day constraints (optional):
+ Add constraint
  Sport: [Swim]  Days: [Mon, Wed]  Type: [Preferred / Only]
```

**Coach validation:** If weekly hours are below minimum for the hardest race:
- Show warning inline: "10h/week is below the recommended 12h minimum for Ironman 70.3"
- Don't block — let athlete proceed with acknowledgment

Hour validation thresholds:

| Race Type | Min Hours |
|-----------|-----------|
| Sprint Tri | 4 |
| Olympic Tri | 6 |
| 70.3 | 8 |
| Ironman | 12 |
| Marathon | 5 |
| Half Marathon | 4 |

### Step 4: Season Overview (AI-Generated)

**Generate skeleton via Edge Function:**

Input:
- Races (dates, distances, priorities)
- Preferences (hours, days, sport priority)
- Current date (for determining how far into the year we are)
- Performance goals (targets to train toward)

Output: `SeasonSkeleton` with phases covering the full year

```typescript
interface SeasonSkeleton {
  total_weeks: number;
  phases: SeasonPhase[];
  feasibility_notes: string[];    // Warnings, suggestions
}

interface SeasonPhase {
  name: string;                    // e.g., "Base 1", "70.3 #1 Build", "Recovery"
  start_date: string;
  end_date: string;
  weeks: number;
  type: 'base' | 'build' | 'peak' | 'taper' | 'recovery' | 'race_week' | 'off_season';
  race_id?: string;                // Links to a race if this phase serves one
  target_hours_per_week: number;
  focus: string;
}
```

**Display:** Timeline visualization showing phases color-coded by type, with race markers. Warning banners for feasibility issues.

**On approve:** Create the season record, create goals with `season_id`, save preferences. Navigate to "Plan First Block" (P9-E entry point) or back to dashboard.

### Edge Function: generate-season-skeleton

Uses Claude API to generate the skeleton:

**System prompt context:**
- Training periodization principles
- Race-specific preparation timelines
- Recovery requirements between races
- Volume progression guidelines

**Input:** Races, preferences, current fitness data (if available from Intervals.icu)

**Output:** Structured JSON (SeasonSkeleton) — constrained via tool_use or JSON mode

**Validation:**
- All weeks covered (no gaps)
- Taper before every A-race (minimum 1 week)
- Recovery after every race
- Weekly hours within athlete's budget
- Total phases sum to total weeks

## Testing Requirements

### Unit Tests
- SEASON-01: Create season with default end date (Dec 31)
- SEASON-03: Add race goals to season
- SEASON-04: Add performance/fitness/health goals
- SEASON-05: Season preferences save and load correctly
- SEASON-06: Season skeleton generation produces valid phases
- SEASON-07: Coach validates weekly hours against race targets

### Component Tests
- Race calendar: add, remove, import races
- Preferences: hours slider, day toggles, sport reorder
- Overview: skeleton timeline renders, warnings display
- Navigation: back/forward through steps preserves state

### Integration Tests
- Full flow: races → goals → preferences → generate → approve → season created in DB
- Import races from Intervals.icu (mock API)
- Skeleton generation returns valid JSON (mock Claude API)

## Verification Checklist

- [ ] Dashboard CTA navigates to race calendar
- [ ] Can add/remove races with dates and priorities
- [ ] Import from Intervals.icu works (if connected)
- [ ] Preferences screen saves hours, days, sport priority, constraints
- [ ] Hour validation warns below minimum for race type
- [ ] Skeleton generation returns valid phase timeline
- [ ] Overview screen shows timeline with race markers
- [ ] Approving creates season + goals in database
- [ ] `pnpm test` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
