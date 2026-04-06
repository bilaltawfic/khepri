# P9E-R-03: Show Block Date Range in Block Setup Header

## Goal
Display the block's start and end dates prominently at the top of block setup so the user knows the planning window. Also expose block metadata from the hook so downstream tasks (R-04 date constraints, R-02 day preferences) can use it.

## Files to Create/Modify
- **Modify:** `apps/mobile/hooks/useBlockPlanning.ts` — eagerly compute block dates, expose `blockName`, `blockStartDate`, `blockEndDate`, `blockTotalWeeks`, and season races
- **Modify:** `apps/mobile/app/plan/block-setup.tsx` — add date range header
- **Modify (if needed):** `apps/mobile/hooks/__tests__/useBlockPlanning.test.ts` — test eager computation

## Implementation Steps

1. **Modify `useBlockPlanning.ts`**
   - The hook currently computes block phases (via `collectBlockPhases()`) only during `generateWorkouts()`. Refactor to compute eagerly on mount / when season/block changes.
   - Add to the hook's return type:
     ```typescript
     blockName: string;         // e.g. "70.3 #1 Prep"
     blockStartDate: string;    // ISO date string
     blockEndDate: string;      // ISO date string
     blockTotalWeeks: number;   // week count
     seasonRaces: SeasonRace[]; // for P9E-R-01 to derive sport requirements
     ```
   - Use existing `collectBlockPhases()` logic but call it during initialization, not just on generate.
   - Memoize with `useMemo` keyed on season/block IDs.

2. **Modify `block-setup.tsx`**
   - Destructure new fields from `useBlockPlanning()`
   - Add a header section above the existing form content:
     ```
     [Block Name]
     [Start Date] – [End Date] · [N] weeks
     ```
   - Use `formatDate()` from `@khepri/core` or a local formatter for human-readable dates (e.g., "Jan 19 – Jun 7, 2026")
   - Style: bold block name, subtitle with date range in muted color

3. **Update tests**
   - Test that hook returns block metadata when season and block are available
   - Test that block-setup renders the header with correct dates

## Code Patterns

### Hook changes (useBlockPlanning.ts)
```typescript
// Eagerly compute block phases for metadata
const blockMeta = useMemo(() => {
  if (!season || !block) return null;
  const phases = collectBlockPhases(season, block);
  if (phases.length === 0) return null;
  const startDate = phases[0].startDate;
  const endDate = phases[phases.length - 1].endDate;
  const weeks = differenceInWeeks(parseISO(endDate), parseISO(startDate));
  return {
    blockName: block.name ?? `Block ${block.order_index + 1}`,
    blockStartDate: startDate,
    blockEndDate: endDate,
    blockTotalWeeks: weeks,
  };
}, [season, block]);
```

### UI changes (block-setup.tsx)
```tsx
{blockMeta && (
  <View style={styles.headerContainer}>
    <Text style={styles.blockName}>{blockMeta.blockName}</Text>
    <Text style={styles.blockDates}>
      {formatDateRange(blockMeta.blockStartDate, blockMeta.blockEndDate)} · {blockMeta.blockTotalWeeks} weeks
    </Text>
  </View>
)}
```

## Testing Requirements
- Hook returns `blockName`, `blockStartDate`, `blockEndDate`, `blockTotalWeeks` when season+block exist
- Hook returns null metadata when no season/block
- Block setup screen renders date range header
- Date format is human-readable (e.g., "Jan 19 – Jun 7, 2026")
- Week count is computed correctly

## Verification
- `pnpm test` passes
- `pnpm lint` passes
- `pnpm typecheck` passes
- Block setup screen visually shows date range header (manual verification in Expo)
