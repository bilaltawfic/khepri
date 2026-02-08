# CI/CD Improvements and Integration Test Fixes

## Date
2026-02-08

## Goals
1. Exclude integration tests from SonarCloud coverage analysis
2. Add GitHub Action workflow to run integration tests in CI
3. Make claude-convos check fail (not just comment) when log is missing
4. Fix integration test CI failures

## Key Decisions

### SonarCloud Configuration
- Added `**/*.integration.test.ts` and `**/__tests__/integration/**` to `sonar.exclusions`
- Integration tests are meant to verify DB operations, not contribute to coverage metrics

### Integration Test Workflow
- Created `.github/workflows/integration-test.yml`
- Uses `supabase/setup-cli@v1` to install Supabase CLI
- Runs `supabase start` before tests and `supabase stop` (with `if: always()`) after
- Runs in parallel with other CI workflows (Test, SonarCloud)

### Claude Convos Check
- Changed from warning comment to failing check
- PRs with significant code changes cannot be merged without conversation log
- Comment title changed from "Reminder" to "Required"

### Jest Configuration Fix
- Created separate `jest.integration.config.js` for integration tests
- The `--testPathIgnorePatterns ''` CLI flag doesn't override config arrays
- Fixed test assertions to use numeric types (250 not '250') matching actual DB return values

## Files Changed
- `.github/workflows/sonarcloud.yml` - unchanged
- `.github/workflows/integration-test.yml` - new workflow for integration tests
- `.github/workflows/claude-convos-check.yml` - added failure step
- `sonar-project.properties` - added integration test exclusions
- `packages/supabase-client/jest.integration.config.js` - new Jest config
- `packages/supabase-client/package.json` - updated test:integration script
- `packages/supabase-client/src/__tests__/integration/*.ts` - fixed type assertions

## Learnings

### From Initial Implementation
1. Jest CLI flags don't fully override config file arrays - use separate configs
2. Supabase/PostgREST returns numeric DB columns as JavaScript numbers, not strings
3. Test order dependencies can cause cascading failures when assertions fail before IDs are captured
4. When tests push IDs to shared arrays, guard against undefined before subsequent tests use them

### From Copilot Code Review (Additional Patterns)

5. **Use error.code, not error.message for assertions**: PostgREST/Supabase error messages can change across versions. For check constraint violations, assert `error.code === '23514'` (Postgres error code) instead of `error.message.contains('check')`.

6. **Always assert setup operation success**: When creating data as setup for a test (e.g., creating a past goal to test it's excluded from upcoming goals), always assert the create succeeded. Otherwise the test may pass trivially if the insert fails silently.

7. **Avoid test flakiness from time-sensitive operations**: If a test calls `getToday()` twice (once for insert, once for assertion), it can fail across UTC midnight. Capture the date once: `const today = getToday()` and reuse it.

8. **Pin CI tool versions**: Using `version: latest` for CI tools (like Supabase CLI) makes builds non-reproducible. Pin to a specific version (e.g., `2.76.3`) and bump intentionally.

9. **Bot comment de-duplication**: When changing bot comment detection text, match both old AND new markers to avoid duplicate comments on in-flight PRs during the transition.

10. **Hardcoded keys with localhost guard**: It's acceptable to have fallback demo keys for local development if guarded by localhost-only checks. The pattern `if (isLocalSupabaseUrl) { return demoKey }` is safe and convenient for local testing while requiring env vars for non-local deployments.

11. **Guard shared array access**: When tests share IDs via arrays like `createdGoalIds`, add explicit guards: `if (!goalId) throw new Error('Expected goalId...')` to get clear error messages rather than confusing undefined access errors.
