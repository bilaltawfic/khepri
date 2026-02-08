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

## Files Changed (PR #22: Auth Context Provider)
- `packages/supabase-client/src/types.ts` - Re-export Session/User types
- `packages/supabase-client/src/index.ts` - Add Session/User to barrel export
- `apps/mobile/package.json` - Add supabase-client and async-storage dependencies
- `apps/mobile/lib/supabase.ts` - Supabase client singleton with AsyncStorage
- `apps/mobile/contexts/AuthContext.tsx` - Auth state context and provider
- `apps/mobile/contexts/index.ts` - Barrel export for contexts
- `apps/mobile/jest.config.js` - Add moduleNameMapper and coverage paths
- `apps/mobile/jest.setup.ts` - Add expo-constants and async-storage mocks
- `apps/mobile/__mocks__/@khepri/supabase-client.ts` - Manual mock for CI

Note: Auth screens (login, signup), services (auth.ts), ProtectedRoute, and layout wiring are in subsequent PRs (#23-#27).

## Files Changed (PR #23: Login Screen UI)
- `apps/mobile/app/auth/login.tsx` - Login screen with email/password form, validation, and error display
- `apps/mobile/app/auth/_layout.tsx` - Auth route group layout (Stack navigator, headerless)
- `apps/mobile/app/auth/__tests__/login.test.tsx` - 7 tests: renders form, validation, signIn calls, error display, submit state

## Files Changed (PR #24: Signup Screen UI)
- `apps/mobile/app/auth/signup.tsx` - Signup screen with email/password/confirm form, validation (email format, min length, match), themed error colors
- `apps/mobile/app/auth/__tests__/signup.test.tsx` - 12 tests: renders form, validation (email format, password length, confirm required, match), signUp calls, redirect, error display, disabled state
- `apps/mobile/app/auth/_layout.tsx` - Re-add signup Stack.Screen now that route exists
- `apps/mobile/components/AuthFormLayout.tsx` - Shared auth form layout (extracted to reduce duplication)

## Files Changed (PR #25: Wire Auth to Supabase)
- `apps/mobile/app/_layout.tsx` - Wrap root layout with AuthProvider, add auth route to Stack navigator
- `apps/mobile/services/auth.ts` - resetPassword and updatePassword functions with Supabase
- `apps/mobile/services/__tests__/auth.test.ts` - 12 tests for auth service (success, failure, unconfigured, Error/string/unknown exceptions)
- `apps/mobile/services/index.ts` - Add auth service exports to barrel

## Learnings
- Copilot correctly identified missing `__esModule: true` and `default` exports in Jest mocks for ESM modules (expo-constants, async-storage)
- Copilot correctly identified need for error handling in async session initialization and unmount guards
- jest-expo/web preset requires `toJSON()` + `JSON.stringify()` pattern for text content checks (getByText doesn't always work)
- `@khepri/supabase-client` workspace package needs explicit `moduleNameMapper` in jest config
