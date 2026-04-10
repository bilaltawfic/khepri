# P9E-R-11: Tighten Determinism in `generate-season-skeleton`

> The season skeleton edge function uses Claude Sonnet 4.6 with a forced tool-use call, but it leaves several determinism levers on the table: no `temperature: 0`, unsorted prompt inputs, free-form fields in the schema, and no boundary validator on the response. This subphase brings it up to the same bar that [p9e-r09](./p9e-r09-claude-block-generation.md) sets for block generation.

**Depends on:** none (independent of p9e-r09 / p9e-r10, but should land before any user-facing season generation in production).

## Goal

Make `generate-season-skeleton` produce repeatable, schema-validated output for the same logical input. After this subphase, running the same season setup twice should yield byte-identical phase lists (modulo `currentDate`, which is intentionally part of the input).

## Why

The season skeleton is the foundation every block builds on. If a user re-runs season generation and gets meaningfully different phases, every downstream block changes too — that's a terrible UX and impossible to support. We've also shipped no validation: a Claude response that violates "no gaps between phases" or "weeks sum to totalWeeks" gets silently inserted into the DB.

See the audit in the conversation that produced this plan; the season builder currently misses points 1, 3 (partially), 5 (partially), 6, and 9 of the determinism checklist used for [p9e-r09](./p9e-r09-claude-block-generation.md).

## Files to Modify

- `supabase/functions/generate-season-skeleton/index.ts` — add `temperature: 0`, tighten the system prompt, sort prompt inputs, add a response validator, return 502 on validation failure.
- `supabase/functions/generate-season-skeleton/__tests__/index.test.ts` (create if missing) — tests for prompt stability, response validation, and the failure path.
- `supabase/functions/generate-season-skeleton/prompts.ts` (new, optional) — extract `buildSystemPrompt` and `buildUserPrompt` so they're easier to test and snapshot.
- `supabase/functions/generate-season-skeleton/validation.ts` (new) — `validateSkeletonResponse(input, claudeOutput)` returning a list of errors.

## Implementation Steps

1. **Add `temperature: 0`** to the Claude request body in `callClaudeAPI` ([generate-season-skeleton/index.ts:253-311](../../../supabase/functions/generate-season-skeleton/index.ts#L253-L311)). One-line change. Add a comment: `// Determinism: same input → same skeleton. Do not change without a paired test update.`
2. **Sort prompt inputs canonically** in `buildUserPrompt`:
   - Races: sort by `(date ASC, name ASC)`.
   - Goals: sort by `(goalType ASC, title ASC)`.
   - Sport priority: leave as-is (it's already user-ordered and meaningful).
   - Do the sort in the prompt builder, not at the call site, so it's centralized and tested.
3. **Tighten the system prompt** ([generate-season-skeleton/index.ts:162-205](../../../supabase/functions/generate-season-skeleton/index.ts#L162-L205)):
   - Add a leading line: `You MUST return your answer by calling the generate_skeleton tool exactly once. Do not include any conversational text.`
   - Remove the embedded JSON example block (the tool schema already enforces shape; the example just invites the model to paraphrase).
   - Keep the periodization principles and constraints — those are real coaching rules and worth the tokens.
4. **Tighten the tool schema** ([generate-season-skeleton/index.ts:262-307](../../../supabase/functions/generate-season-skeleton/index.ts#L262-L307)):
   - Mark `feasibilityNotes` items with `maxLength: 200` to prevent essay-style notes.
   - Add `minimum: 1` to `weeks` and `targetHoursPerWeek`.
   - Add `pattern: "^\\d{4}-\\d{2}-\\d{2}$"` to `startDate` / `endDate`.
   - `name` and `focus` stay as free-form strings — they're descriptive labels and locking them down would hurt quality. Determinism here comes from `temperature: 0` + stable input order.
5. **Add response validator** in a new `validation.ts`:
   - Every phase's `weeks` is a positive integer.
   - Sum of all phase `weeks` equals `totalWeeks`.
   - Phases are date-contiguous: `phases[i].endDate + 1 day === phases[i+1].startDate`.
   - First phase `startDate >= request.currentDate` and last phase `endDate <= seasonEnd`.
   - Every phase `targetHoursPerWeek` is within `[preferences.weeklyHoursMin, preferences.weeklyHoursMax]`.
   - Every phase `type` is in the enum (already enforced by tool schema, but defense in depth is cheap).
   Return `string[]` of errors; empty array means valid.
6. **Wire validator into the handler**: after `callClaudeAPI` returns, call `validateSkeletonResponse(request, output)`. On any errors, return 502 with a generic message (`"Season generation produced an invalid plan. Please try again."`) and log the full error list + raw Claude payload to the function logs (NOT to the response body).
7. **Tests** (deno test, mocked fetch):
   - Prompt builder snapshot: given a fixture with races in DB-order, the serialized prompt sorts them.
   - Validator: handcrafted Claude responses for each failure mode (gap between phases, week count mismatch, hours out of range, invalid date format).
   - Handler: returns 502 when validator fails; returns 200 + inserts when it passes.
   - `temperature: 0` is present in the outgoing fetch body (assert via the mock).

## Testing Requirements

- Deno tests pass for prompt builder, validator, and handler error path.
- Existing season skeleton callers in mobile / mcp-gateway are unaffected — the request and response shapes are unchanged.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` all green.

## Verification

- `supabase functions deploy generate-season-skeleton` succeeds.
- Manual: generate a season twice with identical inputs (same races, same preferences, same `currentDate` — patch the mobile call to pass a fixed date for the test). Diff the two responses — phases should match exactly.
- Manual: temporarily make Claude return a payload with a 1-week gap between phases (mock or Anthropic console). Confirm the handler returns 502 and the function log shows the validator errors.

## Out of Scope

- Caching by input hash (note in `plans/future-improvements.md` alongside the equivalent note from p9e-r09).
- Re-prompting on validation failure. Same as block generation: fail loud, let the user retry.
- Changing the season skeleton DB shape or the mobile UI. This is purely a quality + reproducibility upgrade to the existing edge function.
- Touching `generate-block-workouts` — that's [p9e-r09](./p9e-r09-claude-block-generation.md).

## Risks

- **Quality regression from removing the JSON example**: the example block in the system prompt may be doing more work than the tool schema alone. Mitigation: snapshot a few real generations before and after the change; if quality drops, restore a *minimal* example that lists field names only (no sample values).
- **Validator false positives**: contiguity checks across UTC date boundaries can be tricky. Use the same date-arithmetic helpers used in the block builder, and unit-test the edge cases (Feb 28 → Mar 1, year boundaries, leap years).
- **Existing seasons in the DB**: this subphase only changes generation, not stored data. Already-generated seasons are unaffected.
