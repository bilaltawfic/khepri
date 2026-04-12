# P9E-R12: Athlete Block Notes — Plan

## Date
2026-04-12

## Goals
- Design a subphase plan for adding a free-text "block notes" field (250 char max) to the block planning flow
- The field lets athletes provide situational context (e.g., prior training load, injuries, race-course demands) that the AI agent considers when generating workouts

## Key Decisions
- **Field name:** `block_notes` (DB) / `blockNotes` (TypeScript)
- **Storage:** Nullable TEXT column on `race_blocks` with a `CHECK (char_length <= 250)` constraint
- **UI placement:** Block setup screen, below unavailable dates section
- **AI integration:** Included as a conditional "Athlete Notes" section in the Claude prompt (R09). Template generator ignores it.
- **Validation:** Optional string, max 250 chars — enforced at DB, edge function, and UI levels

## Planning Output Files
- `plans/phase-9/subphases/p9e-r12-athlete-block-notes.md` (new) — subphase implementation plan
- `claude-convos/2026-04-12/2026-04-12T00-00-00Z-p9e-r12-block-notes-plan.md` (new) — this conversation log

## Learnings
- The Claude block generation path (R09) has already been implemented, so prompt integration in `prompts.ts` is now a concrete change rather than a future consideration
- Block setup already has persistence (R10) and the hook already passes structured data to the edge function, so adding a new field follows established patterns
