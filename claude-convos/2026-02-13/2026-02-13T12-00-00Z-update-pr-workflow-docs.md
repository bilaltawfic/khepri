# Update PR Workflow Documentation

**Date:** 2026-02-13
**Branch:** docs/update-pr-workflow

## Goal

Ensure CLAUDE.md clearly states that every worker must create a Pull Request when finishing implementation work.

## Key Decisions

1. Added a prominent "CRITICAL: Always Create a Pull Request" section at the top of CLAUDE.md
2. Made it explicit that tasks are NOT complete until PR is created and passing CI
3. Included the full workflow: branch → commit → log → push → PR → review

## Files Changed

- `CLAUDE.md` - Added new section with clear PR requirements

## Learnings

- Making critical workflow rules prominent (at the top of the file) ensures they aren't missed
- Explicit "task completion" criteria help ensure consistent behavior
