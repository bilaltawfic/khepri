# Khepri: AI-Powered Triathlon Training Coach

> Named after the Egyptian god of rebirth and renewal, symbolizing the daily cycle of training and recovery.

## Overview

A cross-platform AI training coach that provides personalized daily coaching through Claude, integrates with Intervals.icu for workout data, and uses exercise science knowledge to ensure safe, effective training.

**What makes this repo special:** Every conversation with Claude used to build this app is saved in `claude-convos/` - so you can see exactly what it takes to build a real application using AI.

---

## Key AI Concepts Explained

### What is MCP (Model Context Protocol)?

MCP is like a **"USB-C port for AI"** - a standardized way to connect Claude to external tools and data sources. Instead of writing custom code for each integration, MCP provides a common protocol.

**How it works:**
1. You configure MCP servers (plugins) that expose "tools" to Claude
2. When Claude needs data (e.g., your workout history), it calls the appropriate tool
3. The MCP server fetches the data and returns it to Claude
4. Claude uses that real data in its response

**We're using:** [mvilanova/intervals-mcp-server](https://github.com/mvilanova/intervals-mcp-server) - a Python-based MCP server with 6 tools:
- `get_activities` - Retrieve activity lists
- `get_activity_details` - Access specific activity information
- `get_activity_intervals` - Obtain interval-level workout data
- `get_wellness_data` - Fetch wellness metrics
- `get_events` - Retrieve upcoming workouts and races
- `get_event_by_id` - Get detailed event information

### What is CLAUDE.md?

**This is important for you as a beginner!**

`CLAUDE.md` is a special file that Claude Code reads automatically when working in your repository. It's like giving Claude a "briefing document" about your project before it starts helping you.

Put things in CLAUDE.md like:
- Project conventions (commit format, code style)
- Architecture decisions
- Common commands to run
- Things Claude should always do or never do

**Example:** If you put "Always use conventional commits" in CLAUDE.md, Claude will follow that rule every time it helps you in this repo - without you having to remind it.

### What is RAG (Retrieval Augmented Generation)?

RAG solves the problem of Claude not knowing domain-specific information (like exercise science research). Instead of fine-tuning a model, you:

1. **Store knowledge** in a searchable database (exercise science articles, training protocols)
2. **Search relevant content** when the user asks a question
3. **Include that content** in the prompt to Claude
4. **Claude generates** a grounded, accurate response

This lets Claude cite real research when recommending training adjustments.

### What are AI Agents?

An "agent" is Claude enhanced with tools that let it take actions, not just answer questions. For Khepri:
- Claude can **query** your recent workouts from Intervals.icu
- Claude can **search** the exercise science knowledge base
- Claude can **create** workouts on your calendar
- Claude can **check** if a proposed workout is safe given your fatigue level

The agent "loops" - it might call multiple tools, reason about the results, and call more tools before giving you a final recommendation.

---

## Repository Structure for AI Transparency

### claude-convos/ - Conversation Archive

Every prompt and conversation used to build this app is saved here:

```
claude-convos/
├── 2026-02-05/
│   ├── 2026-02-05T14-30-00Z-initial-planning.md
│   ├── 2026-02-05T16-45-22Z-setup-monorepo.md
│   └── 2026-02-05T18-20-15Z-database-schema.md
├── 2026-02-06/
│   ├── 2026-02-06T09-00-00Z-expo-setup.md
│   └── ...
└── README.md  # Explains the format
```

**Format:** `YYYY-MM-DDTHH-MM-SSZ-short-description.md`

Each file contains:
```markdown
# Session: [Short Description]

**Date:** 2026-02-05T14:30:00Z
**Duration:** ~45 minutes
**Agent(s) Used:** Plan, Explore

## Goal
What we're trying to accomplish in this session.

## Key Prompts & Responses
[The actual conversation, edited for clarity]

## Outcome
What was accomplished, files created/modified.

## Learnings
What worked well, what didn't, tips for others.
```

---

## Technology Stack

### Frontend: React Native + Expo
**Why:** Single TypeScript codebase for iOS, Android, and Web. Expo simplifies development significantly - no need to configure Xcode/Android Studio manually. You can test on your phone immediately using Expo Go app.

### Backend: Supabase
**Why:** PostgreSQL database with built-in auth, real-time sync, and serverless functions. Has `pgvector` extension for RAG. Generous free tier. Can self-host later if needed.

### AI: Claude API + MCP
**Why:** Claude for conversational coaching, MCP for tool integrations.

### Intervals.icu Integration: mvilanova/intervals-mcp-server
**Why:** Python-based, supports both Claude Desktop and ChatGPT, actively maintained, simpler to extend.

**License Note:** This MCP server is GPL-3.0 licensed, same as Khepri.

**Requirements:**
- Python 3.12+
- `uv` package manager
- Intervals.icu API key (from Settings > API)
- Athlete ID (from your Intervals.icu URL)

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      YOUR DEVICES                           │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │  iPhone │  │ Android │  │   Mac   │  │   PC    │        │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│       └────────────┴────────────┴────────────┘              │
│                         │                                   │
│              React Native + Expo App                        │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────────┐
│                      SUPABASE                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │     Auth     │  │   Realtime   │      │
│  │  + pgvector  │  │    (OAuth)   │  │  (WebSocket) │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │              Edge Functions                       │      │
│  │  • ai-orchestrator (calls Claude, manages tools)  │      │
│  │  • mcp-gateway (routes tool calls)                │      │
│  │  • daily-reminder (push notifications)            │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   EXTERNAL SERVICES                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Claude API  │  │ Intervals.icu│  │  Embedding   │      │
│  │  (Anthropic) │  │  MCP Server  │  │     API      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
khepri/
├── claude-plan.md                 # This plan (locked in)
├── CLAUDE.md                      # Rules for Claude
├── claude-convos/                 # All AI conversations
│   ├── README.md
│   └── 2026-02-05/
│       └── ...
│
├── apps/
│   └── mobile/                    # React Native + Expo
│       ├── app/                   # Screens (Expo Router)
│       │   ├── (tabs)/
│       │   │   ├── index.tsx      # Dashboard
│       │   │   ├── checkin.tsx    # Daily check-in
│       │   │   ├── chat.tsx       # AI coach chat
│       │   │   └── profile.tsx    # Settings
│       │   └── onboarding/        # First-time setup
│       ├── components/
│       ├── hooks/
│       ├── services/              # API clients
│       └── stores/                # State (Zustand)
│
├── packages/
│   ├── core/                      # Shared types & utils
│   ├── ai-client/                 # Claude API wrapper
│   │   └── src/
│   │       ├── prompts/           # System prompts
│   │       ├── tools/             # Tool definitions
│   │       └── context-builder.ts # Assembles coaching context
│   └── supabase-client/           # Database queries
│
├── supabase/
│   ├── functions/                 # Edge Functions
│   │   ├── ai-orchestrator/       # Main AI endpoint
│   │   └── mcp-gateway/           # Tool execution
│   ├── migrations/                # Database schema
│   └── seed/                      # Initial data
│
├── mcp-servers/
│   └── intervals-icu/             # Fork/config of mvilanova/intervals-mcp-server
│       └── ...
│
├── docs/                          # Documentation
├── turbo.json                     # Monorepo config
├── pnpm-workspace.yaml
└── README.md
```

---

## Work Breakdown for Parallel Claude Agents

The work is organized so multiple Claude agents can work in parallel on independent tasks. Here's how to think about it:

### What Can Run in Parallel?

Tasks are **independent** when they don't modify the same files. For example:
- Setting up the database schema vs. creating the Expo navigation
- Writing tests vs. writing documentation
- Building different screens that don't share state

### Phase 1: Foundation - Parallel Workstreams

```
┌─────────────────────────────────────────────────────────────┐
│                    PHASE 1: FOUNDATION                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  WORKSTREAM A              WORKSTREAM B                      │
│  (Agent 1)                 (Agent 2)                         │
│  ─────────────             ─────────────                     │
│  • Initialize monorepo     • Create Supabase project         │
│  • Set up Turborepo        • Write database migrations       │
│  • Configure TypeScript    • Set up authentication           │
│  • Add Biome linting       • Create seed data                │
│  • Create CLAUDE.md                                          │
│                                                              │
│  WORKSTREAM C                                                │
│  (Agent 3)                                                   │
│  ─────────────                                               │
│  • Set up Expo app                                           │
│  • Create navigation structure                               │
│  • Add basic screens (stubs)                                 │
│  • Configure theming                                         │
│                                                              │
│  ──────────── SYNC POINT ────────────                        │
│  All workstreams complete → Integration test                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Phase 2: Core Coaching - Parallel Workstreams

```
┌─────────────────────────────────────────────────────────────┐
│                 PHASE 2: CORE COACHING                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  WORKSTREAM A              WORKSTREAM B                      │
│  (Agent 1)                 (Agent 2)                         │
│  ─────────────             ─────────────                     │
│  • Athlete profile UI      • AI context builder              │
│  • Goals management UI     • System prompts                  │
│  • Constraints UI          • Tool definitions                │
│                            • Claude API integration          │
│                                                              │
│  WORKSTREAM C                                                │
│  (Agent 3)                                                   │
│  ─────────────                                               │
│  • Daily check-in screen                                     │
│  • Wellness input components                                 │
│  • Push notification setup                                   │
│                                                              │
│  ──────────── SYNC POINT ────────────                        │
│  Integrate UI + AI → End-to-end check-in flow                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Phase 3: Knowledge - Parallel Workstreams

```
┌─────────────────────────────────────────────────────────────┐
│               PHASE 3: KNOWLEDGE INTEGRATION                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  WORKSTREAM A              WORKSTREAM B                      │
│  (Agent 1)                 (Agent 2)                         │
│  ─────────────             ─────────────                     │
│  • pgvector setup          • Curate exercise science content │
│  • Embedding pipeline      • Write knowledge documents       │
│  • RAG search function     • Create training protocols       │
│                                                              │
│  WORKSTREAM C                                                │
│  (Agent 3)                                                   │
│  ─────────────                                               │
│  • Custom MCP server                                         │
│  • Safety validation tools                                   │
│  • Integrate with AI orchestrator                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### How to Run Parallel Agents

When you're ready to work on a phase, tell Claude:

```
"I want to work on Phase 1. Launch agents in parallel for:
1. Workstream A: Monorepo setup
2. Workstream B: Supabase setup
3. Workstream C: Expo app setup"
```

Claude will spawn multiple Task agents that work simultaneously. Each agent focuses on its workstream without stepping on the others.

---

## Development Phases (Detailed)

### Phase 0: Planning PR
- [x] Create comprehensive plan
- [x] Initialize git repository
- [x] Create `CLAUDE.md`
- [x] Create `claude-plan.md` (this plan)
- [x] Create `claude-convos/` structure
- [x] Create `README.md` with project overview
- [x] Create `CONTRIBUTING.md` with conversation logging rules
- [x] Create `.gitignore`
- [x] First commit with conventional format

**PR Title:** `docs: initial project planning and AI transparency setup`

### Phase 1: Foundation (Weeks 1-3)

| Workstream | Tasks | Can Parallelize With |
|------------|-------|---------------------|
| A: Monorepo | Init Turborepo, pnpm, TypeScript, Biome | B, C |
| B: Supabase | Create project, schema, auth | A, C |
| C: Expo | Create app, navigation, basic screens | A, B |
| D: MCP | Set up intervals-mcp-server locally | A, B, C |

**Milestone:** Chat with Claude that can read your Intervals.icu data

### Phase 2: Core Coaching (Weeks 4-7)

| Workstream | Tasks | Can Parallelize With |
|------------|-------|---------------------|
| A: Profile UI | Athlete profile, goals, constraints screens | B, C |
| B: AI Backend | Context builder, system prompts, Claude integration | A, C |
| C: Check-in | Daily check-in flow, wellness components, notifications | A, B |

**Milestone:** Functional daily coaching with personalized recommendations

### Phase 3: Knowledge Integration (Weeks 8-10)

| Workstream | Tasks | Can Parallelize With |
|------------|-------|---------------------|
| A: RAG Infra | pgvector, embeddings, search | B, C |
| B: Content | Exercise science documents, training protocols | A, C |
| C: MCP Tools | Custom Khepri MCP server, safety validation | A, B |

**Milestone:** AI coach that cites exercise science and prevents unsafe training

### Phase 4: Advanced Features (Weeks 11-14)

| Workstream | Tasks | Can Parallelize With |
|------------|-------|---------------------|
| A: Calendar | Push to Intervals.icu, workout modification | B, C |
| B: Analysis | Race countdown, training block reviews | A, C |
| C: Ad-hoc | Gym workouts, travel workouts, conversation history | A, B |

**Milestone:** Full-featured coaching app

### Phase 5: Polish & Launch (Weeks 15-18)

| Workstream | Tasks | Can Parallelize With |
|------------|-------|---------------------|
| A: Testing | Unit, integration, E2E tests | B, C |
| B: Docs | User guide, API docs, contributing guide | A, C |
| C: Release | App store prep, CI/CD, community setup | A, B |

**Milestone:** Production app with open source community

---

## Contribution Guidelines

### Logging Claude Conversations

**This is required for all contributors.**

When you have a significant conversation with Claude that:
- Makes architectural decisions
- Implements a feature
- Solves a tricky problem
- Produces interesting insights

You must save it to `claude-convos/`:

1. Create a file: `claude-convos/YYYY-MM-DD/YYYY-MM-DDTHH-MM-SSZ-short-description.md`
2. Use UTC timestamps
3. Include: Goal, Key Prompts, Outcome, Learnings

**Why?** This repository demonstrates building with AI. Future developers can learn from seeing the actual conversations, not just the final code.

### Commit Convention

All commits follow: `type(scope): description`

```
feat(mobile): add daily check-in screen
fix(ai): correct CTL calculation in context builder
docs(readme): add installation instructions
chore(deps): update expo to v52
```

**Types:** feat, fix, docs, style, refactor, perf, test, build, ci, chore

**Scopes:** mobile, core, ai-client, supabase, mcp, docs, deps

### License Compliance

**This is required for all contributors.**

- Always check the license of any library before adding it as a dependency
- Ensure library licenses are compatible with GPL-3.0 (our project license)
- Acceptable licenses: GPL-3.0, LGPL, MIT, Apache 2.0, BSD, ISC, CC0
- Note: GPL-3.0 is copyleft - derivative works must also be GPL-3.0
- Never copy code from repositories without verifying their license permits it
- Document any libraries with attribution requirements in `NOTICE.md`

### Pull Request Process

1. Create feature branch from `main`
2. Make changes with tests
3. Verify license compatibility for any new dependencies
4. Log significant Claude conversations
5. Ensure CI passes
6. Request review
7. Squash and merge with conventional commit message

---

## Open Source Setup

### Repository Essentials
- **README.md** - Project overview, features, quick start
- **CONTRIBUTING.md** - How to contribute, conversation logging rules, license compliance
- **CLAUDE.md** - Project rules for Claude
- **LICENSE** - GPL-3.0
- **NOTICE.md** - Third-party licenses and attributions
- **CHANGELOG.md** - Auto-generated from conventional commits
- **CODE_OF_CONDUCT.md** - Community standards
- **claude-plan.md** - This plan

### CI/CD Pipeline
- **On PR:** Lint, typecheck, test
- **On merge to main:** Build, semantic-release (auto-version + changelog)
- **Preview deployments:** Expo preview builds for PRs

---

## Core Data Models

### Athlete Profile
- Display name, physical stats (weight, height, DOB)
- Current fitness numbers (all optional, can sync from Intervals.icu):
  - FTP (Functional Threshold Power) in watts
  - Running threshold pace (min/km or min/mile)
  - CSS (Critical Swim Speed) per 100m
  - Resting heart rate, max heart rate
  - LTHR (Lactate Threshold Heart Rate)
- Preferences (units, timezone, daily check-in time)
- Intervals.icu connection (athlete ID, encrypted API key)

### Goals
- **Race goals:** Event name, date, distance, location, target time, priority (A/B/C)
- **Performance goals:** Metric to improve (FTP, threshold pace, etc.), current value, target value, target date
- **Fitness goals:** Weekly volume targets, consistency goals
- **Health goals:** Weight, body composition, etc.

### Training Plan (Optional)
- Duration (4-20 weeks)
- Target race/goal (if any)
- Periodization phases:
  - Base building
  - Build/intensity
  - Peak
  - Taper
  - Recovery
- Weekly structure template
- Adjustments log (how the plan has adapted)

### Constraints
- Injuries (affected body parts, severity, restrictions)
- Travel periods (limited equipment/facilities)
- Availability changes

### Daily Check-ins
- Wellness metrics: sleep (quality + hours), energy, stress, soreness
- Objective data: resting HR, HRV, weight
- Context: available time, equipment access, travel status
- AI recommendations generated from check-in

---

## Initial Setup & Onboarding

When a user first launches Khepri, they go through an onboarding flow. **All questions are optional** - users can skip and still use the app.

```
┌─────────────────────────────────────────────────────────────┐
│                    ONBOARDING FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  STEP 1: Connect Intervals.icu (Optional)                   │
│  ─────────────────────────────────────────                  │
│  "Connect to auto-sync your workouts and fitness data"      │
│  [Connect] or [Skip for now]                                │
│                                                              │
│  STEP 2: Current Fitness Numbers (Optional)                 │
│  ─────────────────────────────────────────                  │
│  "Share your current numbers so I can personalize           │
│   your training zones. Skip any you don't know."            │
│                                                              │
│  • FTP (Functional Threshold Power): _____ watts            │
│  • Running Threshold Pace: _____ min/km or min/mile         │
│  • CSS (Critical Swim Speed): _____ /100m                   │
│  • Resting Heart Rate: _____ bpm                            │
│  • Max Heart Rate: _____ bpm                                │
│                                                              │
│  [Continue] or [Skip - I'll figure these out later]         │
│                                                              │
│  STEP 3: Your Goals (Optional)                              │
│  ─────────────────────────────                              │
│  "What are you working toward? Add as many as you like."    │
│                                                              │
│  Goal types:                                                 │
│  • Race: "Complete Ironman 70.3 on [date]"                  │
│  • Performance: "Improve FTP from 250W to 280W"             │
│  • Fitness: "Build consistent run base of 40km/week"        │
│  • Health: "Lose 5kg before race season"                    │
│                                                              │
│  [Add Goal] [Continue without goals]                        │
│                                                              │
│  STEP 4: Training Plan Duration (Optional)                  │
│  ─────────────────────────────────────────                  │
│  "Would you like me to create a structured training plan?"  │
│                                                              │
│  ○ Yes, create a plan for: [4/8/12/16/20 weeks] ▼          │
│    "I'll periodize your training with build, recovery,      │
│     and taper phases toward your goal."                     │
│                                                              │
│  ○ No, just give me daily suggestions                       │
│    "I'll suggest workouts each day based on your            │
│     recent training and how you're feeling."                │
│                                                              │
│  [Start Training]                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Two Usage Modes

**Mode 1: Structured Training Plan**
- User sets a plan duration (4-20 weeks) and goals
- Khepri creates a periodized plan with phases (base, build, peak, taper)
- Daily check-ins adjust the short-term workouts while keeping long-term progression
- Plan adapts to missed workouts, injuries, life events

**Mode 2: Daily Suggestions Only**
- No long-term plan - just show up each day
- Khepri suggests workouts based on:
  - Recent training load (from Intervals.icu if connected)
  - Current wellness (from daily check-in)
  - Available time and equipment
  - Any active constraints
- Great for maintenance periods or flexible schedules

Users can switch between modes at any time.

---

## Daily Check-in Flow

```
1. NOTIFICATION (your configured time)
   "Good morning! Ready for your daily check-in?"

2. QUICK WELLNESS QUESTIONS (< 30 seconds)
   • Sleep quality (1-10) + hours
   • Energy level (1-10)
   • Muscle soreness (body map)
   • Available time today
   • Any constraints?

3. AI ANALYSIS (behind the scenes)
   • Fetch yesterday's workout from Intervals.icu
   • Calculate current CTL/ATL/TSB (fitness/fatigue/form)
   • Factor in wellness scores and constraints
   • Query exercise science knowledge for relevant protocols
   • Check for overtraining signals
   • If on a plan: Check what's scheduled and whether to adjust

4. PERSONALIZED RECOMMENDATION

   **If user has a training plan:**
   "Based on your check-in and your 12-week plan...

   TODAY'S PLANNED WORKOUT: Bike intervals - 4x8min @ FTP

   ADJUSTMENT: Your sleep was poor (5/10) and soreness is
   elevated. I'm suggesting we swap this to tomorrow and do
   an easy spin today instead. This keeps your weekly TSS
   on track while respecting recovery.

   [Accept Swap] [Do Original Workout] [Skip Today]"

   **If user is in daily-suggestions mode:**
   "Based on your check-in and recent training...

   TODAY'S SUGGESTED WORKOUT: Easy 45min Zone 2 run
   [Structured workout with warm-up, main set, cool-down]

   WHY: Your TSB is -15 (fatigued) after yesterday's
   intervals. An easy aerobic session maintains fitness
   while allowing recovery.

   ALTERNATIVES:
   • 30min if pressed for time
   • Pool session if legs need complete rest"

5. CONVERSATION
   You can ask questions, request modifications,
   or tell the coach about unplanned activities.
```

---

## Key Files to Implement

1. **`/apps/mobile/app/onboarding/`** - Onboarding flow (connect Intervals.icu, fitness numbers, goals, plan duration)
2. **`/apps/mobile/app/(tabs)/checkin.tsx`** - Daily check-in screen (user engagement hub)
3. **`/supabase/functions/ai-orchestrator/index.ts`** - Central AI endpoint
4. **`/packages/ai-client/src/context-builder.ts`** - Assembles coaching context
5. **`/packages/ai-client/src/plan-generator.ts`** - Creates periodized training plans
6. **`/supabase/migrations/001_initial_schema.sql`** - Database foundation
7. **`/mcp-servers/khepri-tools/src/tools/rag-search.ts`** - Knowledge search

---

## Verification Plan

After each phase, verify:

1. **Phase 0:** PR merged with planning docs, CLAUDE.md, claude-convos structure
2. **Phase 1:** Can chat with Claude and see Intervals.icu data in responses
3. **Phase 2:** Complete a daily check-in, receive workout recommendation
4. **Phase 3:** Ask about training load - response should cite exercise science
5. **Phase 4:** Request a gym workout, see it appear in Intervals.icu calendar
6. **Phase 5:** App runs on all platforms, documentation is clear
