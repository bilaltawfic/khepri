---
name: worker-start
description: Start work on a task by switching to its branch and reading the plan
argument-hint: <branch-name>
disable-model-invocation: true
allowed-tools: Bash, Read, Glob, Grep, TodoWrite
---

# Start Worker Task

Switch to a task branch and understand the work to be done.

**Branch:** $ARGUMENTS

## Steps

### 1. Fetch Latest and Switch Branch

```bash
git fetch origin
git checkout $ARGUMENTS
git pull origin $ARGUMENTS
```

### 2. Find and Read the Plan

Look for the plan file in `plans/phase-*/subphases/`:
```bash
find plans -name "*.md" -path "*/subphases/*" | head -10
```

Read the plan file that corresponds to this branch/task.

### 3. Understand the Context

From the plan, identify:
- **Goal**: What this task accomplishes
- **Files to Create**: New files needed
- **Files to Modify**: Existing files to change
- **Dependencies**: What packages/hooks this builds on
- **Testing Requirements**: What tests to write

### 4. Read Relevant Existing Files

Read the files that will be modified to understand current state.
Read related files mentioned in the plan for patterns to follow.

### 5. Create Todo List

Use the TodoWrite tool to create a task list based on the plan's steps.
This helps track progress through the implementation.

### 6. Begin Implementation

Start with the first task in the plan. Follow these patterns:
- Write tests alongside implementation (not after)
- Follow existing code patterns in the codebase
- Use conventional commits for each logical change
- Keep changes focused on the task scope

## Important Reminders

- Run `pnpm lint` before committing
- Run `pnpm test` to verify tests pass
- Mark component props as `readonly`
- Add `accessibilityRole` to interactive elements
- Use `!= null` for nullish checks (not truthy checks)
