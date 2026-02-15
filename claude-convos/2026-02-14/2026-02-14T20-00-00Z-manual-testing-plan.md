# Manual Testing Plan Creation

**Date**: 2026-02-14
**Task**: Create comprehensive manual testing plan for team validation

## Goals
- Create a setup guide so any team member can configure Khepri for testing
- Create a detailed CSV of test cases covering every feature for manual QA
- Assume PR #87 (seed knowledge base) is merged and complete

## Key Decisions
- Split testing plan into 2 documents: setup guide (markdown) + test cases (CSV)
- CSV includes Pass/Fail and Notes columns for testers to fill in and return
- Organized test cases by category: Auth, Onboarding, Dashboard, Check-in, Chat, Profile, Intervals.icu, AI Safety, Data Isolation, RAG, UX, E2E, Performance
- 80+ test cases covering happy paths, validation, edge cases, and integration scenarios
- Included AI safety tests (overtraining, injury awareness, sleep deprivation)
- Included data isolation tests (RLS verification between users)
- Included end-to-end lifecycle tests (goal lifecycle, injury constraint lifecycle)

## Files Changed
- `docs/testing/manual-testing-setup.md` - Setup guide with prerequisites, step-by-step instructions, troubleshooting
- `docs/testing/manual-test-cases.csv` - 80+ detailed test cases with steps and expected results

## Learnings
- Thorough exploration of all app screens and backend functions was needed to write accurate test cases
- Test cases should reference specific values and field names from the actual UI
- AI safety and data isolation testing are critical categories often missed in manual QA
