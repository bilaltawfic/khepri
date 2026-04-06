# Shared FormDatePicker Component Refactor

## Goals
- Extend `FormDatePicker` to support both single date and date range selection via a `mode` prop
- Replace `@react-native-community/datetimepicker` usage with the custom calendar component
- Migrate `races.tsx` (season setup) to use the shared `FormDatePicker`
- Create a reusable calendar component used across the app

## Key Decisions
- **Single component with `mode` prop** instead of two separate components — simpler API via discriminated union types (`SingleModeProps | RangeModeProps`)
- **Custom calendar grid** rather than third-party library — the component already had a built-in calendar, so we extended it with range selection
- **Range UX**: first tap = start date, second tap = end date, auto-swap if second tap is before first, visual highlighting of range between endpoints
- **Inner highlight circle** (32x32) inside larger cell (40px) to prevent highlight circles from touching between rows

## Files Changed
- `apps/mobile/components/FormDatePicker.tsx` — Major rewrite: added `CalendarGrid` shared component, `SinglePickerModal`, `RangePickerModal`, discriminated union props
- `apps/mobile/app/season/races.tsx` — Migrated from `@react-native-community/datetimepicker` to `FormDatePicker`
- `apps/mobile/app/season/__tests__/races.test.tsx` — Updated tests with FormDatePicker mock and `selectDate` helper

## Learnings
- Jest mock factories cannot reference out-of-scope typed variables — use `any` type for mock callbacks
- React state updates from mock callbacks need `act()` wrapping
- `aspectRatio: 1` on calendar cells creates overly tall cells — fixed height + inner highlight View is better
