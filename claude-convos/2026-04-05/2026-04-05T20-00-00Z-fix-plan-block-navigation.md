# Fix Plan Block Navigation

**Date:** 2026-04-05
**Branch:** fix/plan-block-navigation

## Goals

Fix "Page Not Found" screen appearing after completing season setup, and prevent the not-found screen from staying in the navigation stack.

## Key Decisions

1. **Root cause**: Dashboard navigated to `/plan/block` which doesn't exist — the correct route is `/plan/block-setup`
2. **Not-found screen fix**: Changed `<Link href="/">` (which pushes) to `router.replace('/(tabs)')` (which replaces), preventing the not-found screen from staying in the back stack
3. **Missing route registration**: Added `plan` to the root `_layout.tsx` Stack for consistency with all other routes

## Files Changed

- `apps/mobile/app/(tabs)/index.tsx` — Fixed `/plan/block` → `/plan/block-setup`
- `apps/mobile/app/+not-found.tsx` — Changed Link to Pressable with `router.replace` to clear nav stack
- `apps/mobile/app/_layout.tsx` — Registered `plan` route in root Stack

## Learnings

- Expo Router's `<Link>` component pushes by default, which can leave error screens in the back stack
- All route groups should be registered in the root `_layout.tsx` even if they have their own `_layout.tsx`
