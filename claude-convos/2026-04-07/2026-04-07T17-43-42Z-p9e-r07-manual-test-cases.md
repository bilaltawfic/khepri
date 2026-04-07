# P9E-R-07: Update Manual Test Cases

## Goals
Update `docs/testing/manual-test-cases.csv` to cover the P9E-R block planning rethink (R-01 through R-06), per `plans/phase-9/subphases/p9e-r07-manual-test-cases.md`.

## Key Decisions
- BLOCK-08 through BLOCK-17 rows were already present on this branch from earlier work covering the date range header, required-sports card, per-day preferences UI, unavailability range constraints, and generator behavior.
- The only remaining change required by the plan was modifying BLOCK-02 to mention the new per-day "weekly rhythm" day preferences step in block setup configuration.
- Did not reorder existing rows (BLOCK-17 appears before BLOCK-15/16) per plan instruction: "Existing rows untouched except BLOCK-02".
- Verified CSV parses cleanly with Python's `csv` module and all BLOCK IDs are unique.

## Files Changed
- `docs/testing/manual-test-cases.csv` — expanded BLOCK-02 steps to include the day preferences assignment step and updated its notes.

## Learnings
- The P9E-R rethink manual test rows were authored incrementally alongside the feature PRs (#159–#167), so R-07 was mostly a finishing touch rather than a full rewrite.
