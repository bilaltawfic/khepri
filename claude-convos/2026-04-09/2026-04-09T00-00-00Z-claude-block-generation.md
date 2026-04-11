# P9E-R-09: Claude-Powered Block Workout Generation

## Date
2026-04-09

## Goals
Replace the deterministic template builder in `generate-block-workouts` with a Claude Sonnet 4.6 call, mirroring the structure of `generate-season-skeleton`. Remove the template path entirely.

## Key Decisions
- Created separate modules for prompts (`prompts.ts`), Claude API client (`claude-client.ts`), and response mapping/validation (`response-mapper.ts`) to keep the handler small and testable
- Used `temperature: 0` for deterministic outputs
- Tool-use schema enforces closed enums for sport, workoutType, intensityZone, and section names
- External ID format changed from `khepri-{block_id}-w{week}-d{dayOffset}` to `khepri-{block_id}-w{week}-{date}` for clarity
- Removed `generation_tier` field entirely from request type, validation, and mobile invoke body
- Response mapper extracted to `response-mapper.ts` so tests can import without Deno-specific dependencies

## Files Changed
- `supabase/functions/generate-block-workouts/index.ts` - Replaced template builder with Claude-powered generation
- `supabase/functions/generate-block-workouts/prompts.ts` (new) - System and user prompt builders
- `supabase/functions/generate-block-workouts/claude-client.ts` (new) - Claude API client with tool-use schema
- `supabase/functions/generate-block-workouts/response-mapper.ts` (new) - Response validation and mapping to WorkoutInsert rows
- `supabase/functions/generate-block-workouts/validation.ts` - No changes needed (generation_tier was only on the type)
- `supabase/functions/generate-block-workouts/__tests__/validation.test.ts` - Removed generation_tier from test fixture
- `supabase/functions/generate-block-workouts/__tests__/prompts.test.ts` (new) - Tests for prompt builders
- `supabase/functions/generate-block-workouts/__tests__/claude-response.test.ts` (new) - Tests for response validation and mapping
- `apps/mobile/hooks/useBlockPlanning.ts` - Removed `generation_tier: 'template'` from invoke body
- `supabase/jest.config.js` - Added coverage paths for new files

## Learnings
- Deno edge function tests in this repo use Jest (not Deno test), so modules that import `serve` from Deno std can't be imported directly in tests. Extracting pure logic into separate modules that don't import Deno-specific URLs is the pattern to follow.
- The tool-use pattern (forced tool_choice) eliminates the need to parse free-form text from Claude.
