---
name: log-convo
description: Log this conversation to claude-convos for AI transparency
argument-hint: <short-description>
disable-model-invocation: true
allowed-tools: Bash, Write
---

# Log Conversation

Create a conversation log in `claude-convos/` to document AI-assisted work.

**Description:** $ARGUMENTS

## Steps

### 1. Generate Timestamp and Path

Get the current UTC timestamp:
```bash
date -u +"%Y-%m-%dT%H-%M-%SZ"
```

Create the directory for today:
```bash
mkdir -p claude-convos/$(date -u +"%Y-%m-%d")
```

### 2. Create Conversation Log

Create a file at: `claude-convos/YYYY-MM-DD/YYYY-MM-DDTHH-MM-SSZ-<description>.md`

Use this template:

```markdown
# [Title based on description]

**Date:** YYYY-MM-DD
**PR:** #[number] - [title] (if applicable)

## Goals

- [What we set out to accomplish]

## Key Decisions

1. **[Decision 1]** - [Reasoning]
2. **[Decision 2]** - [Reasoning]

## Files Changed

- `path/to/file.ts` - [What changed]

## Learnings

1. [Insight or pattern discovered]
2. [Gotcha or mistake to avoid]
```

### 3. Populate Content

Fill in the template based on the current conversation:
- **Goals**: What the user asked for
- **Key Decisions**: Architectural choices, approach taken
- **Files Changed**: All files created/modified with brief description
- **Learnings**: Patterns, gotchas, or insights worth remembering

### 4. Commit the Log

```bash
git add claude-convos/
git commit -m "$(cat <<'EOF'
docs: add conversation log for [description]

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

## Important

- Always log significant conversations (features, bug fixes, architectural decisions)
- Keep descriptions concise but informative
- Include learnings that would help future Claude sessions
- Don't log trivial conversations (typo fixes, simple questions)
