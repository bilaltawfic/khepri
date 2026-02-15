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
**Phase 8:** ⬜ Not Started (Polish & Launch - E2E Testing, Docs, Release)

> **Detailed Phase 2 Plans:** See `plans/phase-2/` for workstream breakdowns

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

> Detailed: [p2-a-onboarding-flow.md](phase-2/p2-a-onboarding-flow.md)

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P2-A-01 | Enable Intervals.icu connect screen inputs | `apps/mobile/app/onboarding/connect.tsx` | 🧪 Screen renders, skip works | - | ✅ (#33) |
| P2-A-02 | Create onboarding context for multi-step data | `apps/mobile/contexts/OnboardingContext.tsx` | 🧪 Context provides state | - | ✅ (#36) |
| P2-A-03 | Wire fitness numbers screen to context | `apps/mobile/app/onboarding/fitness.tsx` | 🧪 Inputs validate, save to context | P2-A-02 | ✅ (#48) |
| P2-A-04 | Wire goals screen to context | `apps/mobile/app/onboarding/goals.tsx` | 🧪 Can add/remove goals | P2-A-02 | ✅ (#39) |
| P2-A-05 | Wire final step to save data to Supabase | `apps/mobile/app/onboarding/plan.tsx` | 🧪 Data persists | P2-A-03, P2-A-04 | ✅ (#53) |

### Workstream B: Profile Management

> Detailed: [p2-b-profile-management.md](phase-2/p2-b-profile-management.md)

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P2-B-01 | Wire personal info screen to Supabase | `apps/mobile/app/profile/personal-info.tsx` | 🧪 Form saves, validates | P1-B-03 | ✅ (#37) |
| P2-B-02 | Wire fitness numbers screen to Supabase | `apps/mobile/app/profile/fitness-numbers.tsx` | 🧪 Form saves, optional fields | P1-B-03 | ✅ (#40) |
| P2-B-03 | Wire goals management to Supabase | `apps/mobile/app/profile/goals.tsx` | 🧪 CRUD operations work | P1-B-05 | ✅ (#45) |
| P2-B-04 | Wire constraints management to Supabase | `apps/mobile/app/profile/constraints.tsx` | 🧪 Can add/edit/remove | P1-B-05 | ✅ (#44) |

### Workstream C: Real Claude Integration

> Detailed: [p2-c-claude-integration.md](phase-2/p2-c-claude-integration.md)

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P2-C-01 | Create conversations schema migration | `supabase/migrations/` | 🧪 Migration runs | - | ✅ (#34) |
| P2-C-02 | Add conversations queries to supabase-client | `packages/supabase-client/src/queries/conversations.ts` | 🧪 CRUD operations | P2-C-01 | ✅ (#38) |
| P2-C-03 | Create ai-coach Edge Function | `supabase/functions/ai-coach/` | 🧪 Function deploys | - | ✅ (#35) |
| P2-C-04 | Wire useCheckin to call real AI | `apps/mobile/services/ai.ts`, `apps/mobile/hooks/useCheckin.ts` | 🧪 Mock API calls | P2-C-03 | ✅ (#43) |
| P2-C-05 | Enable chat with conversation persistence | `apps/mobile/hooks/useConversation.ts` | 🧪 History loads on mount | P2-C-02, P2-C-03 | ✅ (#41, #43) |

### Workstream D: Dashboard Real Data

> Detailed: [p2-d-dashboard-data.md](phase-2/p2-d-dashboard-data.md)

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

### Workstream D: Production Auth Hardening

> Remove the dev-mode auth bypass so the app behaves identically in development and production. Currently `ProtectedRoute` silently skips auth when `__DEV__ && !isConfigured`, meaning developers never test the real auth flow and a misconfigured production build could expose the entire app without login.

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P8-D-01 | Remove dev auth bypass and add configuration error screen | `apps/mobile/components/ProtectedRoute.tsx`, `apps/mobile/components/ConfigurationError.tsx` | 🧪 When Supabase not configured: error screen renders with setup instructions. When configured but unauthenticated: redirects to `/auth/login`. Existing ProtectedRoute tests updated. | - | ⬜ |
| P8-D-02 | Update tests that rely on dev auth bypass | `apps/mobile/**/*.test.tsx` | 🧪 All existing tests pass. Tests that previously relied on the bypass now either mock `useAuth` to return an authenticated user or test the configuration error screen. | P8-D-01 | ⬜ |
| P8-D-03 | Document local Supabase setup for development | `docs/local-dev-setup.md`, `apps/mobile/.env.example` | - | P8-D-01 | ⬜ |

**Implementation notes for P8-D-01:**
- Delete `if (__DEV__ && !isConfigured) return <>{children}</>;` from `ProtectedRoute.tsx`
- When `!isConfigured`, render a new `ConfigurationError` component that explains Supabase env vars are missing and shows the required variables (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`)
- This screen should appear in both dev and production, making misconfiguration obvious instead of silently bypassed
- The developer workflow becomes: `supabase start` → copy env vars → `pnpm dev` (documented in P8-D-03)

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
Phase 6 Launch-Critical ──→ Needs P5 complete (A & B can parallel)
Phase 7 Enhancements ─────→ Post-launch (can run parallel to P6)
Phase 8 Polish & Launch ──→ Needs P7 complete (A, B & C can parallel)
```
