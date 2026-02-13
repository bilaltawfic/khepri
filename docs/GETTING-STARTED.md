# Getting Started

This guide walks you through setting up Khepri for local development.

## Prerequisites

- **Node.js** 20+
- **pnpm** 9.15+ (`npm install -g pnpm`)
- **Docker** ([Docker Desktop](https://docker.com/get-started) - required for local Supabase)
- **Supabase CLI** (`brew install supabase/tap/supabase` or [install guide](https://supabase.com/docs/guides/cli))
- **Expo Go** app on your mobile device (optional, for mobile testing)

## Quick Setup

Run the setup script to automate all the steps below:

```bash
git clone https://github.com/bilaltawfic/khepri.git
cd khepri
./scripts/setup.sh
```

This will check prerequisites, install dependencies, configure your environment for local development, and start Supabase.

## Manual Setup

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
| `ENCRYPTION_KEY` | For credentials | `openssl rand -hex 32` (set via `supabase secrets set`) |

### 3. Configure Supabase Secrets

The credentials Edge Function requires an encryption key for storing Intervals.icu API keys securely:

```bash
# Generate a 32-byte encryption key (64 hex characters)
openssl rand -hex 32

# Set it as a Supabase secret
supabase secrets set ENCRYPTION_KEY=<your-64-char-hex-key>
```

### 4. Start Local Supabase

```bash
supabase start
```

This starts a local Supabase instance. For local development, uncomment the local override variables in `.env`.

### 5. Run the App

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
- Ensure Docker Desktop is running (`docker info` should work)
- Try `supabase stop && supabase start`
- On first run, it may take a few minutes to download images

**Expo connection issues**
- Ensure your phone and computer are on the same network
- Try `expo start --tunnel` for network issues
