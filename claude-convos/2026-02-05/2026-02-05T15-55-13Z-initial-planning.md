# Session: Initial Project Planning

**Date:** 2026-02-05T15:55:13Z
**Duration:** ~90 minutes
**Agent(s) Used:** Explore (3 parallel), Plan

## Goal

Create a comprehensive plan for Khepri, an AI-powered triathlon training coach application. The user is an experienced software engineer but new to AI programming, so explanations of AI concepts (MCP, RAG, agents) were needed.

## Key Prompts & Responses

### Prompt 1: Initial Request

> I want to create an open source web application that is an AI training coach for triathlons and other endurance sports like running, cycling, swimming. I'm experienced software engineer but this is my first go at programming with AI so feel free to explain AI things in more details to me (MCP, agents etc.). I want to use Claude for the entire thing so teach me how to setup the project for success.

**Response:** Launched 3 parallel Explore agents to research:
1. Cross-platform app frameworks (React Native, Flutter, PWA, Tauri)
2. MCP and Claude integration patterns
3. Intervals.icu API and existing MCP servers

Key findings:
- React Native + Expo recommended for cross-platform with single codebase
- Existing MCP server for Intervals.icu (eddmann and mvilanova versions)
- RAG pattern needed for exercise science knowledge

### Prompt 2: MCP Server Selection

> Instead of the intervals.icu mcp server you found, I want you to use this one https://github.com/mvilanova/intervals-mcp-server.

Switched to mvilanova/intervals-mcp-server (Python-based, 6 tools, GPL-3.0 license).

### Prompt 3: AI Transparency Requirement

> I want you to write all the prompts I give you into a directory in the repo called claude-convos and sub directories by dates with utc timestamps. This should also be part of the contribution guidelines.

Added:
- `claude-convos/` directory structure with UTC timestamp naming
- Requirement in CONTRIBUTING.md for all contributors to log conversations
- Template for conversation files

### Prompt 4: Parallel Agents & CLAUDE.md

> Can we break up the work in the plan to be worked on by multiple claude agents? Do we need a CLAUDE.md with some of the rules (e.g. conventional commits) in it?

Added:
- Work breakdown into parallel workstreams per phase
- CLAUDE.md explanation (briefing document for Claude)
- Instructions on how to run parallel agents

### Prompt 5: License Compliance

> Final thing I want to add before we create the PR is that we should adhere to the license of any library we use.

Added:
- License compliance section in CLAUDE.md
- License requirements in CONTRIBUTING.md
- NOTICE.md for third-party attributions
- Khepri uses GPL-3.0 license (copyleft, keeping it open source)

### Prompt 6: Onboarding Flow

> Even though this is an AI conversation training coach. What I would like to do on the initial launch is ask some optional questions about current health numbers FTP, running threshold, CSS for swimming and any goals the user has.

Added:
- Detailed onboarding flow (4 steps, all optional)
- Two usage modes: Structured Plan vs Daily Suggestions
- Updated data models for goals and training plans

## Outcome

Created Phase 0 PR with all planning and setup files:
- `CLAUDE.md` - Project rules for Claude
- `claude-plan.md` - Comprehensive implementation plan
- `claude-convos/README.md` - Conversation logging guide
- `README.md` - Project overview
- `CONTRIBUTING.md` - Contribution guidelines
- `LICENSE` - GPL-3.0 license (from repo)
- `NOTICE.md` - Third-party attributions
- `.gitignore` - Standard ignores

## Learnings

**What worked well:**
- Running 3 Explore agents in parallel significantly sped up research phase
- User iteratively refined requirements - plan improved with each addition
- Explaining AI concepts (MCP, RAG, agents) with analogies helped understanding

**Tips for others:**
- Start with research agents before jumping into implementation
- Ask clarifying questions - the user often has ideas they haven't mentioned yet
- For someone new to AI, explain concepts with concrete examples
- License compliance should be established early, not as an afterthought
- Creating `CLAUDE.md` early means future Claude sessions follow project conventions automatically
