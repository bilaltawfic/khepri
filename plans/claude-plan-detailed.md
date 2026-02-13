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
| P3-A-01 | Create MCP gateway Edge Function scaffold | `supabase/functions/mcp-gateway/index.ts` | 🧪 Function deploys | - | ⬜ |
| P3-A-02 | Add get_activities tool handler | MCP gateway | 🧪 Returns mock data | P3-A-01 | ⬜ |
| P3-A-03 | Add get_wellness_data tool handler | MCP gateway | 🧪 Returns mock data | P3-A-01 | ⬜ |
| P3-A-04 | Add get_events tool handler | MCP gateway | 🧪 Returns mock data | P3-A-01 | ⬜ |
| P3-A-05 | Wire to real Intervals.icu API | MCP gateway | 🧪 Integration test | P3-A-02 | ⬜ |

### Workstream B: Data Sync

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P3-B-01 | Create Intervals.icu connection settings UI | `apps/mobile/app/profile/intervals.tsx` | 🧪 Form validates | - | ⬜ |
| P3-B-02 | Store encrypted API credentials | Supabase + mobile | 🧪 Credentials encrypt/decrypt | P3-B-01 | ⬜ |
| P3-B-03 | Fetch and display recent activities | Dashboard | 🧪 Activities show | P3-A-05, P3-B-02 | ⬜ |
| P3-B-04 | Sync wellness data to daily check-in | Check-in flow | 🧪 Pre-populates data | P3-A-03, P3-B-02 | ⬜ |

---

## Phase 4: AI Orchestration

### Workstream A: Edge Functions

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P4-A-01 | Create ai-orchestrator Edge Function | `supabase/functions/ai-orchestrator/index.ts` | 🧪 Function deploys | - | ⬜ |
| P4-A-02 | Add tool execution pipeline | AI orchestrator | 🧪 Tools execute | P4-A-01, P3-A-01 | ⬜ |
| P4-A-03 | Add streaming response support | AI orchestrator | 🧪 Streams to client | P4-A-01 | ⬜ |
| P4-A-04 | Integrate with context builder | AI orchestrator | 🧪 Context assembles | P4-A-01 | ⬜ |

### Workstream B: Safety & Validation

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P4-B-01 | Implement training load validation | `packages/ai-client/src/tools/safety.ts` | 🧪 Flags overtraining | - | ⬜ |
| P4-B-02 | Add injury awareness to recommendations | AI prompts | 🧪 Respects constraints | P4-B-01 | ⬜ |
| P4-B-03 | Implement workout modification safety checks | Safety tools | 🧪 Prevents dangerous changes | P4-B-01 | ⬜ |

---

## Phase 5: Knowledge Integration (RAG)

### Workstream A: Vector Database

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P5-A-01 | Add pgvector extension migration | `supabase/migrations/002_pgvector.sql` | 🧪 Migration runs | - | ⬜ |
| P5-A-02 | Create embeddings table schema | Migration | 🧪 Table creates | P5-A-01 | ⬜ |
| P5-A-03 | Add embedding generation function | Edge Function | 🧪 Generates embeddings | P5-A-02 | ⬜ |
| P5-A-04 | Add semantic search function | Edge Function | 🧪 Returns relevant docs | P5-A-03 | ⬜ |

### Workstream B: Knowledge Content

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P5-B-01 | Create exercise science doc structure | `docs/knowledge/` | - | - | ⬜ |
| P5-B-02 | Add training load management content | Knowledge docs | - | P5-B-01 | ⬜ |
| P5-B-03 | Add recovery protocols content | Knowledge docs | - | P5-B-01 | ⬜ |
| P5-B-04 | Seed knowledge base with embeddings | Seed script | 🧪 Content searchable | P5-A-03, P5-B-02 | ⬜ |

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
```
