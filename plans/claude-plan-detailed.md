# Khepri: Detailed Task Breakdown

This file contains granular, 1-2 hour tasks for building Khepri. Each task produces a small, focused PR.

**Task Format:** `P{phase}-{workstream}-{number}` (e.g., P2-A-01)

**Legend:**
- ✅ Complete
- 🔄 In Progress
- ⬜ Not Started
- 🧪 = Tests required

---

## Current Status

**Phase 0:** ✅ Complete
**Phase 1:** ✅ Complete (Workstreams A, B & C)
**Phase 2:** ✅ Complete (Workstreams A, B, C & D)
**Phase 3:** ✅ Complete (Workstreams A & B)
**Phase 4:** ✅ Complete (Workstreams A & B)
**Phase 5:** ✅ Complete (Workstreams A, B & C - RAG fully integrated)
**Phase 6:** ✅ Complete (Launch-Critical Features - Training Plan Generation & Calendar Push)
**Phase 7:** ✅ Complete (Post-Launch Enhancements)
**Phase 7.5:** 🔄 In Progress (Manual Testing & Bug Fixes — AUTH, OB testing complete; fitness-sync, connect UX, dashboard week overview, onboarding events all shipped)
**Phase 8:** ⬜ Not Started (Polish & Launch - E2E Testing, Docs, Release)
**Phase 9:** ⬜ Not Started (Season-Based Planning & Structured Workouts — 9 sub-phases, 60+ tasks)

> Phase 1 and 2 detailed plans have been archived (all complete).

---

## Phase 1: Foundation (Complete)

### Workstream A: Core Package Setup

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P1-A-01 | Create core package structure with tsconfig | `packages/core/package.json`, `packages/core/tsconfig.json`, `packages/core/src/index.ts` | 🧪 Build passes | - | ✅ (#21) |
| P1-A-02 | Extract shared types from mobile app | `packages/core/src/types/wellness.ts`, `packages/core/src/types/time.ts`, `packages/core/src/types/constraints.ts` | 🧪 Type exports work | P1-A-01 | ✅ (#26) |
| P1-A-03 | Add utility functions (date formatting, validation) | `packages/core/src/utils/formatters.ts`, `packages/core/src/utils/validators.ts` | 🧪 Unit tests for each util | P1-A-01 | ✅ (#28) |
| P1-A-04 | Update mobile app to import from @khepri/core | `apps/mobile/` imports | 🧪 Existing tests pass | P1-A-02 | ✅ (#29) |

### Workstream B: Supabase Client Package

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P1-B-01 | Create supabase-client package structure | `packages/supabase-client/package.json`, `packages/supabase-client/tsconfig.json` | 🧪 Build passes | - | ✅ |
| P1-B-02 | Add Supabase client initialization | `packages/supabase-client/src/client.ts` | 🧪 Client creates successfully | P1-B-01 | ✅ |
| P1-B-03 | Add athlete profile queries | `packages/supabase-client/src/queries/athlete.ts` | 🧪 Mock tests for CRUD | P1-B-02 | ✅ |
| P1-B-04 | Add daily check-in queries | `packages/supabase-client/src/queries/checkins.ts` | 🧪 Mock tests for CRUD | P1-B-02 | ✅ |
| P1-B-05 | Add goals and constraints queries | `packages/supabase-client/src/queries/goals.ts`, `packages/supabase-client/src/queries/constraints.ts` | 🧪 Mock tests for CRUD | P1-B-02 | ✅ |

### Workstream C: Auth Foundation

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P1-C-01 | Add auth context provider to mobile app | `apps/mobile/contexts/AuthContext.tsx` | 🧪 Context renders, provides state | - | ✅ (#22) |
| P1-C-02 | Create login screen UI | `apps/mobile/app/auth/login.tsx` | 🧪 Screen renders, inputs work | P1-C-01 | ✅ (#23) |
| P1-C-03 | Create signup screen UI | `apps/mobile/app/auth/signup.tsx` | 🧪 Screen renders, validation | P1-C-02 | ✅ (#24) |
| P1-C-04 | Wire auth screens to Supabase auth | `apps/mobile/services/auth.ts` | 🧪 Mock auth flow tests | P1-B-02, P1-C-03 | ✅ (#25) |
| P1-C-05 | Add protected route wrapper | `apps/mobile/components/ProtectedRoute.tsx` | 🧪 Redirects unauthenticated users | P1-C-04 | ✅ (#27) |

---

## Phase 2: Core Coaching (Remaining Tasks)

> **Detailed workstream plans:** See [plans/phase-2/](phase-2/) for comprehensive task breakdowns with code patterns and dependencies.

### Workstream A: Complete Onboarding Flow

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P2-A-01 | Enable Intervals.icu connect screen inputs | `apps/mobile/app/onboarding/connect.tsx` | 🧪 Screen renders, skip works | - | ✅ (#33) |
| P2-A-02 | Create onboarding context for multi-step data | `apps/mobile/contexts/OnboardingContext.tsx` | 🧪 Context provides state | - | ✅ (#36) |
| P2-A-03 | Wire fitness numbers screen to context | `apps/mobile/app/onboarding/fitness.tsx` | 🧪 Inputs validate, save to context | P2-A-02 | ✅ (#48) |
| P2-A-04 | Wire goals screen to context | `apps/mobile/app/onboarding/goals.tsx` | 🧪 Can add/remove goals | P2-A-02 | ✅ (#39) |
| P2-A-05 | Wire final step to save data to Supabase | `apps/mobile/app/onboarding/plan.tsx` | 🧪 Data persists | P2-A-03, P2-A-04 | ✅ (#53) |

### Workstream B: Profile Management

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P2-B-01 | Wire personal info screen to Supabase | `apps/mobile/app/profile/personal-info.tsx` | 🧪 Form saves, validates | P1-B-03 | ✅ (#37) |
| P2-B-02 | Wire fitness numbers screen to Supabase | `apps/mobile/app/profile/fitness-numbers.tsx` | 🧪 Form saves, optional fields | P1-B-03 | ✅ (#40) |
| P2-B-03 | Wire goals management to Supabase | `apps/mobile/app/profile/goals.tsx` | 🧪 CRUD operations work | P1-B-05 | ✅ (#45) |
| P2-B-04 | Wire constraints management to Supabase | `apps/mobile/app/profile/constraints.tsx` | 🧪 Can add/edit/remove | P1-B-05 | ✅ (#44) |

### Workstream C: Real Claude Integration

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P2-C-01 | Create conversations schema migration | `supabase/migrations/` | 🧪 Migration runs | - | ✅ (#34) |
| P2-C-02 | Add conversations queries to supabase-client | `packages/supabase-client/src/queries/conversations.ts` | 🧪 CRUD operations | P2-C-01 | ✅ (#38) |
| P2-C-03 | Create ai-coach Edge Function | `supabase/functions/ai-coach/` | 🧪 Function deploys | - | ✅ (#35) |
| P2-C-04 | Wire useCheckin to call real AI | `apps/mobile/services/ai.ts`, `apps/mobile/hooks/useCheckin.ts` | 🧪 Mock API calls | P2-C-03 | ✅ (#43) |
| P2-C-05 | Enable chat with conversation persistence | `apps/mobile/hooks/useConversation.ts` | 🧪 History loads on mount | P2-C-02, P2-C-03 | ✅ (#41, #43) |

### Workstream D: Dashboard Real Data

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P2-D-01 | Create useDashboard hook + wire dashboard | `apps/mobile/hooks/useDashboard.ts`, `apps/mobile/app/(tabs)/index.tsx` | 🧪 Data loads, UI displays | P1-B-03 | ✅ (#47) |
| P2-D-02 | Display today's workout card | (Included in P2-D-01) | 🧪 Card shows recommendation or check-in prompt | P2-D-01 | ✅ (#47) |
| P2-D-03 | Display upcoming events and metrics | (Included in P2-D-01) | 🧪 Events display, metrics show | P2-D-01 | ✅ (#47) |

---

## Phase 3: Intervals.icu Integration

### Workstream A: MCP Gateway

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P3-A-01 | Create MCP gateway Edge Function scaffold | `supabase/functions/mcp-gateway/index.ts` | 🧪 Function deploys | - | ✅ (#55) |
| P3-A-02 | Add get_activities tool handler | MCP gateway | 🧪 Returns mock data | P3-A-01 | ✅ (#61) |
| P3-A-03 | Add get_wellness_data tool handler | MCP gateway | 🧪 Returns mock data | P3-A-01 | ✅ (#60) |
| P3-A-04 | Add get_events tool handler | MCP gateway | 🧪 Returns mock data | P3-A-01 | ✅ (#64) |
| P3-A-05 | Wire to real Intervals.icu API | MCP gateway | 🧪 Integration test | P3-A-02 | ✅ (#65) |

### Workstream B: Data Sync

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P3-B-01 | Create Intervals.icu connection settings UI | `apps/mobile/app/profile/intervals.tsx` | 🧪 Form validates | - | ✅ (#56) |
| P3-B-02 | Store encrypted API credentials | Supabase + mobile | 🧪 Credentials encrypt/decrypt | P3-B-01 | ✅ (#62) |
| P3-B-03 | Fetch and display recent activities | Dashboard | 🧪 Activities show | P3-A-05, P3-B-02 | ✅ (#71) |
| P3-B-04 | Sync wellness data to daily check-in | Check-in flow | 🧪 Pre-populates data | P3-A-03, P3-B-02 | ✅ (#66) |

---

## Phase 4: AI Orchestration

### Workstream A: Edge Functions

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P4-A-01 | Create ai-orchestrator Edge Function | `supabase/functions/ai-orchestrator/index.ts` | 🧪 Function deploys | - | ✅ (#69) |
| P4-A-02 | Add tool execution pipeline | AI orchestrator | 🧪 Tools execute | P4-A-01, P3-A-01 | ✅ (#69) |
| P4-A-03 | Add streaming response support | AI orchestrator | 🧪 Streams to client | P4-A-01 | ✅ (#76) |
| P4-A-04 | Integrate with context builder | AI orchestrator | 🧪 Context assembles | P4-A-01 | ✅ (#80) |
| P4-A-05 | Consume streaming responses in mobile app | `apps/mobile/services/ai.ts`, `apps/mobile/hooks/useConversation.ts` | 🧪 Progressive message display | P4-A-03 | ✅ (#93) |

### Workstream B: Safety & Validation

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P4-B-01 | Implement training load validation | `packages/ai-client/src/tools/safety-tools.ts` | 🧪 Flags overtraining | - | ✅ (#70) |
| P4-B-02 | Add injury awareness to recommendations | AI prompts | 🧪 Respects constraints | P4-B-01 | ✅ (#75) |
| P4-B-03 | Implement workout modification safety checks | Safety tools | 🧪 Prevents dangerous changes | P4-B-01 | ✅ (#81) |

---

## Phase 5: Knowledge Integration (RAG)

### Workstream A: Vector Database

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P5-A-01 | Add pgvector extension migration | `supabase/migrations/004_pgvector.sql` | 🧪 Migration runs | - | ✅ (#74) |
| P5-A-02 | Create embeddings table schema | `supabase/migrations/005_embeddings.sql` | 🧪 Table creates | P5-A-01 | ✅ (#74) |
| P5-A-03 | Add embedding generation function | Edge Function | 🧪 Generates embeddings | P5-A-02 | ✅ (#79) |
| P5-A-04 | Add semantic search function | Edge Function | 🧪 Returns relevant docs | P5-A-03 | ✅ (#83) |

### Workstream B: Knowledge Content

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P5-B-01 | Create exercise science doc structure | `docs/knowledge/` | - | - | ✅ (#84) |
| P5-B-02 | Add training load management content | Knowledge docs | - | P5-B-01 | ✅ (#84) |
| P5-B-03 | Add recovery protocols content | Knowledge docs | - | P5-B-01 | ✅ (#84) |
| P5-B-04 | Seed knowledge base with embeddings | Seed script | 🧪 Content searchable | P5-A-03, P5-B-02 | ✅ (#87) |

### Workstream C: RAG Integration

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P5-C-01 | Wire RAG search into AI orchestrator | AI orchestrator | 🧪 Knowledge retrieval in responses | P5-B-04 | ✅ (#92) |
| P5-C-02 | Add knowledge search MCP tool | MCP gateway | 🧪 Tool returns relevant chunks | P5-A-04 | ✅ (#92) |

---

## Phase 6: Launch-Critical Features

> Core features required for a fully functional training coach app. These enable the app to generate structured training plans and push workouts to Intervals.icu for execution.

### Workstream A: Calendar & Workout Push

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P6-A-01 | Add create/update event MCP tools | `supabase/functions/mcp-gateway/tools/create-event.ts`, `update-event.ts` | 🧪 API integration tests | P3-A-05 | ✅ (#97) |
| P6-A-02 | Wire calendar tools into ai-orchestrator | AI orchestrator | 🧪 Tool execution tests | P6-A-01 | ✅ (#100) |
| P6-A-03 | Build calendar screen in mobile app | `apps/mobile/app/(tabs)/calendar.tsx` | 🧪 Screen renders, events display | P6-A-02 | ✅ (#103) |

### Workstream B: Training Plan Generation

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P6-B-01 | Create training_plans schema migration | `supabase/migrations/` | 🧪 Migration runs | - | ✅ (#95) |
| P6-B-02 | Add training plan queries to supabase-client | `packages/supabase-client/src/queries/training-plans.ts` | 🧪 CRUD operations | P6-B-01 | ✅ (#101) |
| P6-B-03 | Add periodization logic to core package | `packages/core/src/utils/periodization.ts` | 🧪 Plan generation accuracy | - | ✅ (#96) |
| P6-B-04 | Build plan generation Edge Function | `supabase/functions/generate-plan/` | 🧪 Generates valid plans | P6-B-02, P6-B-03 | ✅ (#102) |
| P6-B-05 | Wire plan generation into AI orchestrator | AI orchestrator | 🧪 AI can generate/modify plans | P6-B-04 | ✅ (#106) |
| P6-B-06 | Build training plan screen in mobile app | `apps/mobile/app/(tabs)/plan.tsx` | 🧪 Screen displays plan, allows edits | P6-B-02 | ✅ (#104) |

---

## Phase 7: Post-Launch Enhancements

> Nice-to-have features that improve UX and provide additional insights. These can be added after launch based on user feedback.

### Workstream A: Notifications & History

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P7-A-01 | Add expo-notifications package | Mobile app | 🧪 Package installs | - | ✅ (#111) |
| P7-A-02 | Build push notification service | `apps/mobile/services/notifications.ts` | 🧪 Notifications send | P7-A-01 | ✅ (#111) |
| P7-A-03 | Add daily check-in reminders | Mobile app | 🧪 Reminder fires at set time | P7-A-02 | ✅ (#111) |
| P7-A-04 | Build conversation history screen | `apps/mobile/app/chat/history.tsx` | 🧪 List renders, navigation works | P2-C-02 | ✅ (#107) |

### Workstream B: Analysis & Insights

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P7-B-01 | Add training analysis utility functions | `packages/core/src/utils/analysis.ts` | 🧪 Calculation accuracy | P3-A-05 | ✅ (#105) |
| P7-B-02 | Build race countdown screen | `apps/mobile/app/analysis/race-countdown.tsx` | 🧪 Screen renders, countdown displays | P7-B-01 | ✅ (#109) |
| P7-B-03 | Build training block review screen | `apps/mobile/app/analysis/training-review.tsx` | 🧪 CTL/ATL/TSB trends display | P7-B-01 | ✅ (#110) |

### Workstream C: Alternative Workouts

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P7-C-01 | Add gym workout templates | `packages/core/src/templates/gym.ts` | 🧪 Templates valid | - | ✅ (#108) |
| P7-C-02 | Add travel workout templates | `packages/core/src/templates/travel.ts` | 🧪 Templates valid | - | ✅ (#113) |
| P7-C-03 | Build ad-hoc workout screens | `apps/mobile/app/workouts/` | 🧪 Screens render, input works | P7-C-01, P7-C-02 | ✅ (#114) |

---

## Phase 7.5: Manual Testing & Bug Fixes

> Systematic manual testing of all features using `docs/testing/manual-test-cases.csv`. Each category is tested with the user, failures are fixed immediately.
>
> **Skill:** `/test-engineer <CATEGORY>` — Prompts user with test cases, fixes failures, creates fix PR.

### Completed Feature Work (discovered during testing)

| Feature | PRs | Description |
|---------|-----|-------------|
| Auth fixes | #122 | Fix AUTH manual test failures |
| Credential validation | #123 | Validate Intervals.icu credentials before saving |
| Connect screen UX | #124 | Connect screen UX improvements (explainer, loading/error/success states) |
| Fitness auto-sync | #125 | Auto-sync fitness numbers from Intervals.icu, fix 3 silently discarded fields |
| Onboarding bug fixes | #126 | Fix OB-06 through OB-18 manual test failures |
| Dashboard week overview | #127 | "This Week" training plan card on dashboard |
| Onboarding events | #128 | New onboarding step for adding races/events |

### Group 1: Foundation

| ID | Category | Test Cases | Description | Status |
|----|----------|------------|-------------|--------|
| P7.5-01 | AUTH | 11 | Authentication: signup, login, session, protected routes | ✅ (#122) |
| P7.5-02 | OB | 18 | Onboarding: welcome, Intervals.icu connect, fitness, goals, plan | ✅ (#126) |

### Group 2: Core Daily Workflow

| ID | Category | Test Cases | Description | Status |
|----|----------|------------|-------------|--------|
| P7.5-03 | DASH | 9 | Dashboard: cards, training load, activities, events, refresh | ⬜ |
| P7.5-04 | CI | 11 | Daily check-in: form, AI recommendation, history, prefill | ⬜ |

### Group 3: Training Features

| ID | Category | Test Cases | Description | Status |
|----|----------|------------|-------------|--------|
| P7.5-05 | CAL | 7 | Calendar: events, navigation, empty state, refresh | ⬜ |
| P7.5-06 | PLAN | 8 | Training plan: view, phases, volume, pause/cancel | ⬜ |

### Group 4: Analysis & Insights

| ID | Category | Test Cases | Description | Status |
|----|----------|------------|-------------|--------|
| P7.5-07 | RACE | 5 | Race countdown: predictions, readiness, empty state | ⬜ |
| P7.5-08 | TREV | 7 | Training review: form status, metrics, recovery, trends | ⬜ |

### Group 5: AI & Chat

| ID | Category | Test Cases | Description | Status |
|----|----------|------------|-------------|--------|
| P7.5-09 | CHIST | 5 | Chat history: list, resume, archive, empty state | ⬜ |
| P7.5-10 | CHAT | 12 | AI coach: welcome, prompts, conversations, error handling | ⬜ |

### Group 6: Profile & Settings

| ID | Category | Test Cases | Description | Status |
|----|----------|------------|-------------|--------|
| P7.5-11 | PROF | 19 | Profile: personal info, fitness numbers, goals, constraints | ⬜ |

### Group 7: Integrations & Templates

| ID | Category | Test Cases | Description | Status |
|----|----------|------------|-------------|--------|
| P7.5-12 | WKT | 11 | Workout templates: browse, filter, detail, accessibility | ⬜ |
| P7.5-13 | INT | 6 | Intervals.icu: connect, disconnect, validation, data flow | ⬜ |

### Group 8: Safety & Security

| ID | Category | Test Cases | Description | Status |
|----|----------|------------|-------------|--------|
| P7.5-14 | SAFETY | 7 | AI safety: overtraining, injury-aware, sleep, stress | ⬜ |
| P7.5-15 | DATA | 6 | Data isolation: RLS, cross-user data visibility | ⬜ |

### Group 9: Advanced Features

| ID | Category | Test Cases | Description | Status |
|----|----------|------------|-------------|--------|
| P7.5-16 | RAG | 4 | Knowledge base: RAG-grounded responses, accuracy | ⬜ |
| P7.5-17 | NOTIF | 7 | Push notifications: permissions, reminders, channels | ⬜ |

### Group 10: Quality & Polish

| ID | Category | Test Cases | Description | Status |
|----|----------|------------|-------------|--------|
| P7.5-18 | UX | 12 | User experience: keyboard, loading, errors, navigation, dark mode | ⬜ |
| P7.5-19 | PERF | 6 | Performance: load times, response times, rendering | ⬜ |

### Group 11: Full Journey

| ID | Category | Test Cases | Description | Status |
|----|----------|------------|-------------|--------|
| P7.5-20 | E2E | 9 | End-to-end: full user journeys, lifecycle tests | ⬜ |

---

## Phase 9: Season-Based Planning & Structured Workouts

> **Full design:** [docs/design/training-plan-redesign.md](../docs/design/training-plan-redesign.md)
> **Sync architecture ADR:** [docs/adr/001-intervals-icu-sync-architecture.md](../docs/adr/001-intervals-icu-sync-architecture.md)
>
> Replaces the generic periodization skeleton with season-based planning, structured daily workouts (Intervals.icu DSL), bidirectional sync, compliance tracking, and AI coach adaptations.

### Sub-Phase 9A: Data Model

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P9-A-01 | Create seasons table migration | `supabase/migrations/` | 🧪 Migration runs, one-active constraint works | - | ⬜ |
| P9-A-02 | Create race_blocks table migration | `supabase/migrations/` | 🧪 Migration runs, lifecycle status transitions valid | P9-A-01 | ⬜ |
| P9-A-03 | Create workouts table migration | `supabase/migrations/` | 🧪 Migration runs, sync_status + external_id constraints | P9-A-02 | ⬜ |
| P9-A-04 | Create plan_adaptations table migration | `supabase/migrations/` | 🧪 Migration runs, JSONB snapshots store/retrieve | P9-A-03 | ⬜ |
| P9-A-05 | Create sync_log table migration | `supabase/migrations/` | 🧪 Migration runs | P9-A-01 | ⬜ |
| P9-A-06 | Add season_id FK to goals table | `supabase/migrations/` | 🧪 Migration runs, existing goals handled | P9-A-01 | ⬜ |
| P9-A-07 | Add Intervals.icu sync columns to athletes | `supabase/migrations/` | 🧪 last_synced_at columns added | - | ⬜ |
| P9-A-08 | Add seasons queries to supabase-client | `packages/supabase-client/src/queries/seasons.ts` | 🧪 CRUD + one-active enforcement | P9-A-01 | ⬜ |
| P9-A-09 | Add race_blocks queries to supabase-client | `packages/supabase-client/src/queries/race-blocks.ts` | 🧪 CRUD + lifecycle transitions | P9-A-02 | ⬜ |
| P9-A-10 | Add workouts queries to supabase-client | `packages/supabase-client/src/queries/workouts.ts` | 🧪 CRUD + compliance updates + bulk insert | P9-A-03 | ⬜ |
| P9-A-11 | Add plan_adaptations queries to supabase-client | `packages/supabase-client/src/queries/plan-adaptations.ts` | 🧪 CRUD + rollback support | P9-A-04 | ⬜ |
| P9-A-12 | Add Season, RaceBlock, Workout, Adaptation types to core | `packages/core/src/types/` | 🧪 Types compile, type guards work | - | ⬜ |

### Sub-Phase 9B: Onboarding Simplification

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P9-B-01 | Remove goals step from onboarding | `apps/mobile/app/onboarding/goals.tsx` | 🧪 OB-NEW-02: no goals step | P9-A-01 | ⬜ |
| P9-B-02 | Remove events step from onboarding | `apps/mobile/app/onboarding/events.tsx` | 🧪 OB-NEW-03: no events step | P9-A-01 | ⬜ |
| P9-B-03 | Remove plan step from onboarding | `apps/mobile/app/onboarding/plan.tsx` | 🧪 OB-NEW-04: no plan step | P9-A-01 | ⬜ |
| P9-B-04 | Persist Intervals.icu credentials during onboarding | `apps/mobile/app/onboarding/connect.tsx`, `services/onboarding.ts` | 🧪 OB-NEW-05: credentials saved to DB | - | ⬜ |
| P9-B-05 | Update onboarding context (remove goals, events, planDuration) | `apps/mobile/contexts/OnboardingContext.tsx` | 🧪 Context has 3 steps only | P9-B-01, P9-B-02, P9-B-03 | ⬜ |
| P9-B-06 | Update onboarding save service | `apps/mobile/services/onboarding.ts` | 🧪 Only saves fitness numbers + Intervals credentials | P9-B-05 | ⬜ |
| P9-B-07 | Add season setup CTA to dashboard | `apps/mobile/app/(tabs)/index.tsx` | 🧪 DASH-NEW-01: CTA shows when no season | P9-A-08 | ⬜ |

### Sub-Phase 9C: Season Setup Flow

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P9-C-01 | Create season setup screen: race calendar | `apps/mobile/app/season/races.tsx` | 🧪 Add/remove/import races | P9-A-08 | ⬜ |
| P9-C-02 | Create season setup screen: other goals | `apps/mobile/app/season/goals.tsx` | 🧪 Add performance/fitness/health goals | P9-A-06 | ⬜ |
| P9-C-03 | Create season setup screen: preferences | `apps/mobile/app/season/preferences.tsx` | 🧪 Hours, days, sport priority, constraints saved | P9-A-08 | ⬜ |
| P9-C-04 | Season skeleton generation (AI) | `supabase/functions/generate-season-skeleton/` | 🧪 SEASON-06: valid phases generated, SEASON-07: hours validated | P9-A-08 | ⬜ |
| P9-C-05 | Create season overview screen | `apps/mobile/app/season/overview.tsx` | 🧪 Skeleton renders, warnings shown, approve flow works | P9-C-04 | ⬜ |

### Sub-Phase 9D: Workout Generation

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P9-D-01 | WorkoutStructure → DSL serializer | `packages/core/src/utils/dsl-serializer.ts` | 🧪 WKGEN-02: valid DSL for bike/run/swim, all constructs | P9-A-12 | ⬜ |
| P9-D-02 | DSL validation function | `packages/core/src/utils/dsl-validator.ts` | 🧪 WKGEN-03, WKGEN-04: catches invalid, passes valid | P9-D-01 | ⬜ |
| P9-D-03 | Workout template engine (free tier) | `packages/core/src/templates/workout-templates.ts` | 🧪 WKGEN-05, WKGEN-06: correct DSL, parameterized with athlete data | P9-D-01 | ⬜ |
| P9-D-04 | Template library: swim workouts | `packages/core/src/templates/swim/` | 🧪 Templates per phase/focus produce valid DSL | P9-D-03 | ⬜ |
| P9-D-05 | Template library: bike workouts | `packages/core/src/templates/bike/` | 🧪 Templates per phase/focus produce valid DSL | P9-D-03 | ⬜ |
| P9-D-06 | Template library: run workouts | `packages/core/src/templates/run/` | 🧪 Templates per phase/focus produce valid DSL | P9-D-03 | ⬜ |
| P9-D-07 | Claude workout generation prompt + output validation | `packages/ai-client/src/prompts/workout-generation.ts` | 🧪 WKGEN-01: valid structure, WKGEN-07-09: hours/constraints/priority respected | P9-D-01, P9-D-02 | ⬜ |
| P9-D-08 | Week assembly logic (template selector + day allocation) | `packages/core/src/utils/week-assembler.ts` | 🧪 Respects day constraints, sport priority, rest days | P9-D-03 | ⬜ |

### Sub-Phase 9E: Block Planning Flow

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P9-E-01 | Block planning screen: constraints + preferences | `apps/mobile/app/plan/block-setup.tsx` | 🧪 Hours, availability, focus areas saved | P9-A-09 | ⬜ |
| P9-E-02 | Block workout generation Edge Function | `supabase/functions/generate-block-workouts/` | 🧪 Generates valid workouts for full block | P9-D-07, P9-D-08 | ⬜ |
| P9-E-03 | Block review screen (week-by-week) | `apps/mobile/app/plan/block-review.tsx` | 🧪 Weeks render, expand detail, request changes | P9-E-02 | ⬜ |
| P9-E-04 | Lock-in flow: push workouts to Intervals.icu | `apps/mobile/app/plan/block-lock.tsx` | 🧪 BLOCK-04: events created with external_id, SYNC-01 | P9-E-03, P9-F-03 | ⬜ |
| P9-E-05 | Plan tab: active block view with week navigation | `apps/mobile/app/(tabs)/plan.tsx` | 🧪 Shows current block, weeks, daily workouts | P9-E-03 | ⬜ |

### Sub-Phase 9F: Sync Engine

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P9-F-01 | Intervals.icu sync engine shared module | `supabase/functions/_shared/intervals-sync-engine.ts` | 🧪 Activity matching, compliance computation, diff detection | P9-A-07 | ⬜ |
| P9-F-02 | Webhook Edge Function: intervals-webhook | `supabase/functions/intervals-webhook/` | 🧪 SYNC-05, SYNC-06: handles activity + event webhooks | P9-F-01 | ⬜ |
| P9-F-03 | Push module: bulk upsert events to Intervals.icu | `supabase/functions/_shared/intervals-push.ts` | 🧪 SYNC-01, SYNC-02, SYNC-03, SYNC-04: upsert, no dupes, correct categories | P9-A-07 | ⬜ |
| P9-F-04 | Cron reconciliation Edge Function: intervals-sync | `supabase/functions/intervals-sync/` | 🧪 SYNC-07: catches missed webhooks | P9-F-01 | ⬜ |
| P9-F-05 | DSL validation before push (with fallback) | Integrated into P9-F-03 | 🧪 SYNC-12: invalid DSL falls back to simplified description | P9-D-02 | ⬜ |

### Sub-Phase 9G: Compliance Tracking

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P9-G-01 | Per-workout compliance computation | `packages/core/src/utils/compliance.ts` | 🧪 COMPLY-01 through COMPLY-06: all thresholds + metric priority | P9-A-12 | ⬜ |
| P9-G-02 | Weekly compliance aggregation | `packages/core/src/utils/compliance.ts` | 🧪 COMPLY-07, COMPLY-08: score + color computation | P9-G-01 | ⬜ |
| P9-G-03 | Block compliance aggregation | `packages/core/src/utils/compliance.ts` | 🧪 COMPLY-09: aggregates weekly scores | P9-G-02 | ⬜ |
| P9-G-04 | Compliance UI components (dots, bars, percentages) | `apps/mobile/components/compliance/` | 🧪 Renders green/amber/red correctly | P9-G-01 | ⬜ |
| P9-G-05 | Week compliance timeline on plan screen | `apps/mobile/app/(tabs)/plan.tsx` | 🧪 Color-coded week bar renders | P9-G-04 | ⬜ |

### Sub-Phase 9H: Coach Adaptations

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P9-H-01 | Daily adaptation suggestion logic | `supabase/functions/ai-orchestrator/` or new function | 🧪 ADAPT-01: suggestion created from check-in data | P9-A-11 | ⬜ |
| P9-H-02 | Adaptation acceptance flow (UI + backend) | `apps/mobile/components/adaptation/` | 🧪 ADAPT-02: updates workout + syncs, ADAPT-03: rejection preserves original | P9-H-01 | ⬜ |
| P9-H-03 | Swap days logic (updates both workouts) | `supabase/functions/` or core utils | 🧪 ADAPT-06: both workouts updated + synced | P9-H-01 | ⬜ |
| P9-H-04 | Rollback support (restore before snapshot) | `packages/supabase-client/src/queries/plan-adaptations.ts` | 🧪 ADAPT-05: restores snapshot + re-syncs | P9-A-11 | ⬜ |
| P9-H-05 | Weekly review summary | `supabase/functions/` or AI orchestrator | 🧪 Generates compliance summary + recommendations | P9-G-02 | ⬜ |
| P9-H-06 | Block transition review + next block prompt | `apps/mobile/app/plan/block-review-complete.tsx` | 🧪 Shows block summary, prompts next block planning | P9-G-03, P9-H-05 | ⬜ |

### Sub-Phase 9I: Dashboard Redesign

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P9-I-01 | Today's workout card (full structured detail) | `apps/mobile/components/dashboard/TodayWorkout.tsx` | 🧪 DASH-NEW-03: shows warmup/main/cooldown with zones | P9-A-10 | ⬜ |
| P9-I-02 | Coach adaptation banner (above today's workout) | `apps/mobile/components/dashboard/AdaptationBanner.tsx` | 🧪 DASH-NEW-07: shows suggestion + accept/reject | P9-H-02 | ⬜ |
| P9-I-03 | Upcoming 3 days (headlines) | `apps/mobile/components/dashboard/Upcoming.tsx` | 🧪 DASH-NEW-04: sport icon + name + duration | P9-A-10 | ⬜ |
| P9-I-04 | Weekly compliance summary | `apps/mobile/components/dashboard/WeekSummary.tsx` | 🧪 DASH-NEW-05: compliance dots render | P9-G-04 | ⬜ |
| P9-I-05 | Season progress bar | `apps/mobile/components/dashboard/SeasonProgress.tsx` | 🧪 DASH-NEW-08: weeks to next race, block name | P9-A-08 | ⬜ |
| P9-I-06 | Integrate new dashboard components | `apps/mobile/app/(tabs)/index.tsx` | 🧪 Full dashboard renders with all elements | P9-I-01 through P9-I-05 | ⬜ |

---

## Phase 8: Polish & Launch

> E2E testing, documentation, and release preparation. The final step before production.

### Workstream A: E2E Testing

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P8-A-01 | Set up Detox for E2E testing | `e2e/`, `detox.config.js` | 🧪 Detox runs | - | ⬜ |
| P8-A-02 | Add onboarding E2E flow | `e2e/onboarding.test.ts` | 🧪 Full onboarding completes | P8-A-01 | ⬜ |
| P8-A-03 | Add daily check-in E2E flow | `e2e/checkin.test.ts` | 🧪 Check-in submits, recommendation shows | P8-A-01 | ⬜ |
| P8-A-04 | Add AI chat E2E flow | `e2e/chat.test.ts` | 🧪 Message sends, response streams | P8-A-01 | ⬜ |
| P8-A-05 | Add settings E2E flow | `e2e/settings.test.ts` | 🧪 Profile updates persist | P8-A-01 | ⬜ |
| P8-A-06 | Integrate E2E tests into CI | `.github/workflows/` | 🧪 CI runs E2E on PRs | P8-A-02 | ⬜ |

### Workstream B: Documentation

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P8-B-01 | Write user guide | `docs/user-guide.md` | - | - | ⬜ |
| P8-B-02 | Write API documentation | `docs/api/` | - | - | ⬜ |
| P8-B-03 | Update contributing guide | `CONTRIBUTING.md` | - | - | ⬜ |

### Workstream C: Release Preparation

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P8-C-01 | App store preparation (icons, screenshots, metadata) | `apps/mobile/assets/` | - | - | ⬜ |
| P8-C-02 | Set up CI/CD for releases | `.github/workflows/` | 🧪 Build pipeline completes | - | ⬜ |
| P8-C-03 | Set up community (issue templates, discussions) | `.github/` | - | - | ⬜ |
| P8-C-04 | Ensure >80% test coverage on critical paths | All packages | 🧪 Coverage report passes threshold | P8-A-06 | ⬜ |

---

## Working on Tasks

### Before Starting a Task
1. Check dependencies are complete
2. Create a feature branch: `git checkout -b feat/{task-id}-short-description`
3. Read existing code in the files you'll modify

### During Implementation
1. Write tests first (TDD) or alongside code
2. Keep changes focused on the task scope
3. Run `pnpm test` and `pnpm lint` frequently

### After Completing a Task
1. Ensure all tests pass
2. Create a small PR with clear description
3. Wait ~2 minutes for Copilot review
4. Address all review comments
5. Update this file to mark task complete

---

## Task Dependencies Graph

```
Phase 1 Foundation
├── P1-A (Core Package) ──────────────────────────┐
├── P1-B (Supabase Client) ───────────────────────┼──→ Phase 2
└── P1-C (Auth) ──────────────────────────────────┘

Phase 2 Core Coaching
├── P2-A (Onboarding) ────→ P2-A-05 needs P1-B
├── P2-B (Profile) ───────→ All need P1-B
├── P2-C (Claude) ────────→ P2-C-04 needs P1-B
└── P2-D (Dashboard) ─────→ All need P1-B

Phase 3 Intervals.icu ────→ Needs P2 complete
Phase 4 AI Orchestration ─→ Needs P3 complete
Phase 5 RAG ──────────────→ Can run parallel to P4
Phase 6 Launch-Critical ───→ Needs P5 complete (A & B can parallel)
Phase 7 Enhancements ──────→ Post-launch (can run parallel to P6)
Phase 7.5 Manual Testing ──→ Needs P7 complete (sequential by category)
Phase 8 Polish & Launch ───→ Needs P7.5 complete (A, B & C can parallel)
Phase 9 Season Planning ──→ Can start after P7.5 (9A first, then fan out)
  9A (Data Model) ──→ 9B, 9C, 9D, 9F (all depend on 9A)
  9C + 9D ──→ 9E (Block Planning needs season setup + workout generation)
  9E + 9F ──→ 9G, 9H (Compliance + Adaptations need blocks + sync)
  9G + 9H ──→ 9I (Dashboard needs compliance + adaptations)
```
