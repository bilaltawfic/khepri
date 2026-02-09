# Phase 2 Round 1 Implementation

**Date:** 2026-02-08
**Session:** Phase 2: Core Coaching - Round 1 Tasks

## Goals

Implement three independent Phase 2 tasks in parallel:
1. **P2-A-01**: Onboarding connect screen (Intervals.icu credential inputs)
2. **P2-C-01**: Conversations schema migration
3. **P2-C-03**: Claude Edge Function scaffold

## Key Decisions

### P2-A-01: Connect Screen
- Made Athlete ID and API Key inputs editable (previously disabled placeholders)
- Implemented "both-or-neither" validation (user must provide both credentials or skip)
- Added error display with proper accessibility attributes (`accessibilityRole="alert"`)
- Both "Connect Account" and "Skip for now" navigate to fitness screen

### P2-C-01: Conversations Schema
- Created `conversations` table with athlete ownership, title, timestamps, archive flag, metadata
- Created `messages` table with role enum (user/assistant/system), content, token tracking
- Added RLS policies for athlete-only access
- Implemented trigger to auto-update `last_message_at` when messages are inserted
- Used `uuid_generate_v4()` (not `gen_random_uuid()`) to match existing migrations
- Added composite index on `(athlete_id, last_message_at DESC)` for efficient listing

### P2-C-03: AI Coach Edge Function
- JWT authentication via Supabase client
- CORS headers with explicit `Access-Control-Allow-Methods`
- Validates first message is from user (Anthropic requirement)
- Returns 405 for non-POST/OPTIONS methods
- System prompt builder with athlete context (CTL/ATL/TSB, goals, constraints, activities)
- Pinned `@supabase/supabase-js@2.49.4` for reproducible builds
- Uses nullish checks (`!= null`) not truthiness for zero-valid values (TSS, duration)
- Concatenates all text blocks from Claude response (not just first)

## Files Changed

### PR #33 - Connect Screen
- `apps/mobile/app/onboarding/connect.tsx` - Added state, validation, error handling
- `apps/mobile/app/onboarding/__tests__/connect.test.tsx` - Tests for inputs, validation, navigation

### PR #34 - Conversations Schema
- `supabase/migrations/002_conversations.sql` - New migration file

### PR #35 - AI Coach Edge Function
- `supabase/functions/ai-coach/index.ts` - HTTP handler with auth, CORS, Claude API
- `supabase/functions/ai-coach/prompts.ts` - System prompt builder

## Copilot Review Feedback Addressed

### PR #33 (1 comment)
- Added `accessibilityRole="alert"` and `accessibilityLabel` to error text

### PR #34 (5 comments)
- Added trigger for `last_message_at` auto-update
- Added composite indexes for efficient queries
- Removed redundant single-column index
- Used `uuid_generate_v4()` instead of `gen_random_uuid()`
- Removed `IF NOT EXISTS` for consistency with existing migrations

### PR #35 (7 comments)
- Added `Access-Control-Allow-Methods` to CORS headers
- Added user message validation (first message must be from user)
- Added 405 response for wrong HTTP methods
- Pinned Supabase client version
- Removed error details from client response (log server-side only)
- Changed truthiness checks to nullish checks
- Concatenate all text blocks from response

## Learnings

1. **Copilot Review Patterns**: Proactively address accessibility, nullish checks, and pinned versions to reduce review cycles
2. **Expo Router Mocking**: Import `router` directly from the mocked module, don't use external variables
3. **Supabase Migrations**: Check existing migrations for UUID function convention (`uuid_generate_v4` vs `gen_random_uuid`)
4. **Anthropic API**: First message must be from user role, and responses can have multiple text content blocks
