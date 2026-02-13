# P2-A-05: Wire Onboarding Plan Screen to Save Data

## Date
2026-02-13

## Goals
Implement the P2-A-05 plan: wire the onboarding plan screen to save collected onboarding data to Supabase when the user completes onboarding.

## Key Decisions
- Created a dedicated `saveOnboardingData` service function (not inline in the component) for testability and separation of concerns
- Service resolves athlete ID from auth user ID, updates profile with fitness numbers, then creates goals sequentially
- Used partial success pattern: if profile saves but some goals fail, returns `{ success: true, error: "..." }` so the user can still proceed
- "Decide later" button calls `finishOnboarding` directly, skipping the save entirely (no data loss since context is reset)
- Dev mode bypass returns success immediately when Supabase is not configured
- Included `weight_kg` in the athlete update (plan didn't mention it but OnboardingData has `weight` and the schema has `weight_kg`)

## Files Changed
- `apps/mobile/services/onboarding.ts` - New service with `saveOnboardingData` function
- `apps/mobile/services/__tests__/onboarding.test.ts` - 8 unit tests for the service
- `apps/mobile/services/index.ts` - Added barrel export for new service
- `apps/mobile/app/onboarding/plan.tsx` - Wired to save service with loading state, error alerts
- `apps/mobile/app/onboarding/__tests__/plan.test.tsx` - Updated with 18 tests (was 10, now covers save flow)

## Learnings
- Existing plan test file had no context mocks because it was written before useAuth/useOnboarding were used; needed full mock setup
- The mock pattern for supabase in mobile services uses a getter (`get supabase()`) for dynamic mock control
- Biome enforces import sorting: type imports before value imports, alphabetical within groups
- Pre-existing lint errors (non-null assertions) and type errors exist in other files - not from this PR

## PR
https://github.com/bilaltawfic/khepri/pull/53
