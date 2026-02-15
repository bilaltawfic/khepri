# Phase 7.5: Manual Testing & Bug Fixes

## Overview

This phase systematically executes all manual test cases defined in `docs/testing/manual-test-cases.csv` against the running application. Each category is tested as a standalone subphase. Failures are fixed immediately and committed individually, with one PR per category.

## Process

1. **Test Engineer** runs `/test-engineer <CATEGORY>` for each category
2. Test cases are presented to the user one at a time
3. User reports Pass/Fail for each test
4. Failures are investigated, fixed, and re-verified immediately
5. Each fix is a separate commit with the test ID in the commit message
6. A fix PR is created per category (if any failures were found)
7. All PRs must pass CI checks, SonarCloud, and Copilot review

## Categories (20 subphases)

Each category below corresponds to one testing session. They should be executed roughly in dependency order (foundational features first, end-to-end last).

### Group 1: Foundation (test first — other categories depend on these)

| Subphase | Category | Test Cases | Description |
|----------|----------|------------|-------------|
| P7.5-01 | AUTH | 11 | Authentication: signup, login, session, protected routes |
| P7.5-02 | OB | 18 | Onboarding: welcome, Intervals.icu connect, fitness numbers, goals, plan |

### Group 2: Core Daily Workflow

| Subphase | Category | Test Cases | Description |
|----------|----------|------------|-------------|
| P7.5-03 | DASH | 9 | Dashboard: cards, training load, activities, events, refresh |
| P7.5-04 | CI | 11 | Daily check-in: form, AI recommendation, history, prefill |

### Group 3: Training Features

| Subphase | Category | Test Cases | Description |
|----------|----------|------------|-------------|
| P7.5-05 | CAL | 7 | Calendar: events, navigation, empty state, refresh |
| P7.5-06 | PLAN | 8 | Training plan: view, phases, volume chart, pause/cancel |

### Group 4: Analysis & Insights

| Subphase | Category | Test Cases | Description |
|----------|----------|------------|-------------|
| P7.5-07 | RACE | 5 | Race countdown: predictions, readiness, empty state |
| P7.5-08 | TREV | 7 | Training review: form status, metrics, recovery, trends |

### Group 5: AI & Chat

| Subphase | Category | Test Cases | Description |
|----------|----------|------------|-------------|
| P7.5-09 | CHIST | 5 | Chat history: list, resume, archive, empty state |
| P7.5-10 | CHAT | 12 | AI coach: welcome, prompts, conversations, error handling |

### Group 6: Profile & Settings

| Subphase | Category | Test Cases | Description |
|----------|----------|------------|-------------|
| P7.5-11 | PROF | 19 | Profile: personal info, fitness numbers, goals, constraints |

### Group 7: Integrations & Templates

| Subphase | Category | Test Cases | Description |
|----------|----------|------------|-------------|
| P7.5-12 | WKT | 11 | Workout templates: browse, filter, detail, accessibility |
| P7.5-13 | INT | 6 | Intervals.icu: connect, disconnect, validation, data flow |

### Group 8: Safety & Security

| Subphase | Category | Test Cases | Description |
|----------|----------|------------|-------------|
| P7.5-14 | SAFETY | 7 | AI safety: overtraining, injury-aware, sleep, stress |
| P7.5-15 | DATA | 6 | Data isolation: RLS, cross-user data visibility |

### Group 9: Advanced Features

| Subphase | Category | Test Cases | Description |
|----------|----------|------------|-------------|
| P7.5-16 | RAG | 4 | Knowledge base: RAG-grounded responses, accuracy |
| P7.5-17 | NOTIF | 7 | Push notifications: permissions, reminders, channels |

### Group 10: Quality & Polish

| Subphase | Category | Test Cases | Description |
|----------|----------|------------|-------------|
| P7.5-18 | UX | 12 | User experience: keyboard, loading, errors, navigation, dark mode |
| P7.5-19 | PERF | 6 | Performance: load times, response times, rendering |

### Group 11: Full Journey

| Subphase | Category | Test Cases | Description |
|----------|----------|------------|-------------|
| P7.5-20 | E2E | 9 | End-to-end: full user journeys, lifecycle tests |

## Test Environment Prerequisites

Before starting any testing session, ensure:

- [ ] Local Supabase running (`supabase start`)
- [ ] `.env` configured with required keys
- [ ] Edge function secrets configured (`supabase/functions/.env`)
- [ ] `pnpm build` completed
- [ ] `pnpm test` all passing
- [ ] Expo dev server running (`pnpm dev`)
- [ ] At least one test user account available
- [ ] (For INT/DASH/CAL/TREV/RACE) Intervals.icu account with API credentials
- [ ] (For RAG) Knowledge base seeded (`cd supabase && pnpm seed:knowledge`)
- [ ] (For NOTIF) Physical device available

## Tracking Progress

Progress is tracked in `plans/claude-plan-detailed.md` under the Phase 7.5 section. Each subphase is marked with:
- ⬜ Not started
- 🔄 In progress
- ✅ Complete (all tests pass, fix PR merged if applicable)

## Output

Each completed category produces:
1. **Conversation log**: `claude-convos/YYYY-MM-DD/YYYY-MM-DDTHH-MM-SSZ-test-<category>.md`
2. **Fix PR** (if failures found): `fix/p7.5-test-<category>` branch with individual fix commits
3. **Test summary**: Included in conversation log and PR description
