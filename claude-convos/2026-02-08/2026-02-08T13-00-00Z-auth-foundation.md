# Phase 1 Workstream C: Auth Foundation

## Date
2026-02-08

## Goal
Implement authentication foundation in the mobile app using Supabase Auth.

## Key Decisions
- Re-export `Session` and `User` types from `@khepri/supabase-client` to avoid direct `@supabase/supabase-js` dependency in mobile app
- Use `AsyncStorage` for session persistence in React Native
- Only instantiate Supabase client when config is present (dev-mode safe)
- `ProtectedRoute` component bypasses auth when Supabase not configured
- Stacked PR approach: each PR builds on the previous one

## Files Changed
- `packages/supabase-client/src/types.ts` - Re-export Session/User types
- `packages/supabase-client/src/index.ts` - Add Session/User to barrel export
- `apps/mobile/lib/supabase.ts` - Supabase client singleton with AsyncStorage
- `apps/mobile/contexts/AuthContext.tsx` - Auth state context and provider
- `apps/mobile/app/auth/_layout.tsx` - Auth screens layout
- `apps/mobile/app/auth/login.tsx` - Login screen
- `apps/mobile/app/auth/signup.tsx` - Signup screen
- `apps/mobile/services/auth.ts` - Password reset/update service
- `apps/mobile/components/ProtectedRoute.tsx` - Route guard component
- `apps/mobile/app/_layout.tsx` - Wrap with AuthProvider
- `apps/mobile/app/(tabs)/_layout.tsx` - Apply ProtectedRoute

## Learnings
- Copilot correctly identified missing `__esModule: true` and `default` exports in Jest mocks for ESM modules (expo-constants, async-storage)
- Copilot correctly identified need for error handling in async session initialization and unmount guards
- jest-expo/web preset requires `toJSON()` + `JSON.stringify()` pattern for text content checks (getByText doesn't always work)
- `@khepri/supabase-client` workspace package needs explicit `moduleNameMapper` in jest config
