# P9E-R-09: Claude-Powered Block Workout Generation

> Replaces the deterministic template builder in `generate-block-workouts` with a Claude Sonnet 4.6 call, mirroring the structure of `generate-season-skeleton`. The template path is removed entirely — Claude becomes the only generator.

**Depends on:**
- P9E-R-05 (enriched preferences plumbed into the edge function) ✅ merged in #167
- P9E-R-06/07/08 (week assembler min sessions + manual test cases) ✅

## Goal

Generate block workouts via Claude Sonnet 4.6 instead of the in-function template builder, so plans benefit from real coaching judgement (race-distance specificity, sport balance, day preferences, taper logic) while remaining deterministic and free of conversational fluff. Match the prompt + tool-use pattern already proven in `generate-season-skeleton`.

## Why

The current template builder ([generate-block-workouts/index.ts:255-376](../../../supabase/functions/generate-block-workouts/index.ts#L255-L376)) is rigid: it round-robins sports through a fixed `SPORT_CYCLE`, picks names from a small switch, and ignores nuance like race-distance pacing or "long ride on Friday" intent beyond the existing assembler hooks. The season skeleton has already shown that a Sonnet call constrained by a tool-use schema returns structured, deterministic JSON we can insert directly into the database.

## Files to Modify

- `supabase/functions/generate-block-workouts/index.ts` — replace `generateBlockWorkouts(request)` with `await generateBlockWorkoutsWithClaude(request)`. Remove the entire template builder (`SPORT_CYCLE`, `mapPhaseType`, `weekTargetHours`, `workoutName`, `buildTemplateStructure`, `buildMainSteps`, `buildDsl`, `generateBlockWorkouts`).
- `supabase/functions/generate-block-workouts/prompts.ts` (new) — `buildSystemPrompt()` and `buildUserPrompt(request)` modeled on [generate-season-skeleton/index.ts:200-238](../../../supabase/functions/generate-season-skeleton/index.ts#L200-L238).
- `supabase/functions/generate-block-workouts/claude-client.ts` (new) — `callClaudeForBlock(systemPrompt, userPrompt): Promise<ClaudeBlockResponse>` containing the `fetch` to `api.anthropic.com/v1/messages` and the `tool_use` extraction. Mirror the structure of the season skeleton's `callClaudeAPI` so reviewers can diff them.
- `supabase/functions/generate-block-workouts/validation.ts` — drop `generation_tier` from the request type and validation; the field is going away.
- `supabase/functions/generate-block-workouts/__tests__/index.test.ts` — replace template assertions with: (a) prompt contains sport_requirements + day_preferences + phase context, (b) parsed Claude response is mapped into `WorkoutInsert[]` with the right block_id / week_number / external_id fields, (c) errors from Claude bubble up as 502.
- `apps/mobile/hooks/useBlockPlanning.ts` — remove `generation_tier: 'template'` from the invoke body.
- `apps/mobile/hooks/__tests__/useBlockPlanning.test.ts` — drop `generation_tier` assertion.
- `packages/core/src/types/block.ts` (only if needed) — no new types expected; the workout shape is unchanged.

## Tool-Use Schema (the contract Claude must return)

Define a single tool `generate_block_workouts` with this `input_schema`. **Required everywhere** so the model cannot omit fields. Enums are closed sets — no free-form sport or workout type.

```jsonc
{
  "type": "object",
  "properties": {
    "weeks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "weekNumber": { "type": "number", "description": "1-indexed within the block" },
          "weekStartDate": { "type": "string", "description": "YYYY-MM-DD, Monday of the week" },
          "isRecoveryWeek": { "type": "boolean" },
          "workouts": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "date": { "type": "string", "description": "YYYY-MM-DD" },
                "sport": { "type": "string", "enum": ["swim", "bike", "run", "strength", "rest"] },
                "workoutType": {
                  "type": "string",
                  "enum": ["endurance", "threshold", "vo2", "tempo", "recovery", "long", "race_pace", "technique", "rest"]
                },
                "name": { "type": "string", "description": "Short label, e.g. 'Bike - Threshold 4x8'" },
                "plannedDurationMinutes": { "type": "number" },
                "intensityZone": { "type": "string", "enum": ["Z1", "Z2", "Z3", "Z4", "Z5"] },
                "structure": {
                  "type": "object",
                  "properties": {
                    "sections": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "name": { "type": "string", "enum": ["Warmup", "Main Set", "Cooldown"] },
                          "durationMinutes": { "type": "number" },
                          "steps": {
                            "type": "array",
                            "items": {
                              "type": "object",
                              "properties": {
                                "description": { "type": "string" },
                                "durationMinutes": { "type": "number" }
                              },
                              "required": ["description", "durationMinutes"]
                            }
                          }
                        },
                        "required": ["name", "durationMinutes", "steps"]
                      }
                    },
                    "totalDurationMinutes": { "type": "number" }
                  },
                  "required": ["sections", "totalDurationMinutes"]
                }
              },
              "required": ["date", "sport", "workoutType", "name", "plannedDurationMinutes", "intensityZone", "structure"]
            }
          }
        },
        "required": ["weekNumber", "weekStartDate", "isRecoveryWeek", "workouts"]
      }
    }
  },
  "required": ["weeks"]
}
```

## System Prompt (no fluff — same tone as season skeleton)

```
You are an elite endurance coach generating a structured training block.

You MUST return your answer by calling the `generate_block_workouts` tool exactly once. Do not include any conversational text.

Rules:
- Return one entry per week between start_date and end_date.
- Each week's workouts MUST sum (planned_duration_minutes) to within ±10% of the week's target hours.
- Apply a 3:1 load/recovery pattern: every 4th week is a recovery week at ~70% of base hours and contains no threshold/vo2 work.
- Honor min_sessions_per_sport from sport_requirements: each sport MUST appear at least that many times in every non-recovery week.
- Honor day_preferences when present: if a day specifies a sport (and optionally a workout label), the workout for that day MUST match.
- Skip or replace with `rest` any date listed in unavailable_dates.
- Only train on available_days from preferences. Other days have no workout entry.
- Phase type drives intensity: base = mostly Z2 endurance, build = threshold/tempo, peak = race-pace, taper = short and easy, recovery = Z1/Z2 only.
- Use the sport enum exactly. No free-form sports. No motivational text in `name`.
```

## User Prompt Shape

```
Block: {block_id}
Dates: {start_date} → {end_date} ({totalWeeks} weeks)

Phases:
- {phase.name} ({phase.weeks}w, focus={phase.focus}, target={phase.weeklyHours}h/wk)
...

Athlete preferences:
- Weekly hours: {min}–{max}
- Available days (0=Sun..6=Sat): {availableDays}
- Sport priority: {sportPriority}

Sport requirements (min sessions/week):
- swim: {min}
- bike: {min}
- run: {min}

Day preferences:
- Mon: {sport} {workoutLabel?}
...

Unavailable dates:
- {YYYY-MM-DD} {reason?}
...

Generate the block as JSON via the tool.
```

## Implementation Steps

1. **Scaffold prompts.ts and claude-client.ts** by copying the equivalent helpers out of [generate-season-skeleton/index.ts:175-330](../../../supabase/functions/generate-season-skeleton/index.ts#L175-L330) and renaming. Keep them in their own files so the handler stays small.
2. **Wire the handler** ([index.ts:445-446](../../../supabase/functions/generate-block-workouts/index.ts#L445-L446)): replace the template call with `const claudeResult = await callClaudeForBlock(buildSystemPrompt(), buildUserPrompt(request));`.
3. **Map Claude response → `WorkoutInsert[]`** in a new pure helper `mapClaudeWorkoutsToInserts(request, claudeResult)`. This is the only place that touches DB column names; it sets `block_id`, `athlete_id`, `external_id` (`khepri-${block_id}-w${weekNumber}-${date}`), `sync_status: 'pending'`, `intervals_target` derived from sport (bike→POWER, run→PACE, else AUTO).
4. **Validate the Claude payload at the boundary**: assert each week has `weeks[].workouts[].date` inside `[start_date, end_date]`, all sports are in the enum, all durations are positive integers. On failure return 502 with the truncated payload in the log (NOT in the response body — sensitive prompt content).
5. **Delete the template path entirely**: remove `generation_tier` from the request type, validation, mobile invoke body, and tests. There is no fallback.
6. **Error handling**: any `callClaudeForBlock` failure returns 502 from the handler with a generic message ("Workout generation is temporarily unavailable. Please try again."). The mobile-side `extractEdgeFunctionError` helper added in the BLOCK-02 fix already surfaces this body.
7. **Determinism**: pass `temperature: 0` in the Claude request body. Document why in a comment ("we want repeatable plans for the same inputs").
8. **Tests** (deno test, mocked fetch):
   - Prompt builder includes every relevant input (snapshot test against a fixture).
   - `mapClaudeWorkoutsToInserts` correctly assigns `external_id`, `week_number`, `intervals_target`.
   - Boundary validator rejects out-of-range dates and bad sport enums.
   - Handler returns 502 when Claude returns non-2xx.
9. **Mobile tests**: `useBlockPlanning.test.ts` no longer asserts `generation_tier`. Verify the invoke body shape unchanged otherwise.

## Testing Requirements

- Deno tests for: prompt builder, response mapper, response validator, handler error path. No real network calls — `fetch` is stubbed.
- Mobile Jest tests updated to drop `generation_tier`.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` all green.

## Verification

- `supabase functions deploy generate-block-workouts` succeeds (note: this function verifies JWT, do **not** pass `--no-verify-jwt`).
- Manual smoke test: run BLOCK-02 in the mobile app with a 70.3 race + day preferences. Confirm in Supabase logs that Claude was called once and returned a tool_use block.
- Determinism check: run the same setup twice, diff the generated workouts — should be identical.

## Out of Scope

- Tiered generation (free template / paid Claude). The template path is gone; everyone gets Claude.
- Streaming responses. The season skeleton call is non-streaming and that's fine here too.
- Re-prompting on validation failure. If Claude returns garbage, we 502 and let the user retry.
- Persisting the form so retries don't lose user input — that's [P9E-R-10](./p9e-r10-persist-block-setup.md).

## Risks

- **Cost**: each block generation is one Sonnet call. Estimate: ~3k input tokens, ~4k output tokens per block → roughly $0.07/block at current Sonnet pricing. Acceptable for the personal-use phase; revisit before public launch.
- **Latency**: expect 5–15s vs. <1s for the template path. The mobile UI already shows a "Generating workouts" loading state — no UX change needed.
- **Schema drift**: if the tool schema changes, old clients still work because the mobile side only reads the resulting workout rows from Postgres, not the Claude payload.
