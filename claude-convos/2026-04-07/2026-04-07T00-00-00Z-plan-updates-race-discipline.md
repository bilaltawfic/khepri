# Plan Updates: Race Discipline API

**Date:** 2026-04-07
**Branch:** docs/plan-updates-race-discipline

## Goal
After PR #164 (race discipline model restructure) merged, update upcoming Phase 9 plan files so that future PRs use the new race API instead of the legacy `getSportRequirements(distance)` shape.

## Files Changed
- `plans/phase-9/subphases/p9c-season-setup-flow.md` — updated `SeasonRace` interface to include `discipline: RaceDiscipline`, renamed `target_time_seconds` → `targetTimeSeconds`, and added a note pointing to `RACE_CATALOG`.
- `plans/phase-9/subphases/p9e-block-planning-rethink.md` — added a top-of-doc callout flagging the API change.
- `plans/phase-9/subphases/p9e-r06-r08-week-assembler-min-sessions.md` — added a callout describing the new `getRequirementsForRace(discipline, distance)` API and the deprecated-but-still-working `getSportRequirements(distance)` legacy path via `LEGACY_DISTANCE_TO_CATALOG`.

## Key Decisions
- Did **not** rewrite the historical code samples in the plans (the older `getSportRequirements(distance)` snippets are kept for context). Instead, added explicit "Updated post-#164" callouts that point future workers to the new API.
- Did not touch p9e-r01/r02/r03 (already merged) — those are historical records of completed PRs.

## Learnings
- Plan files in `plans/phase-9/subphases/` mix historical (merged) and forward-looking (pending) tasks; targeted callouts are lower-risk than rewriting old sections.
