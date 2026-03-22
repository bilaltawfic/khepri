# Onboarding Events Step

**Date:** 2026-03-22
**Branch:** feat/onboarding-events

## Goals
- Add a new onboarding step for users to add key events (races, camps, travel) for the year
- Place the events step between Goals and Training Plan in the onboarding flow
- Support both manual event entry and Intervals.icu import for connected users

## Key Decisions
1. **Event types:** race, camp, travel, other - covers the main categories mentioned in the plan
2. **Data persistence:** Race-type events are saved as goals (goalType: 'race') since the goals table already supports this and it integrates with existing periodization logic
3. **Intervals.icu import:** Fetches race and travel events in 90-day chunks (API limit) for the next 12 months
4. **Navigation flow:** Goals -> Events -> Training Plan (events screen inserted between existing steps)
5. **Max events:** 10 (higher than goals limit of 5, since users may have many events in a year)

## Files Changed
- `apps/mobile/contexts/OnboardingContext.tsx` - Added OnboardingEvent type, events array to data model, setEvents/addEvent/removeEvent callbacks
- `apps/mobile/contexts/index.ts` - Updated barrel exports
- `apps/mobile/app/onboarding/events.tsx` - New events screen with manual entry form and Intervals.icu import
- `apps/mobile/app/onboarding/_layout.tsx` - Added events screen to navigation stack
- `apps/mobile/app/onboarding/goals.tsx` - Updated Continue navigation to go to events instead of plan
- `apps/mobile/services/onboarding.ts` - Save race events as goals during onboarding save
- `apps/mobile/app/onboarding/__tests__/events.test.tsx` - Comprehensive tests for events screen
- `apps/mobile/app/onboarding/__tests__/goals.test.tsx` - Updated navigation assertions
- `apps/mobile/contexts/__tests__/OnboardingContext.test.tsx` - Updated initial state assertions
- `apps/mobile/services/__tests__/onboarding.test.ts` - Updated makeData helper

## Learnings
- The existing CalendarEvent interface from the calendar service maps well to onboarding events
- The goals table's race type and priority system can be reused for race events without schema changes
- Keeping the import chunked to 90-day windows respects the MCP gateway's API limits
