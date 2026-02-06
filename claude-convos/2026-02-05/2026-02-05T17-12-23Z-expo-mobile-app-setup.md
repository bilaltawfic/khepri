# Session: Expo Mobile App Setup

**Date:** 2026-02-05T17:12:23Z
**Duration:** ~30 minutes
**Agent(s) Used:** Claude Code (Opus 4.5)

## Goal
Set up the React Native + Expo mobile app for Khepri as part of Workstream C (Phase 1 - Foundation). This includes creating the app structure, tab navigation, onboarding flow, and theming.

## Key Prompts & Responses

### Initial Request
User provided a detailed task specification for Workstream C:
- Create Expo app in `apps/mobile/`
- Set up Expo Router with tabs (Dashboard, Check-in, Chat, Profile)
- Create onboarding flow screens
- Implement basic theming with fitness-appropriate colors
- Update app.json and TypeScript config

### Approach Taken
Rather than using `create-expo-app` (which had permission issues), I manually created the entire app structure to have full control over:
1. File organization
2. Package dependencies
3. TypeScript configuration
4. Theme implementation

### Files Created

**App Configuration:**
- `apps/mobile/package.json` - Dependencies for Expo ~52.0.0
- `apps/mobile/app.json` - Khepri branding, scheme: "khepri"
- `apps/mobile/tsconfig.json` - Strict mode, path aliases
- `apps/mobile/babel.config.js` - Expo preset
- `apps/mobile/metro.config.js` - Metro bundler config

**Navigation (Expo Router):**
- `apps/mobile/app/_layout.tsx` - Root layout with ThemeProvider
- `apps/mobile/app/(tabs)/_layout.tsx` - Tab bar with 4 tabs
- `apps/mobile/app/(tabs)/index.tsx` - Dashboard
- `apps/mobile/app/(tabs)/checkin.tsx` - Daily check-in
- `apps/mobile/app/(tabs)/chat.tsx` - AI coach
- `apps/mobile/app/(tabs)/profile.tsx` - Settings

**Onboarding Flow:**
- `apps/mobile/app/onboarding/_layout.tsx` - Stack navigation
- `apps/mobile/app/onboarding/index.tsx` - Welcome screen
- `apps/mobile/app/onboarding/connect.tsx` - Intervals.icu
- `apps/mobile/app/onboarding/fitness.tsx` - Fitness numbers
- `apps/mobile/app/onboarding/goals.tsx` - Goal setting
- `apps/mobile/app/onboarding/plan.tsx` - Plan preference

**Components:**
- `apps/mobile/components/ThemedView.tsx` - Theme-aware View
- `apps/mobile/components/ThemedText.tsx` - Theme-aware Text with variants
- `apps/mobile/components/ScreenContainer.tsx` - SafeArea wrapper

**Theme:**
- `apps/mobile/constants/Colors.ts` - Full light/dark theme with:
  - Primary: Teal/green (#1a5f4a / #4ecca3)
  - Secondary: Warm gold (#d4a843 / #f0c14b)
  - Training zone colors for data visualization
  - State colors (success, warning, error, info)

## Outcome
- Created complete Expo app structure with 32 files
- All screens are functional stubs with proper TypeScript types
- Full light/dark mode support
- Committed to `feat/expo-setup` branch
- Created draft PR #6: https://github.com/bilaltawfic/khepri/pull/6

## Learnings

### What Worked Well
1. **Manual setup gave more control** - Could implement exactly the structure needed without fighting template defaults
2. **Stub screens with descriptions** - Each screen explains what it will do, making future implementation clear
3. **Comprehensive theming upfront** - Including training zone colors and all UI states saves refactoring later

### Tips for Others
1. For Expo SDK 52+, use `expo-router` v4 with file-based routing
2. Use `(tabs)` folder naming convention for tab groups in Expo Router
3. Include both `@react-navigation/native` themes AND custom Colors.ts for full control
4. Plan onboarding as modal presentation to keep main app flow separate

### Potential Issues
1. Dependencies need `pnpm install` after monorepo setup (Workstream A)
2. No actual image assets yet (using .gitkeep placeholders)
3. Form inputs are disabled/placeholder - need state management (Zustand) next

## Dependencies on Other Workstreams
- **Workstream A (Monorepo):** Need root pnpm-workspace.yaml and turbo.json
- **Workstream B (Supabase):** Auth integration for onboarding
- **Workstream D (MCP):** Intervals.icu connection for data sync

## Next Steps
1. Wait for Workstream A to complete monorepo setup
2. Install dependencies and verify app starts
3. Add Zustand stores for state management
4. Implement actual form inputs in onboarding
5. Add Supabase auth when Workstream B completes
