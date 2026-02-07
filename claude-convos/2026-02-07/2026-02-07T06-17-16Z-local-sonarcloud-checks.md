# Local SonarCloud Checks Setup

**Date:** 2026-02-07
**Goal:** Enable running SonarCloud-like checks locally to shorten feedback loops

## Context

User wanted to run SonarCloud analysis locally instead of waiting for PR CI actions.

## Research Findings

Searched SonarSource documentation and found:

1. **SonarQube for IDE (formerly SonarLint)** - Official recommendation for local analysis
   - VS Code extension with real-time feedback
   - Connected Mode syncs with SonarCloud project
   - Cannot be invoked by Claude Code (IDE extension only)

2. **sonar-scanner CLI** - Designed to upload to SonarCloud/SonarQube Server
   - No true offline mode (removed by SonarSource)
   - Replaced by SonarLint for local analysis

3. **Local SonarQube Server (Docker)** - Full local experience
   - Requires running Docker container
   - Heavier weight solution

4. **ESLint + eslint-plugin-sonarjs** - CLI-based SonarJS rules
   - Can be run by Claude Code before commits
   - Uses actual SonarSource rules
   - Lightweight, integrates with existing tooling

## Decision

Chose **Option 4 (ESLint + SonarJS plugin)** because:
- Claude Code can run it via CLI before commits
- Uses official SonarSource rules
- Lightweight - no Docker or server required
- Integrates with existing pnpm scripts

## Implementation

### Files Changed

1. **package.json** - Added dependencies and script:
   - `eslint@^9.39.2`
   - `@eslint/js@^9.39.2`
   - `eslint-plugin-sonarjs@^3.0.6`
   - `typescript-eslint@^8.54.0`
   - New script: `pnpm lint:sonar`

2. **eslint.config.js** - New ESLint flat config:
   - TypeScript + JSX parsing support
   - SonarJS recommended rules
   - Custom rules set to warning level for active development
   - Disabled rules that conflict with Biome

### Rules Configuration

Set to **warning** (not error) for active development:
- `sonarjs/cognitive-complexity` - threshold 15
- `sonarjs/no-duplicate-string` - threshold 3 occurrences
- `sonarjs/todo-tag` - TODOs expected during development
- `sonarjs/fixme-tag` - FIXMEs expected during development
- `sonarjs/no-invariant-returns` - Stub functions allowed
- `sonarjs/pseudo-random` - Math.random() fine for non-crypto

## Usage

```bash
# Run SonarJS checks locally
pnpm lint:sonar
```

---

## Phase 2: Fixing All SonarCloud Issues

User requested treating SonarCloud issues as errors (except TODOs) and fixing all current issues.

### Config Changes

Updated `eslint.config.js`:
- Changed most rules from `warn` to `error` (default)
- Only kept `sonarjs/todo-tag` and `sonarjs/fixme-tag` as `off`
- Removed per-rule warning overrides

### Issues Fixed

**8 issues total, all resolved:**

1. **pseudo-random (client.ts:286)** - Math.random() for ID generation
   - Fix: Use timestamp + counter pattern instead of Math.random()
   - Added static `idCounter` to CoachingClient class

2. **no-invariant-returns (notifications.ts:95)** - Function always returned null
   - Fix: Restructured to have conditional paths based on `isNotificationsSupported()`

3. **cognitive-complexity (safety-tools.ts:168)** - `checkTrainingReadiness` at 38
   - Fix: Extracted 7 helper functions for each metric analysis
   - `analyzeSleepDuration`, `analyzeSleepQuality`, `analyzeEnergy`, etc.

4. **cognitive-complexity (safety-tools.ts:353)** - `checkConstraintCompatibility` at 28
   - Fix: Extracted 5 helper functions
   - `checkTimeAvailability`, `checkEquipmentAccess`, `checkInjuryConstraints`, etc.

5. **cognitive-complexity (fitness-numbers.tsx:42)** - `validateForm` at 19
   - Fix: Extracted `validateIntRange`, `validatePace`, `validateFitnessForm` helpers

6. **cognitive-complexity (goal-form.tsx:151)** - `validateForm` at 19
   - Fix: Created `goalTypeValidation` map and `validateGoalForm` helper

7. **cognitive-complexity (personal-info.tsx:55)** - `validateForm` at 21
   - Fix: Added `WEIGHT_RANGES`, `HEIGHT_RANGES` constants and `validatePersonalInfoForm` helper

8. **cognitive-complexity (workout-recommendation.ts:119)** - `buildWorkoutRecommendationPrompt` at 18
   - Fix: Extracted `formatEnvironment` and `formatWorkoutOptions` helpers

### Result

```bash
pnpm lint:sonar
# No output = all checks pass
```

All 620 mobile tests pass. All 5 AI-client unit test suites pass (client.test.ts failures are pre-existing API key issues).

## Sources

- [SonarQube for IDE Connected Mode](https://docs.sonarsource.com/sonarqube-cloud/improving/connected-mode)
- [SonarScanner CLI Documentation](https://docs.sonarsource.com/sonarqube-cloud/advanced-setup/ci-based-analysis/sonarscanner-cli)
- [Sonar Community: Offline mode discussion](https://community.sonarsource.com/t/run-sonar-scanner-against-code-locally-that-has-not-been-committed/30525)
