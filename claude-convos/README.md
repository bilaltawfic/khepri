# Claude Conversations Archive

This directory contains all significant conversations with Claude used to build Khepri. It's designed to show others exactly what it takes to build a real application using AI.

## Why We Do This

Building with AI is a new skill. By sharing our conversations, we help others:
- Learn effective prompting techniques
- See how to break down complex tasks
- Understand the iterative nature of AI-assisted development
- Avoid common pitfalls we encountered

## Directory Structure

```
claude-convos/
├── 2026-02-05/
│   ├── 2026-02-05T14-30-00Z-initial-planning.md
│   ├── 2026-02-05T16-45-22Z-setup-monorepo.md
│   └── 2026-02-05T18-20-15Z-database-schema.md
├── 2026-02-06/
│   └── ...
└── README.md
```

**Naming format:** `YYYY-MM-DDTHH-MM-SSZ-short-description.md`
- Use UTC timestamps
- Keep descriptions short (2-4 words, lowercase, hyphenated)

## File Template

Each conversation file should follow this structure:

```markdown
# Session: [Short Description]

**Date:** 2026-02-05T14:30:00Z
**Duration:** ~45 minutes
**Agent(s) Used:** Plan, Explore, general-purpose

## Goal

What we're trying to accomplish in this session.

## Key Prompts & Responses

### Prompt 1
[Your prompt here]

### Response 1
[Claude's response, edited for clarity - remove verbose parts]

### Prompt 2
[Continue as needed...]

## Outcome

What was accomplished:
- Files created/modified
- Decisions made
- Problems solved

## Learnings

What worked well:
- [Technique that was effective]

What didn't work:
- [Approach that failed and why]

Tips for others:
- [Advice based on this session]
```

## What to Log

Log conversations that:
- Make architectural decisions
- Implement significant features
- Solve tricky problems
- Produce interesting insights
- Fail in instructive ways

Don't bother logging:
- Simple file edits
- Typo fixes
- Routine operations

## Editing Guidelines

- **Do** clean up the conversation for readability
- **Do** remove redundant or verbose sections
- **Don't** alter the meaning or hide mistakes
- **Don't** make it look better than it was

Mistakes are valuable learning opportunities. Keep them in!

## Contributing

When you contribute to Khepri using Claude, please add your conversations here. It's part of our contribution guidelines - see [CONTRIBUTING.md](../CONTRIBUTING.md).
