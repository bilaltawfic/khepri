# P6-A-02: Wire Calendar Tools into AI Orchestrator

**Date:** 2026-02-15
**Branch:** `feat/p6-a-02-wire-calendar-tools-orchestrator`

## Goals

- Enable the AI coach (Khepri) to create and update events on the athlete's Intervals.icu calendar
- Add `create_event` and `update_event` tool definitions to the AI orchestrator
- Update system prompt to describe write capabilities and safety guidelines

## Key Decisions

1. **Tool definitions use CalendarEvent field names** (e.g., `start_date`, `planned_duration`) matching `get_events` output, not raw Intervals.icu API names
2. **Event type enum uses lowercase values** (`workout`, `race`, `note`, `rest_day`, `travel`)
3. **Calendar Write Safety section added** to system prompt with 5 guidelines: confirm with athlete, check conflicts, respect constraints, include workout details, use correct types
4. **Guard throws used in tests** instead of non-null assertions (`!`) to satisfy Biome linting rules

## Files Changed

- `supabase/functions/ai-orchestrator/prompts.ts` - Added `create_event` and `update_event` tool definitions; updated capabilities section to "read and write"; added Calendar Write Safety guidelines
- `supabase/functions/ai-orchestrator/__tests__/prompts.test.ts` - Added TOOL_DEFINITIONS test suite (7 tests) and 2 system prompt calendar tests

## Learnings

- Pre-existing lint warnings and typecheck errors exist in `apps/mobile/` - not related to this task
- The tool-executor.ts is generic and routes any tool name to MCP gateway, so no changes needed there
- Guard throws (`if (!tool) throw new Error(...)`) are preferred over `!` non-null assertions for Biome compliance
