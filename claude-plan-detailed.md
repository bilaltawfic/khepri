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
**Phase 1:** 🔄 Partial (UI done, backend integration pending)
**Phase 2:** 🔄 Partial (UI done, real API pending)

---

## Phase 1: Foundation (Remaining Tasks)

### Workstream A: Core Package Setup

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P1-A-01 | Create core package structure with tsconfig | `packages/core/package.json`, `tsconfig.json`, `src/index.ts` | 🧪 Build passes | - | ⬜ |
| P1-A-02 | Extract shared types from mobile app | `packages/core/src/types/athlete.ts`, `wellness.ts`, `goals.ts` | 🧪 Type exports work | P1-A-01 | ⬜ |
| P1-A-03 | Add utility functions (date formatting, validation) | `packages/core/src/utils/` | 🧪 Unit tests for each util | P1-A-01 | ⬜ |
| P1-A-04 | Update mobile app to import from @khepri/core | `apps/mobile/` imports | 🧪 Existing tests pass | P1-A-02 | ⬜ |

### Workstream B: Supabase Client Package

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P1-B-01 | Create supabase-client package structure | `packages/supabase-client/package.json`, `tsconfig.json` | 🧪 Build passes | - | ⬜ |
| P1-B-02 | Add Supabase client initialization | `packages/supabase-client/src/client.ts` | 🧪 Client creates successfully | P1-B-01 | ⬜ |
| P1-B-03 | Add athlete profile queries | `src/queries/athlete.ts` | 🧪 Mock tests for CRUD | P1-B-02 | ⬜ |
| P1-B-04 | Add daily check-in queries | `src/queries/checkins.ts` | 🧪 Mock tests for CRUD | P1-B-02 | ⬜ |
| P1-B-05 | Add goals and constraints queries | `src/queries/goals.ts`, `constraints.ts` | 🧪 Mock tests for CRUD | P1-B-02 | ⬜ |

### Workstream C: Auth Foundation

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P1-C-01 | Add auth context provider to mobile app | `apps/mobile/contexts/AuthContext.tsx` | 🧪 Context renders, provides state | - | ⬜ |
| P1-C-02 | Create login screen UI | `apps/mobile/app/auth/login.tsx` | 🧪 Screen renders, inputs work | P1-C-01 | ⬜ |
| P1-C-03 | Create signup screen UI | `apps/mobile/app/auth/signup.tsx` | 🧪 Screen renders, validation | P1-C-02 | ⬜ |
| P1-C-04 | Wire auth screens to Supabase auth | `apps/mobile/services/auth.ts` | 🧪 Mock auth flow tests | P1-B-02, P1-C-03 | ⬜ |
| P1-C-05 | Add protected route wrapper | `apps/mobile/components/ProtectedRoute.tsx` | 🧪 Redirects unauthenticated users | P1-C-04 | ⬜ |

---

## Phase 2: Core Coaching (Remaining Tasks)

### Workstream A: Complete Onboarding Flow

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P2-A-01 | Create onboarding connect screen (Intervals.icu) | `apps/mobile/app/onboarding/connect.tsx` | 🧪 Screen renders, skip works | - | ⬜ |
| P2-A-02 | Create fitness numbers input screen | `apps/mobile/app/onboarding/fitness.tsx` | 🧪 Inputs validate, optional fields work | P2-A-01 | ⬜ |
| P2-A-03 | Create goals setup screen | `apps/mobile/app/onboarding/goals.tsx` | 🧪 Can add/remove goals | P2-A-02 | ⬜ |
| P2-A-04 | Create plan duration selection screen | `apps/mobile/app/onboarding/plan.tsx` | 🧪 Options work, can skip | P2-A-03 | ⬜ |
| P2-A-05 | Wire onboarding flow to save data | Connect to supabase-client | 🧪 Data persists | P1-B-03, P2-A-04 | ⬜ |

### Workstream B: Profile Management

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P2-B-01 | Complete personal info edit screen | `apps/mobile/app/profile/personal-info.tsx` | 🧪 Form saves, validates | P1-B-03 | ⬜ |
| P2-B-02 | Complete fitness numbers edit screen | `apps/mobile/app/profile/fitness-numbers.tsx` | 🧪 Form saves, optional fields | P1-B-03 | ⬜ |
| P2-B-03 | Complete goals management screen | `apps/mobile/app/profile/goals.tsx` | 🧪 CRUD operations work | P1-B-05 | ⬜ |
| P2-B-04 | Complete constraints management screen | `apps/mobile/app/profile/constraints.tsx` | 🧪 Can add/edit/remove | P1-B-05 | ⬜ |

### Workstream C: Real Claude Integration

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P2-C-01 | Create AI service wrapper for mobile | `apps/mobile/services/ai.ts` | 🧪 Service initializes | - | ⬜ |
| P2-C-02 | Wire useCheckin to call real AI | Update `apps/mobile/hooks/useCheckin.ts` | 🧪 Mock API calls | P2-C-01 | ⬜ |
| P2-C-03 | Enable coach chat with real messages | `apps/mobile/app/(tabs)/chat.tsx` | 🧪 Messages send/receive | P2-C-01 | ⬜ |
| P2-C-04 | Add conversation history storage | `packages/supabase-client/src/queries/conversations.ts` | 🧪 Messages persist | P1-B-02 | ⬜ |
| P2-C-05 | Display conversation history in chat | Update chat screen | 🧪 History loads on mount | P2-C-04 | ⬜ |

### Workstream D: Dashboard Real Data

| ID | Task | Files | Tests | Deps | Status |
|----|------|-------|-------|------|--------|
| P2-D-01 | Fetch real athlete data for dashboard | Update `apps/mobile/app/(tabs)/index.tsx` | 🧪 Data loads | P1-B-03 | ⬜ |
| P2-D-02 | Display real training metrics (CTL/ATL/TSB) | Dashboard components | 🧪 Calculations correct | P2-D-01 | ⬜ |
| P2-D-03 | Show upcoming events from data | Dashboard events section | 🧪 Events display | P2-D-01 | ⬜ |

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
