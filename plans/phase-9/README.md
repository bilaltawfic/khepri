# Phase 9: Season-Based Planning & Structured Workouts

> **Full design:** [docs/design/training-plan-redesign.md](../../docs/design/training-plan-redesign.md)
> **Sync architecture:** [docs/adr/001-intervals-icu-sync-architecture.md](../../docs/adr/001-intervals-icu-sync-architecture.md)

## Subphases

| ID | Name | Depends On | Can Parallelize With |
|----|------|------------|---------------------|
| **9A** | [Data Model](subphases/p9a-data-model.md) | — | — (must go first) |
| **9B** | [Onboarding Simplification](subphases/p9b-onboarding-simplification.md) | 9A | 9C, 9D, 9F |
| **9C** | [Season Setup Flow](subphases/p9c-season-setup-flow.md) | 9A | **9B, 9D, 9F** |
| **9D** | [Workout Generation](subphases/p9d-workout-generation.md) | 9A | **9B, 9C, 9F** |
| **9F** | [Sync Engine](subphases/p9f-sync-engine.md) | 9A | **9B, 9C, 9D** |
| **9E** | [Block Planning Flow](subphases/p9e-block-planning-flow.md) | 9C, 9D, 9F | — |
| **9G** | [Compliance Tracking](subphases/p9g-compliance-tracking.md) | 9E, 9F | **9H** |
| **9H** | [Coach Adaptations](subphases/p9h-coach-adaptations.md) | 9E, 9F | **9G** |
| **9I** | [Dashboard Redesign](subphases/p9i-dashboard-redesign.md) | 9G, 9H | — (must go last) |

## Dependency Graph

```
9A ──→ 9B
  │
  ├──→ 9C ──┐
  │         ├──→ 9E ──┐
  ├──→ 9D ──┘         ├──→ 9G ──┐
  │                    │         ├──→ 9I
  └──→ 9F ────────────┤         │
                       └──→ 9H ──┘
```

## Execution Waves

The subphases naturally group into 5 sequential waves, with parallelism within each wave:

### Wave 1: Foundation
- **9A** (Data Model) — solo, everything depends on it

### Wave 2: Four parallel workstreams
- **9B** (Onboarding Simplification) — mobile app changes
- **9C** (Season Setup Flow) — mobile app + edge function
- **9D** (Workout Generation) — core package + ai-client
- **9F** (Sync Engine) — edge functions

These four have no dependencies on each other. They all depend only on 9A. They touch different parts of the codebase:
- 9B: `apps/mobile/app/onboarding/`, `apps/mobile/contexts/`, `apps/mobile/services/`
- 9C: `apps/mobile/app/season/`, `supabase/functions/generate-season-skeleton/`
- 9D: `packages/core/src/utils/dsl-*`, `packages/core/src/templates/`, `packages/ai-client/`
- 9F: `supabase/functions/intervals-webhook/`, `supabase/functions/intervals-sync/`, `supabase/functions/_shared/`

**Minimal overlap risk.** Only shared files are barrel exports (`index.ts`), which are trivially mergeable.

### Wave 3: Block Planning (convergence point)
- **9E** (Block Planning Flow) — needs season setup (9C), workout generation (9D), and push module (9F)

### Wave 4: Two parallel workstreams
- **9G** (Compliance Tracking) — core utils + mobile components
- **9H** (Coach Adaptations) — edge functions + mobile components

These two have no dependencies on each other. They both depend on 9E and 9F.

### Wave 5: Dashboard
- **9I** (Dashboard Redesign) — needs compliance (9G) and adaptations (9H)

## Estimated Effort

| Wave | Subphases | Parallel? | Approx Tasks |
|------|-----------|-----------|-------------|
| 1 | 9A | Solo | 12 |
| 2 | 9B + 9C + 9D + 9F | 4 parallel | 7 + 5 + 8 + 5 = 25 |
| 3 | 9E | Solo | 5 |
| 4 | 9G + 9H | 2 parallel | 5 + 6 = 11 |
| 5 | 9I | Solo | 6 |
| **Total** | | | **59 tasks** |

Critical path (sequential): 9A → 9D → 9E → 9G → 9I (longest chain = 36 tasks)
With parallelism: 9A → (9B\|9C\|9D\|9F) → 9E → (9G\|9H) → 9I (reduces to ~28 sequential tasks)
