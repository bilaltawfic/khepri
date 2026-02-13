---
name: plan-next
description: Analyze project status and create branches with plans for next parallel tasks
disable-model-invocation: true
allowed-tools: Read, Glob, Grep, Bash, Write
---

# Plan Next Parallel Tasks

Analyze current project status and create feature branches with detailed plans for tasks that can run in parallel.

## Steps

### 0. Clean Up Git State (REQUIRED)

Before planning new tasks, run the `/cleanup-branches` skill to clean up merged branches.

This ensures we start from a clean state with no stale local branches. Using the `/cleanup-branches` skill keeps cleanup behavior consistent across skills.

### 1. Analyze Current State

Read the main plan files to understand current progress:
- `plans/claude-plan-detailed.md` - Overall task tracker
- `plans/phase-{N}/` - Current phase details

Identify which tasks are:
- Completed (marked with checkmarks or PR numbers)
- In Progress (has a branch or PR open)
- Ready to Start (dependencies met, not started)

### 2. Identify Parallel Tasks

From the ready tasks, identify which can run in parallel (no dependencies on each other).
Typically 2-3 tasks at a time is manageable.

### 3. For Each Parallel Task

Create a feature branch following the naming convention:
```bash
git checkout main
git checkout -b feat/p{phase}-{workstream}-{task}-{short-description}
```

Create a detailed plan file in `plans/phase-{N}/subphases/`:
```
plans/phase-{N}/subphases/p{phase}-{workstream}-{task}-{description}.md
```

The plan should include:
- **Goal**: What this task accomplishes
- **Files to Create/Modify**: Exact paths
- **Implementation Steps**: Numbered, specific actions
- **Code Patterns**: Example code snippets from the plan
- **Testing Requirements**: What tests to write
- **Verification**: How to confirm task is complete

Commit the plan to the branch:
```bash
git add plans/phase-{N}/subphases/*.md
git commit -m "docs(plans): add detailed plan for P{phase}-{task}"
```

Push the branch:
```bash
git push -u origin feat/p{phase}-{workstream}-{task}-{short-description}
```

### 4. Return to Main

```bash
git checkout main
```

### 5. Provide Summary

List all created branches with:
- Branch name
- Task ID and description
- Link to the plan file
- Key files that will be modified

## Notes

- Always ensure we start from a clean main branch
- Each branch should be independent and mergeable on its own
- Plans should be detailed enough that a worker can execute without additional context
