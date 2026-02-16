# Phase 7.5 Manual Testing Groundwork

**Date:** 2026-02-15

## Goals

- Create a new Phase 7.5 (Manual Testing & Bug Fixes) inserted before Phase 8
- Create a `/test-engineer` skill for running manual test cases interactively
- Plan 20 subphases covering all test categories from `docs/testing/manual-test-cases.csv`
- Set up the infrastructure so testing sessions can begin immediately

## Key Decisions

1. **One category per subphase** - Each of the 20 test categories (AUTH, OB, DASH, etc.) gets its own testing session and fix PR, keeping changes focused and reviewable
2. **Dependency-ordered groups** - Categories are organized into 11 groups, with foundation tests (AUTH, OB) first and end-to-end tests (E2E) last
3. **Test-engineer skill design** - Modeled after the worker-go skill but without a plan file. Instead, it reads test cases from the CSV, prompts the user interactively, and fixes failures on the spot
4. **One commit per fix** - Each bug fix gets its own commit with the test ID in the message, making it easy to trace fixes back to specific test failures
5. **472 test cases across 20 categories** - Comprehensive coverage of all implemented features

## Files Changed

- `.claude/skills/test-engineer/SKILL.md` - New skill for interactive manual testing sessions
- `plans/phase-7.5/README.md` - Phase overview with all 20 subphases, prerequisites, and tracking
- `plans/claude-plan-detailed.md` - Updated to include Phase 7.5 section with all subphases and updated dependency graph

## Learnings

1. The test cases CSV has 472 cases across 20 categories — a thorough test suite
2. Categories range from 4 cases (RAG) to 19 cases (PROF), so session length will vary
3. Some categories require special setup (physical device for NOTIF, Intervals.icu account for INT/CAL/TREV/RACE, seeded knowledge base for RAG)
4. The test-engineer skill uses AskUserQuestion for interactive pass/fail reporting, which the worker skill doesn't need
