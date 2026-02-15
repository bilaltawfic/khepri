# Update Manual Testing Plan

**Date**: 2026-02-15
**Type**: Documentation Update

## Goals

Update the manual testing plan (PR #88) to comprehensively cover all features implemented since the original plan was created, plus two upcoming features (travel workout templates and ad-hoc workout screens).

## Key Decisions

1. **Kept existing test cases intact** - All original 80+ test cases preserved unchanged
2. **Added 8 new test categories** covering features built in phases 6-7:
   - Calendar (CAL-01 to CAL-07) - Event browsing, navigation, empty states
   - Training Plan (PLAN-01 to PLAN-08) - Plan display, phases, volumes, pause/cancel
   - Race Countdown (RACE-01 to RACE-05) - Readiness predictions, form status
   - Training Review (TREV-01 to TREV-07) - Form trends, recovery, weekly loads
   - Chat History (CHIST-01 to CHIST-05) - Conversation list, archive, resume
   - Push Notifications (NOTIF-01 to NOTIF-07) - Permissions, reminders, tap navigation
   - Workout Templates (WKT-01 to WKT-11) - Browse, filter, detail views for gym + travel
3. **Extended existing categories**:
   - SAFETY-07: Travel constraint awareness
   - DATA-05/06: Training plan and conversation history isolation
   - UX-11/12: Analysis and workout template navigation
   - E2E-06 to E2E-09: Training plan lifecycle, analysis journey, travel workflow, chat management
   - PERF-05/06: Analysis screen and template rendering performance
4. **Updated setup guide** with push notification testing requirements and troubleshooting

## Files Changed

- `docs/testing/manual-testing-setup.md` - Added push notification testing prerequisites, troubleshooting section, checklist item
- `docs/testing/manual-test-cases.csv` - Expanded from ~80 to ~130 test cases covering all app features
- `claude-convos/2026-02-15/2026-02-15T18-00-00Z-update-manual-testing-plan.md` - This file

## Learnings

- The original test plan was well-structured and covered auth, onboarding, dashboard, check-in, chat, profile, Intervals.icu, safety, data isolation, RAG, UX, E2E, and performance categories thoroughly
- New features added since the plan: calendar, training plans with periodization, race countdown, training block review, chat history management, push notifications, gym workout templates, and travel workout templates
- Push notification testing requires physical devices - important to call out in setup guide
- Workout template testing is simpler than other features since templates are static in-memory data (no async/API calls)
