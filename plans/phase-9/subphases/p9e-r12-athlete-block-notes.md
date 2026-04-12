# P9E-R12: Athlete Block Notes

## Goal

Allow athletes to provide free-text context (up to 250 characters) during block setup that the AI agent considers when generating workouts. Examples: "2 weeks into a 4-week base block already", "focusing on bike strength after knee injury", "hilly A-race course, need climbing work".

If the notes contain nothing training-relevant, the agent ignores them.

## Why

The current block planning flow collects structured data (hours, sport requirements, day preferences, unavailable dates) but has no way for athletes to communicate situational context. Real training decisions depend on nuances — prior training load, injuries, race-course demands — that structured fields can't capture. A short free-text field bridges this gap cheaply.

## Files to Modify

| File | Change |
|------|--------|
| `supabase/migrations/015_block_notes.sql` | **New** — add `block_notes` column to `race_blocks` |
| `packages/core/src/types/block.ts` | Add `blockNotes` to `RaceBlock` type |
| `apps/mobile/app/plan/block-setup.tsx` | Add `TextInput` for block notes (250 char limit) |
| `apps/mobile/app/plan/__tests__/block-setup.test.tsx` | Test rendering, character limit, value passed through |
| `apps/mobile/hooks/useBlockPlanning.ts` | Accept `blockNotes`, persist to `race_blocks`, pass to edge function |
| `apps/mobile/hooks/__tests__/useBlockPlanning.test.ts` | Test `block_notes` in insert and edge function payload |
| `supabase/functions/generate-block-workouts/index.ts` | Add `block_notes` to `GenerateRequest`, pass to prompt builder |
| `supabase/functions/generate-block-workouts/validation.ts` | Validate `block_notes`: optional string, max 250 chars |
| `supabase/functions/generate-block-workouts/__tests__/validation.test.ts` | Test absent, null, valid, and over-limit `block_notes` |
| `supabase/functions/generate-block-workouts/prompts.ts` | Include block notes in user prompt (when P9E-R09 is implemented) |

## Implementation Steps

### Step 1 — Database Migration

Create `supabase/migrations/015_block_notes.sql`:

```sql
ALTER TABLE race_blocks
  ADD COLUMN block_notes TEXT
  CONSTRAINT block_notes_length CHECK (char_length(block_notes) <= 250);

COMMENT ON COLUMN race_blocks.block_notes IS
  'Free-text athlete context for AI block generation (max 250 chars)';
```

- Nullable — most blocks won't have notes
- `CHECK` constraint enforces the 250-character limit at the DB level

### Step 2 — Core Types

In `packages/core/src/types/block.ts`, add to the `RaceBlock` interface:

```typescript
readonly blockNotes?: string;
```

### Step 3 — Mobile UI (block-setup.tsx)

Add a "Block Notes" section to the block setup screen, below the existing unavailable dates section:

- `TextInput` with `maxLength={250}`, `multiline`, `numberOfLines={3}`
- Character counter: `${blockNotes.length}/250`
- Placeholder: `"Optional — e.g., 'Returning from injury, keep run volume low'"`
- Label: **"Block Notes"**
- Store in component state: `const [blockNotes, setBlockNotes] = useState('')`
- Pass to `generateWorkouts({ ..., blockNotes })`

### Step 4 — Hook (useBlockPlanning.ts)

Update `generateWorkouts()`:

1. Accept `blockNotes?: string` parameter
2. Normalize once before persistence/invoke: `const normalizedNotes = blockNotes?.trim() || undefined`
3. Include in the `race_blocks` insert: `block_notes: normalizedNotes ?? null`
4. Include in the edge function invoke body: `block_notes: normalizedNotes`

This ensures `''` and whitespace-only input are treated as "no notes" and are not stored or sent to the edge function.

### Step 5 — Edge Function Validation (validation.ts)

Add to `validateGenerateRequest()`:

```typescript
if (body.block_notes != null) {
  if (typeof body.block_notes !== 'string') {
    errors.push('block_notes must be a string');
  } else if (body.block_notes.length > 250) {
    errors.push('block_notes must be 250 characters or fewer');
  }
}
```

### Step 6 — Edge Function Handler (index.ts)

1. Add `block_notes?: string` to `GenerateRequest` interface
2. Pass `block_notes` through to the generation function (currently template builder ignores it; Claude path in R09 will use it)

### Step 7 — Prompt Integration (prompts.ts)

Update the existing `buildUserPrompt()` in `supabase/functions/generate-block-workouts/prompts.ts` to include block notes conditionally:

```typescript
if (request.block_notes) {
  sections.push(`## Athlete Notes\n${request.block_notes}`);
}
```

Update `buildSystemPrompt()` to instruct the agent: "If Athlete Notes are present, factor them into workout selection and intensity. If the notes contain nothing training-relevant, ignore them."

Update `supabase/functions/generate-block-workouts/__tests__/prompts.test.ts` to verify:
- Block notes appear in user prompt when provided
- Block notes section is omitted when not provided

## Testing Requirements

### block-setup.test.tsx
- Renders block notes input with placeholder text
- Enforces 250-character max length
- Passes `blockNotes` value to `generateWorkouts()`
- Empty string is treated as no notes (not sent)

### useBlockPlanning.test.ts
- `block_notes` included in `race_blocks` insert when provided
- `block_notes` included in edge function invoke body when provided
- `block_notes` omitted from both when not provided

### validation.test.ts
- Absent `block_notes` — valid
- `null` `block_notes` — valid
- String under 250 chars — valid
- String at exactly 250 chars — valid
- String over 250 chars — error
- Non-string `block_notes` (e.g., number) — error

## Verification

1. `pnpm test` — all existing + new tests pass
2. `pnpm lint` — no Biome violations
3. `pnpm typecheck` — no type errors
4. Manual: open block setup, enter notes, generate block, confirm `block_notes` stored in `race_blocks` row

## Out of Scope

- Editing block notes after generation (block is locked at that point)
- Displaying block notes on the review screen (could be a follow-up)
- Using block notes in the template generator (only relevant for Claude path)
- Surfacing block notes in compliance tracking or coach adaptations

## Risks

| Risk | Mitigation |
|------|------------|
| Prompt injection via block notes | Notes are inserted as data in a structured prompt section, not as instructions. The 250-char limit further constrains attack surface. System prompt anchoring ("you are a coach") provides additional resistance. |
| Users expect notes to always affect output | Template generator ignores notes. When Claude path ships (R09), add a UI hint: "Considered by AI when generating your plan." Until then, placeholder text should set expectations. |
| Notes column bloats race_blocks | 250 chars max, nullable, TEXT type — negligible storage impact. |
