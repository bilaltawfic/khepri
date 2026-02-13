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

## Optional: SonarCloud MCP Server

Contributors can set up the SonarCloud MCP server to access code quality metrics directly in Claude Code.

**Prerequisites:**
- Docker installed and running
- A SonarCloud account with access to the `bilaltawfic` organization (request access from the maintainer if needed)

**Setup:**

1. Create a SonarCloud token at https://sonarcloud.io/account/security
2. Create `.mcp.json` in the repo root (already gitignored):

```json
{
  "mcpServers": {
    "sonarqube": {
      "type": "stdio",
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "SONARQUBE_TOKEN", "-e", "SONARQUBE_ORG", "mcp/sonarqube"],
      "env": {
        "SONARQUBE_TOKEN": "your-token-here",
        "SONARQUBE_ORG": "bilaltawfic"
      }
    }
  }
}
```

3. Restart Claude Code to load the MCP server

**Usage:** Claude Code will have access to tools like `search_sonar_issues_in_projects`, `get_project_quality_gate_status`, and `get_component_measures`.

## Documentation

- [Getting Started](./docs/GETTING-STARTED.md) - Setup and installation guide
- [Implementation Plans](./plans/) - Detailed architecture and development phases
- [Contributing](./CONTRIBUTING.md) - How to contribute (including AI conversation logging)
- [Claude Conversations](./claude-convos/) - All AI conversations used to build this app

## Claude Code Skills

This project includes custom slash commands for [Claude Code](https://claude.ai/code) to automate development workflows:

| Command | Description |
|---------|-------------|
| `/cleanup-branches` | Delete merged branches and sync with main |
| `/plan-next` | Analyze status, create branches for parallel tasks |
| `/principal-review` | Run principal engineer review (code quality, architecture, security) |
| `/action-review <date or item>` | Work through action items from a review |
| `/check-pr <number>` | Check CI, SonarCloud, and Copilot review status |
| `/update-plan` | Create PR to update phase plan documents |
| `/worker-start <branch>` | Switch to task branch and read the plan |
| `/worker-done` | Complete task, create PR, check initial status |
| `/log-convo <description>` | Log conversation to claude-convos |

Skills are defined in [`.claude/skills/`](./.claude/skills/).

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

