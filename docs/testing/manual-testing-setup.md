# Khepri Manual Testing Setup Guide

This document explains everything you need to set up and run Khepri for manual testing.

## Prerequisites

Install the following before starting:

| Tool | Version | Install Command |
|------|---------|-----------------|
| Node.js | 20.19.4+ | [nodejs.org](https://nodejs.org) or `nvm install 20` |
| pnpm | 9.15.1 | `corepack enable && corepack prepare pnpm@9.15.1 --activate` |
| Docker Desktop | Latest | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) |
| Supabase CLI | Latest | `brew install supabase/tap/supabase` (macOS) |
| Git | Latest | `brew install git` (macOS) |

### Mobile Testing

To test on mobile devices, install one or more of:

| Platform | Tool |
|----------|------|
| iOS Simulator | Xcode (Mac App Store) - requires macOS |
| Android Emulator | [Android Studio](https://developer.android.com/studio) |
| Physical iOS device | [Expo Go](https://apps.apple.com/app/expo-go/id982107779) from App Store |
| Physical Android device | [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) from Play Store |
| Web browser | Chrome, Firefox, or Safari (no install needed) |

### Push Notification Testing

Push notifications only work on **physical devices** (not simulators/emulators). To test notifications:

| Platform | Requirement |
|----------|-------------|
| Physical iOS device | [Expo Go](https://apps.apple.com/app/expo-go/id982107779) from App Store |
| Physical Android device | [Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent) from Play Store |

> **Note**: Notification tests (NOTIF-xx) require a physical device. All other tests can run on simulators, emulators, or web.

### External Accounts (Optional but Recommended)

| Account | Purpose | Sign Up |
|---------|---------|---------|
| Intervals.icu | Training data sync testing | [intervals.icu](https://intervals.icu) (free) |
| Anthropic API | AI coach testing | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI API | Embedding generation | [platform.openai.com](https://platform.openai.com) |

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/bilaltawfic/khepri.git
cd khepri
```

Make sure you are on the `main` branch with the latest code:

```bash
git checkout main
git pull origin main
```

---

## Step 2: Install Dependencies

```bash
pnpm install
```

This installs dependencies for all packages in the monorepo:
- `apps/mobile` - React Native / Expo mobile app
- `packages/core` - Shared types and utilities
- `packages/ai-client` - Claude API integration
- `packages/supabase-client` - Database query builders
- `supabase/` - Edge function tests and seed scripts

---

## Step 3: Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with the following:

### Required (Local Supabase)

These are the default local Supabase keys - they work out of the box and are used by both backend scripts and the Expo mobile app:

```bash
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU

# Expo mobile app runtime env vars (must mirror the Supabase values above)
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### Required for AI Features

```bash
ANTHROPIC_API_KEY=sk-ant-...       # From console.anthropic.com
OPENAI_API_KEY=sk-...              # From platform.openai.com (for embeddings)
```

### Optional (Intervals.icu Integration)

```bash
INTERVALS_ICU_API_KEY=your-api-key
INTERVALS_ICU_ATHLETE_ID=i12345
```

> Find your Intervals.icu credentials at: Intervals.icu > Settings > Developer

---

## Step 4: Start Local Supabase

Make sure Docker Desktop is running, then:

```bash
supabase start
```

First run downloads Docker images (this may take several minutes). Subsequent starts are fast.

Once running, you will see:

| Service | URL |
|---------|-----|
| API | http://127.0.0.1:54321 |
| Studio (Database UI) | http://127.0.0.1:54323 |
| Inbucket (Email testing) | http://127.0.0.1:54324 |
| Database (direct) | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

Verify it is running:

```bash
supabase status
```

### Set Edge Function Secrets

```bash
# Generate an encryption key (one time)
openssl rand -hex 32

# Set all required secrets
supabase secrets set ENCRYPTION_KEY=<your-64-char-hex-from-above>
supabase secrets set ANTHROPIC_API_KEY=<your-anthropic-key>
supabase secrets set OPENAI_API_KEY=<your-openai-key>
```

---

## Step 5: Seed the Knowledge Base (Optional)

If you want to test RAG-enhanced AI coaching, run the knowledge base seeding script:

```bash
cd supabase
pnpm seed:knowledge
```

This parses the exercise science documents in `docs/knowledge/` and generates embeddings via the `generate-embedding` edge function.

---

## Step 6: Build Packages

```bash
pnpm build
```

This compiles TypeScript packages in dependency order: `core` -> `ai-client` -> `supabase-client`.

---

## Step 7: Run Automated Tests (Sanity Check)

Before starting manual testing, verify everything passes:

```bash
pnpm test
pnpm lint
pnpm typecheck
```

All tests, lint, and type checks should pass. If they don't, stop and resolve issues before proceeding.

---

## Step 8: Start the App

```bash
pnpm dev
```

This starts:
- Expo development server for the mobile app
- TypeScript watch mode for shared packages

### Accessing the App

| Platform | How to Access |
|----------|---------------|
| **Web** | Press `w` in the terminal, or open the URL shown in output |
| **iOS Simulator** | Press `i` in the terminal (requires Xcode) |
| **Android Emulator** | Press `a` in the terminal (requires Android Studio) |
| **Physical device** | Scan the QR code shown in terminal with Expo Go app |

> **Tip**: For the most thorough testing, test on at least web + one mobile platform (iOS or Android).

### Screens Requiring Direct URL Access

Some screens are fully implemented but not yet linked from the main navigation UI. To test these, use direct URL navigation in the **web browser**:

| Screen | URL Path | Test Cases |
|--------|----------|------------|
| Workout Templates | `/workouts` | WKT-01 through WKT-11 |
| Workout Detail | `/workouts/{template-id}` | WKT-08, WKT-09, WKT-10 |
| Race Countdown | `/analysis/race-countdown` | RACE-01 through RACE-05 |
| Training Review | `/analysis/training-review` | TREV-01 through TREV-07 |

> **Note**: These screens are easiest to test using the **web** platform, where you can type URLs directly in the browser address bar. On mobile, you would need deep links.

---

## Step 9: Create a Test User Account

1. Open the app - you should see the **Login** screen
2. Tap **"Create an account"** to go to Signup
3. Enter a test email and password (minimum 8 characters)
4. For local Supabase, email confirmation is disabled - you will be logged in immediately

> **Recommended test accounts**: Create at least 2 accounts to verify data isolation (RLS). For example:
> - `tester1@test.com` / `password123`
> - `tester2@test.com` / `password123`

---

## Step 10: Verify Database via Supabase Studio

Open http://127.0.0.1:54323 to access the local Supabase Studio.

Check these tables after creating an account:
- **auth.users** - your test user should appear
- **athletes** - a row should be created after onboarding

You can use Studio throughout testing to verify data is being saved correctly.

---

## Useful Commands During Testing

| Command | Purpose |
|---------|---------|
| `supabase status` | Check if Supabase is running |
| `supabase db reset` | Reset database to clean state (re-runs all migrations) |
| `supabase stop` | Stop local Supabase |
| `pnpm dev` | Start the app |
| `pnpm test` | Run automated tests |
| `pnpm lint` | Check code style |

---

## Resetting Test State

To start fresh between test rounds:

```bash
# Reset the database (drops all data, re-runs migrations)
supabase db reset

# Re-seed knowledge base if needed
cd supabase && pnpm seed:knowledge
```

> **Warning**: `supabase db reset` deletes ALL data including user accounts. You will need to create new test accounts.

---

## Troubleshooting

### "Cannot connect to Supabase"
- Verify Docker Desktop is running
- Run `supabase status` to check services
- Ensure `.env` has `SUPABASE_URL=http://127.0.0.1:54321`

### "Edge function errors"
- Check secrets are set: `supabase secrets list`
- View function logs: `supabase functions logs <function-name>`
- Verify API keys are valid and have credits

### "Expo won't start"
- Clear cache: `cd apps/mobile && npx expo start -c`
- Ensure port 8081 is free
- Check Node version: `node --version` (must be 20+)

### "Tests fail"
- Run `pnpm build` first (shared packages must be compiled)
- Check Node version compatibility
- Run `pnpm install` if dependencies are out of date

### "App shows blank screen on device"
- Ensure phone and computer are on the same WiFi network
- Try tunnel mode: `cd apps/mobile && npx expo start --tunnel`
- Check for JavaScript errors in the Expo terminal output

### "AI coach doesn't respond"
- Verify `ANTHROPIC_API_KEY` is set in Supabase secrets
- Check edge function logs: `supabase functions logs ai-orchestrator`
- Ensure you have API credits on your Anthropic account

### "Intervals.icu data not showing"
- Verify credentials are saved (Profile > Intervals.icu shows "Connected")
- Check `ENCRYPTION_KEY` is set in Supabase secrets
- Verify Intervals.icu API key is valid at intervals.icu

### "Push notifications not appearing"
- Must test on a **physical device** (not simulator/emulator)
- Verify notification permissions are granted in device Settings
- Check that Expo Go or a development build is installed (not a web build)
- On Android, verify the "daily-reminders" notification channel exists

---

## Test Environment Summary

When everything is set up correctly, you should have:

- [ ] Node.js 20+ installed
- [ ] pnpm 9.15.1 installed
- [ ] Docker Desktop running
- [ ] Local Supabase running (API on :54321, Studio on :54323)
- [ ] `.env` configured with Supabase keys
- [ ] Edge function secrets set (ENCRYPTION_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY)
- [ ] `pnpm install` completed successfully
- [ ] `pnpm build` completed successfully
- [ ] `pnpm test` all passing
- [ ] `pnpm lint` all passing
- [ ] Expo dev server running
- [ ] App accessible on at least one platform (web, iOS, or Android)
- [ ] At least one test user account created
- [ ] (Optional) Intervals.icu account with API credentials
- [ ] (Optional) Knowledge base seeded for RAG testing
- [ ] (Optional) Physical device available for push notification testing
