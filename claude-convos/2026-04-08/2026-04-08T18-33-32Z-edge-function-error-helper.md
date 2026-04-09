# Friendly Edge Function Error Messages for Block Generation

## Goal
When `generate-block-workouts` (or any other Supabase edge function) fails, the
mobile UI was showing the generic `"Edge Function returned a non-2xx status
code"` message that supabase-js wraps around `FunctionsHttpError`. This hides
the actionable detail (e.g. quota exceeded, validation error) that the function
puts in its JSON response body.

## Key Decisions
- Add a small `extractEdgeFunctionError(error, fallback)` helper in
  `apps/mobile/utils/edge-function-error.ts` rather than inlining the parsing
  in `useBlockPlanning`. Other hooks calling edge functions can reuse it.
- Read the body via `response.clone().text()` so the original `Response` is not
  consumed if a caller wants to inspect it later.
- Prefer JSON `error` then JSON `message`; fall back to raw text only if it's
  short (< 500 chars) and clearly human-readable; otherwise use the supplied
  fallback string.
- If the error's own `message` is the unhelpful `"non-2xx status code"`
  default, swap it for the fallback so the user always sees something
  actionable.

## Files Changed
- `apps/mobile/utils/edge-function-error.ts` (new) — helper.
- `apps/mobile/utils/__tests__/edge-function-error.test.ts` (new) — unit
  tests covering JSON shapes, raw text, empty body, missing context, custom
  message, non-Error inputs, 5xx fallback, whitespace, length cap, and
  clone-unavailable scenarios.
- `apps/mobile/hooks/useBlockPlanning.ts` — call the helper in the
  `generate-block-workouts` failure path before throwing.

## Learnings
- supabase-js's `FunctionsHttpError.message` is not user-facing — the body in
  `error.context` is the real signal.
- `Response` is not available in the jest-expo `web` test env, so test fixtures
  use a duck-typed object exposing `text` and `clone().text()`.
