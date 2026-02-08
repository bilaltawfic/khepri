# Session: Workflow Restructure for Smaller PRs

**Date:** 2026-02-08T10:30:00Z
**Duration:** ~30 minutes
**Agent(s) Used:** Explore, Plan

## Goal

Restructure the development workflow to:
1. Break work into smaller, more reviewable PRs
2. Require unit tests for all new code
3. Reduce Copilot review wait time from 5 minutes to 2 minutes
4. Create a detailed task breakdown for parallel agent work

## Context

After merging several PRs for Phase 1 and Phase 2, the user noticed that PRs were getting too large to review efficiently. Copilot code review was taking 5+ minutes for large PRs, and review feedback was harder to address in big changesets.

## Key Decisions

### 1. Small PR Philosophy
- Target <200 lines changed per PR
- Each PR should do one thing well
- Atomic tasks = atomic PRs

### 2. Task Granularity
- Tasks should be 1-2 hours each (~50-150 lines)
- Tasks are numbered: `P{phase}-{workstream}-{number}` (e.g., P2-A-01)
- Each task specifies files to create/modify, required tests, and dependencies

### 3. Testing Requirements
- Unit tests are now **required** for all new code (no exceptions)
- Bug fixes must include a test that would have caught the bug

### 4. Copilot Review Workflow
- Wait ~2 minutes for review (smaller PRs = faster reviews)
- Check comments, address them, repeat until resolved

### 5. File Structure
- `claude-plan.md` - High-level plan (unchanged structure, added link)
- `claude-plan-detailed.md` - New file with granular task breakdown

## Files Changed

1. **CLAUDE.md** - Added testing requirements, PR size guidelines, Copilot review workflow
2. **claude-plan.md** - Added "Small PR Philosophy" section linking to detailed tasks
3. **claude-plan-detailed.md** - New file with ~50 atomic tasks across all phases
4. **MEMORY.md** - Updated PR review workflow with 2-minute wait time

## Current Project Status (as explored)

### Completed
- Phase 0: Planning docs, CLAUDE.md, claude-convos structure
- Phase 1 (Partial): Monorepo, Expo app, Supabase schema, Jest tests
- Phase 2 (Partial): Daily check-in UI, AI client prompts, component library

### Stub/Mock Code
- useCheckin generates mock recommendations (not calling Claude)
- Coach Chat UI complete but input disabled
- Dashboard shows placeholders for metrics
- Onboarding only has welcome screen

### Not Started
- packages/core/ and packages/supabase-client/ are empty
- Supabase Edge Functions
- Real Claude API integration
- Auth flow
- Intervals.icu data sync

## Learnings

1. **Explore before planning** - Running an Explore agent first gave comprehensive understanding of what's actually built vs. planned

2. **Small PRs speed up the whole process** - Large PRs take 5+ minutes for Copilot to review. Small PRs take ~2 minutes. Plus, addressing a few comments is faster than addressing many.

3. **Task numbering helps coordination** - Using P2-A-01 style IDs makes it easy to reference tasks and track dependencies

4. **Keep the main plan high-level** - Moving detailed tasks to a separate file keeps claude-plan.md scannable while still providing granular guidance

## Next Steps

The immediate next tasks from the breakdown are:
- P1-A-01: Create core package structure
- P1-B-01: Create supabase-client package structure
- P1-C-01: Add auth context provider

These can be worked on in parallel by different agents.
