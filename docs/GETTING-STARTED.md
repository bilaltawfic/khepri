# Getting Started

This guide walks you through setting up Khepri for local development.

## Prerequisites

- **Node.js** 20+
- **pnpm** 9.15+ (`npm install -g pnpm`)
- **Supabase CLI** (`brew install supabase/tap/supabase` or [install guide](https://supabase.com/docs/guides/cli))
- **Expo Go** app on your mobile device (optional, for mobile testing)

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/bilaltawfic/khepri.git
cd khepri
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

| Variable | Required | Where to Get It |
|----------|----------|-----------------|
| `SUPABASE_URL` | Yes | [Supabase Dashboard](https://supabase.com/dashboard) > Project Settings > API |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Same location, "anon public" key |
| `SUPABASE_SERVICE_ROLE_KEY` | For backend | Same location, "service_role" key |
| `ANTHROPIC_API_KEY` | For AI features | [Anthropic Console](https://console.anthropic.com/) |
| `INTERVALS_ICU_API_KEY` | Optional | [Intervals.icu](https://intervals.icu) > Settings > API |
| `INTERVALS_ICU_ATHLETE_ID` | Optional | Your Intervals.icu profile URL |

### 3. Start Local Supabase

```bash
supabase start
```

This starts a local Supabase instance. For local development, uncomment the local override variables in `.env`.

### 4. Run the App

```bash
pnpm dev
```

This starts the Expo development server. Press:
- `i` for iOS simulator
- `a` for Android emulator
- `w` for web browser
- Scan the QR code with Expo Go for your physical device

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests |
| `pnpm lint` | Lint and format with Biome |
| `pnpm typecheck` | TypeScript type checking |

## Project Structure

```
khepri/
├── apps/mobile/          # React Native + Expo app
├── packages/
│   ├── core/             # Shared types & utilities
│   ├── ai-client/        # Claude API wrapper
│   └── supabase-client/  # Database queries
├── supabase/             # Backend (functions, migrations)
├── mcp-servers/          # MCP server integrations
└── docs/                 # Documentation
```

## Troubleshooting

**pnpm install fails**
- Ensure you're using Node 20+ (`node --version`)
- Clear pnpm cache: `pnpm store prune`

**Supabase won't start**
- Check Docker is running
- Try `supabase stop && supabase start`

**Expo connection issues**
- Ensure your phone and computer are on the same network
- Try `expo start --tunnel` for network issues
