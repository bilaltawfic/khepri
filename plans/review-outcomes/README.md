# Review Outcomes

This directory contains periodic principal engineer reviews of the Khepri project.

## Purpose

Reviews assess overall project health including:
- Administrative health (tests, lint, build, SonarCloud)
- Architectural quality and best practices
- Security concerns
- Modularization and package boundaries
- Domain-driven design adherence

## File Format

Reviews are named `YYYY-MM-DD-review.md` and contain:

1. **Executive Summary** - Overall health assessment
2. **Administrative Health** - CI/CD status table
3. **Action Items** - Prioritized, actionable tasks
4. **Architectural Observations** - Key findings
5. **Positive Highlights** - What's working well
6. **Next Review Focus** - Areas for future attention

## Action Item IDs

Items are prefixed by priority:
- `CRIT-###` - Critical issues (security, breaking)
- `HIGH-###` - High priority (significant impact)
- `MED-###` - Medium priority (should address)
- `LOW-###` - Low priority (nice to have)

## Usage

Generate a review:
```
/principal-review
```

Address review items:

- `/action-review 2026-02-13` - Work through a specific review
- `/action-review CRIT-001` - Address a specific item
- `/action-review` - Work through most recent review
