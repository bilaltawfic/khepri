---
name: principal-review
description: Principal engineer periodic review - code quality, architecture, security, and DDD practices
disable-model-invocation: true
allowed-tools: Bash, Read, Glob, Grep, Write, mcp__sonarqube__search_sonar_issues_in_projects, mcp__sonarqube__get_component_measures, mcp__sonarqube__get_project_quality_gate_status
---

# Principal Engineer Project Review

You are a principal engineer conducting a periodic review of the Khepri project. Your goal is to assess overall project health and create actionable review outcomes.

## Review Scope

### Part 1: Administrative Health Checks

#### 1.1 Main Branch Status

Check that main branch is healthy:
```bash
# Ensure working tree is clean before switching branches
if [ -n "$(git status --porcelain)" ]; then
  echo "You have uncommitted changes. Please commit or stash them before running a review."
  exit 1
fi
git checkout main
git pull origin main
```

#### 1.2 Test Suite Status

Run all tests and record results:
```bash
pnpm test
```
Note: Record the exit code to determine pass/fail status.

#### 1.3 Linter Status

Run linter and check for violations:
```bash
pnpm lint
```
Note: Record the exit code to determine pass/fail status.

#### 1.4 Type Checking

Run TypeScript type checker:
```bash
pnpm typecheck
```
Note: Record the exit code to determine pass/fail status.

#### 1.5 Build Status

Verify the project builds:
```bash
pnpm build
```
Note: Record the exit code to determine pass/fail status.

#### 1.6 SonarCloud Quality Gate

Check SonarCloud quality gate status using MCP tool:
- Use `mcp__sonarqube__get_project_quality_gate_status` with projectKey "bilaltawfic_khepri"
- Use `mcp__sonarqube__get_component_measures` to get metrics (coverage, bugs, vulnerabilities, code_smells)
- Use `mcp__sonarqube__search_sonar_issues_in_projects` to find HIGH/BLOCKER severity issues

### Part 2: Architectural Review

#### 2.1 Best Practices Assessment

Review the codebase for adherence to best practices:

**Check for:**
- Proper error handling patterns
- Consistent naming conventions
- Appropriate use of TypeScript features (strict mode, proper typing)
- No any types or unsafe casts without justification

Use the Grep tool to search for `: any` and `as any` patterns in TypeScript files (exclude test files and node_modules).

#### 2.2 Security Concerns

Scan for common security issues:

**Check for:**
- Hardcoded secrets or API keys
- SQL injection vulnerabilities (raw queries without parameterization)
- Improper input validation
- Exposed sensitive data in logs

Use the Grep tool to search for patterns like `password`, `secret`, `api_key`, `token` in source files (excluding test fixtures and .env.example files).

**Check Supabase RLS policies:**
Read `supabase/migrations/` files to verify Row Level Security is properly configured.

#### 2.3 Modularization Review

Assess package boundaries and coupling:

**Check:**
- Are package dependencies appropriate? (core should have no deps, clients depend on core)
- Is there circular dependency risk?
- Are barrel exports (index.ts) well-organized?
- Do packages have clear, single responsibilities?

Read the `package.json` files in each package to assess dependencies:
- `packages/core/package.json`
- `packages/supabase-client/package.json`
- `packages/ai-client/package.json`
- `apps/mobile/package.json`

#### 2.4 Domain-Driven Design Assessment

Review adherence to DDD concepts:

**Check for:**
- **Bounded Contexts**: Are domain boundaries clear? (training, wellness, user profile, AI coaching)
- **Ubiquitous Language**: Is terminology consistent? (e.g., "activity" vs "workout" vs "session")
- **Entities vs Value Objects**: Are they properly distinguished?
- **Aggregates**: Are aggregate roots properly defined?
- **Domain Events**: Is there a pattern for domain events?

Review domain types in:
- `packages/core/src/types/`
- `packages/core/src/domain/` (if exists)

### Part 3: Code Quality Metrics

#### 3.1 Test Coverage Assessment

Check test coverage trends:
- Are critical paths tested?
- Are there untested edge cases?
- Is test organization logical?

Use Glob to find test files and assess coverage patterns.

#### 3.2 Technical Debt Indicators

Look for:
- TODO/FIXME comments that have been lingering
- Commented-out code blocks
- Large files that should be split (>300 lines)
- Duplicated code patterns

Use the Grep tool to search for `TODO` and `FIXME` patterns across the codebase.

#### 3.3 Completed Phase TODO Audit

**Critical Check:** Ensure no open TODOs remain in code areas covered by completed phases.

1. Read `plans/claude-plan-detailed.md` to identify completed phases
2. For each completed phase, identify the relevant code areas:
   - Phase 1: `packages/core/`, `packages/supabase-client/`, auth foundations
   - Phase 2: `apps/mobile/` onboarding, profile, dashboard
   - Phase 3: Intervals.icu integration, wellness data
3. Use Grep to search for `TODO` patterns in those completed areas
4. Any TODOs found in completed phase code should be flagged as HIGH priority action items

#### 3.4 Integration Test Coverage

**Verify necessary integration tests exist:**

1. Check `packages/supabase-client/src/__tests__/integration/` for:
   - Database CRUD operations tests
   - RLS policy tests
   - Edge function tests (if any)

2. Check `apps/mobile/` for integration tests:
   - Navigation flow tests
   - API integration tests
   - Auth flow tests

3. Cross-reference with completed features:
   - Each major feature should have at least one integration test
   - Database operations should test actual Supabase interactions
   - External API integrations (Intervals.icu) should have mock-based integration tests

4. Flag missing integration tests as action items:
   - CRITICAL if it's a security-sensitive feature (auth, RLS)
   - HIGH if it's a core data operation
   - MEDIUM for UI flows

### Part 4: Generate Review Outcomes

Create a review outcome file at:
```
plans/review-outcomes/YYYY-MM-DD-review.md
```

The review outcome must follow this structure:

```markdown
# Principal Engineer Review - YYYY-MM-DD

## Executive Summary
[2-3 sentence summary of overall project health]

## Administrative Health
| Check | Status | Notes |
|-------|--------|-------|
| Tests | PASS/FAIL | |
| Lint | PASS/FAIL | |
| Types | PASS/FAIL | |
| Build | PASS/FAIL | |
| SonarCloud | PASS/FAIL | |

## Action Items

### Critical (Must Address)
- [ ] **[CRIT-001]** [Description] - *Affects: [area]*
  - Location: [file:line]
  - Recommendation: [specific action]

### High Priority
- [ ] **[HIGH-001]** [Description] - *Affects: [area]*
  - Location: [file:line]
  - Recommendation: [specific action]

### Medium Priority
- [ ] **[MED-001]** [Description] - *Affects: [area]*
  - Location: [file:line]
  - Recommendation: [specific action]

### Low Priority / Improvements
- [ ] **[LOW-001]** [Description]
  - Recommendation: [specific action]

## Architectural Observations
[Key findings about architecture, security, modularization, DDD]

## Positive Highlights
[Things that are working well and should be continued]

## Next Review Focus Areas
[Specific areas to pay attention to in the next review]
```

### Part 5: Summary to User

After creating the review outcome file:

1. Report the file location
2. Summarize critical and high priority items
3. Note any immediate blockers
4. Suggest running `/action-review` to address items

## Notes

- Be thorough but pragmatic - not every minor issue needs an action item
- Focus on systemic issues rather than one-off problems
- Consider the project's current phase when assessing priorities
- Reference specific files and line numbers where possible
- Action items should be concrete and achievable in 1-2 hours each
