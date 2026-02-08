# Khepri

> AI-powered triathlon and endurance training coach

Khepri is your personal AI training coach that provides daily workout recommendations, adapts to your life, and helps you train smarter for triathlons and endurance sports.

**What makes this repo special:** Every conversation with Claude used to build this app is saved in [`claude-convos/`](./claude-convos/) - so you can see exactly what it takes to build a real application using AI.

## Features

- **Daily Check-ins** - Quick wellness assessment with personalized workout recommendations
- **Intervals.icu Integration** - Syncs your training data for intelligent load management
- **Two Training Modes**
  - **Structured Plans** - Periodized 4-20 week plans with automatic adjustments
  - **Daily Suggestions** - Flexible day-by-day recommendations
- **Exercise Science Grounded** - Recommendations backed by training research
- **Injury & Travel Aware** - Adapts workouts to your constraints
- **Cross-Platform** - iOS, Android, Mac, and PC

## Status

**Phase 1: Foundation** - See [plans/](./plans/) for implementation plans.

## Tech Stack

- **Frontend:** React Native + Expo
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **AI:** Claude API with MCP tool integration
- **Data Sync:** [Intervals.icu](https://intervals.icu) via MCP server

## Quick Start

See the [Getting Started Guide](./docs/GETTING-STARTED.md) for full setup instructions.

```bash
git clone https://github.com/bilaltawfic/khepri.git
cd khepri
pnpm install
cp .env.example .env   # configure your credentials
pnpm dev
```

## Documentation

- [Getting Started](./docs/GETTING-STARTED.md) - Setup and installation guide
- [Implementation Plans](./plans/) - Detailed architecture and development phases
- [Contributing](./CONTRIBUTING.md) - How to contribute (including AI conversation logging)
- [Claude Conversations](./claude-convos/) - All AI conversations used to build this app

## AI Transparency

This project is built transparently with AI assistance. We log all significant Claude conversations in [`claude-convos/`](./claude-convos/) to demonstrate:

- What prompts work well
- How to break down complex tasks
- The iterative nature of AI development
- Real mistakes and how we fixed them

If you're learning to build with AI, browse through our conversations!

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

Key requirements:
- Use [conventional commits](https://www.conventionalcommits.org/)
- Log significant Claude conversations to `claude-convos/`
- Verify license compatibility for dependencies

## License

GPL-3.0 - see [LICENSE](./LICENSE)

This is a copyleft license, meaning derivative works must also be open source under GPL-3.0.

