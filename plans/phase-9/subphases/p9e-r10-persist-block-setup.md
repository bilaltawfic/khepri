# P9E-R-10: Persist Block Setup Across Errors and App Restarts

> When workout generation fails (network blip, Claude 502, validation error) the user currently loses every value they typed into the block setup screen. This subphase persists the in-progress `BlockSetupData` so a retry — even after backgrounding the app or hitting an error — restores the form exactly as it was.

**Depends on:**
- P9E-R-05 (BlockSetupData shape stable) ✅
- P9E-R-09 (Claude generation) — not strictly required, but the value of this work goes way up once generation calls are slower and can fail upstream.

## Goal

Treat the block setup form as a **draft** owned by the active season. The draft is written to local storage (and optionally Postgres) on every meaningful field change, restored on mount, and only cleared once the block is successfully locked in (or the user explicitly discards it).

## Why

Today, [useBlockPlanning.ts:372-376](../../../apps/mobile/hooks/useBlockPlanning.ts#L372-L376) catches the generation error and resets to the `setup` step — but `BlockSetupData` lives in component state, so any unmount (navigating away, killing the app, even some hot reloads) wipes it. With Claude generation about to take 5–15 seconds and occasionally fail, asking a user to re-enter hours, day preferences, and unavailable date ranges is unacceptable.

## Files to Modify

- `apps/mobile/hooks/useBlockPlanning.ts` — load any persisted draft on mount, write to storage on every `updateSetup` call, clear it once `lockBlock` succeeds.
- `apps/mobile/utils/block-setup-storage.ts` (new) — `loadBlockSetupDraft(seasonId)`, `saveBlockSetupDraft(seasonId, data)`, `clearBlockSetupDraft(seasonId)`. Backed by `AsyncStorage` with key `khepri:block-setup-draft:${seasonId}`.
- `apps/mobile/utils/__tests__/block-setup-storage.test.ts` (new) — round-trip + namespacing tests with a mocked AsyncStorage.
- `apps/mobile/hooks/__tests__/useBlockPlanning.test.ts` — add tests: (a) draft is restored on mount, (b) draft is written when setup fields change, (c) draft is cleared after a successful lock-in, (d) draft is **not** cleared when generation fails (so the user can retry).
- `apps/mobile/app/block/setup.tsx` (or wherever the setup screen lives) — surface a small "Restored from your last session" banner when a draft was loaded, with a "Start over" button that calls `clearBlockSetupDraft`.

## Implementation Steps

1. **Storage helper**: thin wrapper around `@react-native-async-storage/async-storage`. Serialize with `JSON.stringify`. On read, validate the parsed shape against a small type guard before returning — never trust storage. If the schema is invalid, clear the key and return `null`.
2. **Schema versioning**: store as `{ version: 1, data: BlockSetupData }`. The loader returns `null` for any unknown version. When `BlockSetupData` changes structurally in the future, bump the version and silently discard old drafts.
3. **Hook integration**:
   - On mount (or when `season.id` becomes available), call `loadBlockSetupDraft(season.id)`. If non-null, hydrate `setupData` state with it and surface a `wasDraftRestored: boolean` flag.
   - In `updateSetup` (the existing setter), after applying the change call `saveBlockSetupDraft(season.id, nextData)`. Debounce by 300ms to avoid hammering AsyncStorage on every keystroke.
   - In the success path of `lockInBlock` (after `lockBlock` resolves), call `clearBlockSetupDraft(season.id)`.
   - In the **failure** path of `generateWorkouts`, leave the draft in place. Add a comment explaining this is intentional.
4. **Discard UI**: in the setup screen, when `wasDraftRestored` is true, render a dismissible banner: "Picking up where you left off. [Start over]". The button clears storage and resets in-memory state.
5. **Namespacing by season**: a user could in theory have one draft per season. Key includes `seasonId` to avoid one season's draft polluting another. On season change (rare, but possible after season setup), the loader returns the right draft or `null`.
6. **Sensitive data**: `BlockSetupData` contains hours, dates, and sport preferences — nothing PII, nothing secret. Plain AsyncStorage is fine; no need for SecureStore.
7. **Edge case — block already exists**: if the user has a draft *and* the season already has a non-locked block (mid-flight from a previous session), prefer the existing block's state and clear the draft. Drafts only matter when no block row exists yet.

## Optional: server-side draft (deferred)

For now, AsyncStorage is enough — drafts only need to survive errors and app restarts on the same device. A future subphase could mirror the draft into a `block_setup_drafts` table keyed by `(athlete_id, season_id)` so it survives reinstall and crosses devices. **Not in scope here** — note it in `plans/future-improvements.md` instead.

## Testing Requirements

- Storage helper unit tests: save→load round-trip, version mismatch returns null, malformed JSON returns null and clears key, distinct seasons don't collide.
- Hook tests (mocked AsyncStorage):
  - Mount with no draft → `wasDraftRestored` is false, `setupData` is the default.
  - Mount with a draft → `wasDraftRestored` is true, `setupData` matches the draft.
  - `updateSetup` triggers a debounced write (use fake timers).
  - Successful lock-in clears the draft.
  - Failed generation does NOT clear the draft.
- Screen test (light): banner renders only when `wasDraftRestored` is true; tapping "Start over" clears storage and hides the banner.
- `pnpm typecheck`, `pnpm test`, `pnpm lint` all green.

## Verification

- Manual: fill the block setup form, force a generation failure (e.g. kill the network), confirm fields are still populated. Background the app, reopen, confirm fields are still populated. Lock in successfully, confirm a fresh visit to the setup screen starts blank.

## Out of Scope

- Server-side draft mirroring (note in `plans/future-improvements.md`).
- Persisting *any other* multi-step form (season setup, onboarding). Same pattern can be lifted later if useful, but this subphase is scoped to block setup.
- Conflict resolution between a draft and a partially-created `block` row beyond the simple "block wins" rule above.

## Risks

- **AsyncStorage size**: `BlockSetupData` is well under 10KB. No risk.
- **Stale drafts**: a user could come back weeks later to a draft that no longer matches the current season skeleton. Mitigation: include `season.updated_at` in the stored draft and discard if the season has changed since.
