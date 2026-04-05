# Session: Update Manual Test Cases for Phase 9

**Date:** 2026-04-05T11:00:00Z
**Agent(s) Used:** Claude Code, Explore

## Goal

Update the manual test cases CSV to reflect Phase 9 changes: removed onboarding steps, new season setup flow, block planning, compliance tracking, coach adaptations, and dashboard redesign.

## Key Decisions

- Removed OB-12 through OB-17 (goals, events, plan steps removed in 9B)
- Rewrote OB-12 as simplified 3-step flow test, renumbered from OB-18
- Updated OB-06 through OB-11 to reflect "Finish Setup" as final step
- Replaced DASH-01 through DASH-09 with 14 tests covering three dashboard states
- Replaced PLAN-01 through PLAN-09 with 7 tests for block-based plan view
- Added SEASON category (12 tests): races, goals, preferences, skeleton generation
- Added BLOCK category (7 tests): setup, generation, review, lock-in
- Added COMPLY category (7 tests): per-workout, weekly, block scoring, metric priority
- Added ADAPT category (7 tests): suggestion, accept, reject, swap, block transition

## Files Changed

- `docs/testing/manual-test-cases.csv` — Full rewrite with Phase 9 coverage

## Learnings

- Total test cases: ~100 (was ~90, net +10 with removed/added)
- New categories ordered logically in the user journey: SEASON → BLOCK → PLAN → COMPLY → ADAPT
