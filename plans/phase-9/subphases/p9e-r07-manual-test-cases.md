# P9E-R-07: Update Manual Test Cases

## Goal
Add/update manual test cases in `docs/testing/manual-test-cases.csv` covering the block planning rethink (R-01 through R-06) so QA can validate the new behavior end-to-end.

## Context
All implementation work for the P9E-R rethink is complete (PRs #159–#167):
- R-01: race-sport-requirements utility
- R-02: per-day workout preferences UI
- R-03: block date range header
- R-04: date picker constraints
- R-05: enriched preferences wired into edge function
- R-06/R-08: week assembler `minSessionsPerSport` + `workoutLabel` + tests

The only remaining task in the rethink is R-07 (this plan) — updating manual test docs.

## Files to Modify
- `docs/testing/manual-test-cases.csv`

## Test Cases to Add

Append (or insert in the BLOCK section) these rows:

| ID | Category | Use Case |
|----|----------|----------|
| BLOCK-08 | Block Planning | Block setup shows date range header (start–end, weeks) |
| BLOCK-09 | Block Planning | Required sports info card derived from race discipline + distance |
| BLOCK-10 | Block Planning | Min sessions warning when day preferences insufficient |
| BLOCK-11 | Block Planning | Add per-day workout preference (sport + optional workout type) |
| BLOCK-12 | Block Planning | Remove per-day workout preference via chip X |
| BLOCK-13 | Block Planning | Unavailability range picker constrained to block dates (out-of-range disabled) |
| BLOCK-14 | Block Planning | Unavailability range with reason label |
| BLOCK-15 | Block Planning | Day preferences fed into workout generation |
| BLOCK-16 | Block Planning | Generated workouts respect min sessions per sport |
| BLOCK-17 | Block Planning | Pre-existing unavailable date outside block range filtered with toast |

Modify existing `BLOCK-02` to mention the day-preferences step.

For each row, include realistic preconditions, numbered steps, and expected results matching the CSV's existing style (multi-line cells quoted).

## Verification
- `docs/testing/manual-test-cases.csv` parses correctly (load in spreadsheet / `csvlint` if available)
- All new IDs are unique
- Existing rows untouched except `BLOCK-02`
- PR title: `docs: add manual test cases for P9E block planning rethink`
- CI green (lint, build, AI conversation log, PR title check)

## Out of Scope
- No code changes
- No new automated tests (R-08 already covers unit tests)
