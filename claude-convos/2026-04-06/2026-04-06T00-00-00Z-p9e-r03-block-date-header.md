# P9E-R-03: Block Date Range Header

## Goals
Display the block's start and end dates in the block setup header so the user knows the planning window before generating workouts. Also expose block metadata from the hook for downstream tasks (R-04 date constraints, R-02 day preferences).

## Key Decisions

### Metadata computation strategy
- Added `allBlocks` state (all blocks for the season) alongside the existing `block` state (active block)
- Used `useMemo` keyed on `season`, `block`, and `allBlocks` to eagerly compute `blockMeta`
- Priority: if an existing block is found, use its stored dates (authoritative); otherwise compute from the season skeleton
- The skeleton-based computation reuses the existing `collectBlockPhases()` helper and wraps in try/catch (it throws if all phases are planned)

### New `computeBlockMetaFromSkeleton` helper
- Extracted skeleton computation into a standalone helper to keep the useMemo clean
- Filters only locked/in_progress blocks as "planned" (same logic as generateWorkouts)

### UI date formatting
- Added `formatShortDate()` (YYYY-MM-DD → "Jan 19, 2026") and `formatDateRange()` helpers in block-setup.tsx
- Same-year ranges omit the year on the start date: "Jan 19 – Jun 7, 2026"
- Rendered as a template string to avoid React splitting week count into separate text nodes

## Files Changed
- `apps/mobile/hooks/useBlockPlanning.ts` — added `BlockMeta` type, `allBlocks` state, `computeBlockMetaFromSkeleton` helper, `blockMeta` useMemo, exposed in return
- `apps/mobile/app/plan/block-setup.tsx` — added `formatShortDate`/`formatDateRange` helpers, block date range header UI, new styles
- `apps/mobile/hooks/__tests__/useBlockPlanning.test.ts` — 4 new tests: blockMeta from skeleton, blockMeta from block, null when no season, null blockMeta
- `apps/mobile/app/plan/__tests__/block-setup.test.tsx` — 3 new tests: header renders with dates, human-readable format, no header when blockMeta is null

## Learnings
- JSX renders `{count} weeks` as separate text nodes; use template string `` `${count} weeks` `` for single-node output that is searchable in toJSON() tests
- Pre-existing typecheck errors on the branch (9 errors) not introduced by this task
