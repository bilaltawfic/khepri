# Session: Phase 1 Supabase Client Planning

**Date:** 2026-02-08T05:36:20Z
**Duration:** ~30 minutes
**Agent(s) Used:** Explore, Plan

## Goal

Plan the implementation of Phase 1 Workstream B (Supabase Client Package) and reorganize the project's plan files into a dedicated directory structure.

## Context

User had just set up their `.env` file with Supabase credentials and wanted to understand:
1. Current plan status
2. How many parallel workers could work on remaining tasks
3. What the outputs would be

## Key Decisions

### 1. Worker Strategy
- **Decision:** Start with 1 worker on Supabase Client (Workstream B)
- **Rationale:** Critical path - both Auth and Phase 2 depend on it. Starting with 1 worker makes PR review manageable.

### 2. Plans Directory Reorganization
- **Decision:** Create `plans/` directory structure at repo root
- **Structure:**
  ```
  plans/
  ├── README.md
  ├── claude-plan.md               # Moved from root
  ├── claude-plan-detailed.md      # Moved from root
  └── phase-1/
      └── p1-b-supabase-client.md  # New detailed plan
  ```
- **Rationale:** Better organization as project grows with more phases

### 3. Integration Testing Strategy
- **Decision:** Add P1-B-06 for Docker-based integration tests
- **Approach:** Use `supabase start` in CI (recommended over custom docker-compose)
- **Tests:** Real CRUD against local Postgres, RLS policy verification

### 4. Task Breakdown (6 PRs)
1. P1-B-01: Package structure
2. P1-B-02: Client initialization + Database types
3. P1-B-03: Athlete profile queries
4. P1-B-04: Daily check-in queries
5. P1-B-05: Goals and constraints queries
6. P1-B-06: Integration tests with local Supabase

## Exploration Findings

The Explore agent discovered:
- `packages/supabase-client/` exists as empty placeholder (`.gitkeep` only)
- `packages/ai-client/src/types.ts` has comprehensive types matching Supabase schema (510 lines)
- Database schema defined in `supabase/migrations/001_initial_schema.sql`
- Mobile app uses hooks with mock data (`apps/mobile/hooks/useCheckin.ts`)

## Files Changed

- Created `plans/README.md`
- Moved `claude-plan.md` to `plans/`
- Moved `claude-plan-detailed.md` to `plans/`
- Created `plans/phase-1/p1-b-supabase-client.md`
- Updated `CLAUDE.md` references to plan files
- Updated `README.md` references to plan files

## Learnings

1. **Plan files grow with the project** - Having a dedicated `plans/` directory with sub-phase folders scales better than root-level files.

2. **Integration tests enable confidence** - Adding Docker-based integration tests (P1-B-06) will validate RLS policies and real database constraints.

3. **1 worker is fine for critical path** - When tasks are sequential dependencies, running 1 worker makes PR review easier without sacrificing velocity.

4. **Supabase CLI simplifies Docker setup** - Using `supabase start` is cleaner than custom docker-compose for local testing.

## Next Steps

1. Start P1-B-01: Create supabase-client package structure
2. Each task produces a small PR (~100-150 lines)
3. Follow Copilot Code Review workflow after each PR
