# Phase 6 Launch-Ready Plan Update

**Date:** 2026-02-14T21:00:00Z
**Command:** `/update-plan`
**Branch:** `docs/update-phase-6-launch-ready`

## Goals

1. Clarify what "Phase 6+" meant and define feature-complete scope
2. Restructure Phase 6 to focus on launch-critical features only
3. Move nice-to-have enhancements to Phase 7 (post-launch)
4. Mark all completed Phase 5 tasks as done
5. Add training plan generation (P6-B) as a new workstream

## Key Decisions

### Feature Completeness Definition

**"6+" notation clarification:** Originally meant "Phase 6 and beyond" - intentionally vague. User correctly pushed for clarity on what's essential vs nice-to-have.

**Launch-critical features (must-have):**
- Training plan generation with periodization logic (NEW - P6-B)
- Calendar push to Intervals.icu (P6-A)

**Post-launch enhancements (nice-to-have → Phase 7):**
- Push notifications (P7-A-01/02/03)
- Conversation history UI (P7-A-04)
- Race countdown & training block reviews (P7-B-02/03)
- Gym/travel workouts (P7-C)

### Phase Restructuring

**Phase 5:** Marked as complete
- P5-B-04 completed via #87 (seed knowledge base)
- P5-C added for RAG integration tasks completed via #92

**Phase 6:** Launch-Critical Features
- **Workstream A:** Calendar & Workout Push (3 tasks)
- **Workstream B:** Training Plan Generation (6 tasks) - NEW

**Phase 7:** Post-Launch Enhancements (NEW)
- **Workstream A:** Notifications & History (4 tasks)
- **Workstream B:** Analysis & Insights (3 tasks)
- **Workstream C:** Alternative Workouts (3 tasks)

### Training Plan Generation Scope

Added P6-B with 6 tasks covering:
1. Database schema for training plans
2. CRUD queries in supabase-client
3. Periodization logic (progressive training load, taper, recovery weeks)
4. Edge Function to generate plans
5. AI orchestrator integration
6. Mobile UI to display/edit plans

This is the core missing feature - without it, the app only provides daily recommendations, not structured multi-week training plans.

## Files Changed

- `plans/claude-plan-detailed.md`
  - Updated status header (Phase 5 complete, Phase 6/7 added)
  - Marked P5-B-04 complete (#87)
  - Added P5-C workstream (P5-C-01/02 complete via #92)
  - Added Phase 6 with A (Calendar Push) and B (Plan Generation)
  - Added Phase 7 with A (Notifications), B (Analysis), C (Workouts)
  - Updated task dependency graph

## Learnings

1. **Always define "feature complete" explicitly** - "Phase 6+" was too vague. User needs clarity on when the app is actually usable.

2. **Distinguish core vs enhancement features early** - Training plan generation is CORE functionality for a training coach app, not an enhancement. Should have been in the original Phase 6 scope.

3. **Phase naming matters** - "Launch-Critical" vs "Post-Launch Enhancements" makes priorities crystal clear.

4. **Test case alignment** - PR #88 (manual test cases) should map directly to these phases. Launch-critical features need comprehensive testing before Phase 7 work begins.

## Next Steps

1. Merge this plan update
2. Update PR #88 test cases to reflect Phase 6 scope
3. Start Phase 6 implementation with P6-A-01 or P6-B-01
4. Run through test cases once Phase 6 is complete
5. Go live!
6. Gather user feedback to prioritize Phase 7 tasks
