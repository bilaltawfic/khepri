# P9E-R-04: Constrain Unavailability Date Picker to Block Dates

## Goal
Set `minimumDate` and `maximumDate` on the `FormDatePicker` in block-setup.tsx so dates outside the block's date range are greyed out and unselectable. Also filter out pre-existing unavailable dates that fall outside the block range.

**Depends on:** P9E-R-03 (block dates exposed from hook) ✅ merged in #160

## Files to Modify
- `apps/mobile/app/plan/block-setup.tsx` — add min/max date constraints + out-of-range filtering
- `apps/mobile/app/plan/__tests__/block-setup.test.tsx` — test constraint props and filtering

## Implementation Steps

1. **Read current `block-setup.tsx` and `useBlockPlanning.ts`** to understand how `blockStartDate` and `blockEndDate` are exposed after PR #160.

2. **Add date constraints to `FormDatePicker`**
   - Destructure `blockStartDate` and `blockEndDate` from `useBlockPlanning()`
   - Pass them as `minimumDate` and `maximumDate` to the existing `FormDatePicker`:
     ```tsx
     <FormDatePicker
       mode="range"
       label="Date range"
       rangeStart={rangeStart}
       rangeEnd={rangeEnd}
       onRangeSelect={handleRangeSelect}
       minimumDate={blockStartDate ? new Date(blockStartDate) : undefined}
       maximumDate={blockEndDate ? new Date(blockEndDate) : undefined}
       helpText={blockStartDate && blockEndDate
         ? `Within block: ${formatShortDate(blockStartDate)} – ${formatShortDate(blockEndDate)}`
         : undefined}
       allowClear
     />
     ```

3. **Filter out-of-range unavailable dates on load**
   - When loading draft/saved unavailable dates, filter out any dates that fall outside `[blockStartDate, blockEndDate]`
   - If any dates were removed, show a toast or inline message: "N unavailable date(s) outside block range were removed"
   - Use existing toast infrastructure if available, otherwise an inline info text

4. **Update tests**
   - Verify `FormDatePicker` receives `minimumDate` and `maximumDate` props
   - Verify out-of-range dates are filtered on load
   - Verify help text displays the block range

## Code Patterns

### Date constraint props
```tsx
const { blockStartDate, blockEndDate } = useBlockPlanning();

// Convert ISO strings to Date objects for FormDatePicker
const minDate = blockStartDate ? new Date(blockStartDate) : undefined;
const maxDate = blockEndDate ? new Date(blockEndDate) : undefined;
```

### Out-of-range filtering
```typescript
function filterToBlockRange(
  dates: readonly UnavailableDate[],
  blockStart: string,
  blockEnd: string,
): { filtered: UnavailableDate[]; removedCount: number } {
  const filtered = dates.filter(d => d.date >= blockStart && d.date <= blockEnd);
  return { filtered, removedCount: dates.length - filtered.length };
}
```

## Testing Requirements
- `FormDatePicker` receives `minimumDate` matching `blockStartDate`
- `FormDatePicker` receives `maximumDate` matching `blockEndDate`
- Help text shows formatted block date range
- Pre-existing dates outside block range are filtered out
- Removed count message appears when dates were filtered

## Verification
- `pnpm test` passes
- `pnpm lint` passes
- `pnpm typecheck` passes
- Manual: date picker greys out dates outside block range
