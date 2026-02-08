# Phase 1 Workstream C: Auth Foundation

## Goal

Implement authentication foundation in the mobile app using Supabase Auth, including auth context, login/signup screens, and protected route handling.

---

## Current State

- `packages/supabase-client/` has typed client with `createSupabaseClient()`
- Mobile app uses Expo Router (file-based routing)
- Component patterns exist: `Button`, `FormInput`, `ThemedText`, `ThemedView`
- Service pattern in `apps/mobile/services/` (see `notifications.ts`)
- No `apps/mobile/contexts/` directory
- No auth screens at `apps/mobile/app/auth/`

---

## Tasks (5 PRs)

### P1-C-01: Add auth context provider to mobile app
**Branch:** `feat/p1-c-01-auth-context`

**Dependencies to add:**
```json
{
  "@khepri/supabase-client": "workspace:*",
  "@supabase/supabase-js": "^2.49.1",
  "@react-native-async-storage/async-storage": "^2.1.2"
}
```

**Create files:**
- `apps/mobile/lib/supabase.ts` - Supabase client singleton with AsyncStorage
- `apps/mobile/contexts/AuthContext.tsx` - Auth state context and provider
- `apps/mobile/contexts/index.ts` - Re-exports
- `apps/mobile/__tests__/contexts/AuthContext.test.tsx`

**lib/supabase.ts pattern:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@khepri/supabase-client';
import Constants from 'expo-constants';

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl ??
  process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(
  supabaseUrl ?? '',
  supabaseAnonKey ?? '',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
```

**AuthContext.tsx pattern:**
```typescript
type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};
```

**Test:** Context provides auth state, throws when used outside provider

---

### P1-C-02: Create login screen UI
**Branch:** `feat/p1-c-02-login-screen`

**Create files:**
- `apps/mobile/app/auth/_layout.tsx` - Auth screens layout
- `apps/mobile/app/auth/login.tsx` - Login screen
- `apps/mobile/app/auth/__tests__/login.test.tsx`

**login.tsx features:**
- Email and password inputs with FormInput
- Client-side validation (required fields)
- Error display from auth failures
- Link to signup screen
- Keyboard avoiding view

**Test:** Screen renders, validates empty fields, calls signIn with credentials

---

### P1-C-03: Create signup screen UI
**Branch:** `feat/p1-c-03-signup-screen`

**Create files:**
- `apps/mobile/app/auth/signup.tsx` - Signup screen
- `apps/mobile/app/auth/__tests__/signup.test.tsx`

**signup.tsx features:**
- Email, password, confirm password inputs
- Validation: email format, password length (8+ chars), passwords match
- Link to login screen
- Redirects to onboarding on success

**Test:** Screen renders, validates email format, validates password match

---

### P1-C-04: Wire auth screens to Supabase auth
**Branch:** `feat/p1-c-04-wire-auth-supabase`

**Create/modify files:**
- `apps/mobile/services/auth.ts` - Auth service (password reset, etc.)
- `apps/mobile/app/_layout.tsx` - Wrap with AuthProvider

**Updated _layout.tsx:**
```typescript
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          {/* ... other screens */}
        </Stack>
      </ThemeProvider>
    </AuthProvider>
  );
}
```

**Test:** AuthProvider wraps app, auth state persists

---

### P1-C-05: Add protected route wrapper
**Branch:** `feat/p1-c-05-protected-route`

**Create files:**
- `apps/mobile/components/ProtectedRoute.tsx`
- `apps/mobile/components/__tests__/ProtectedRoute.test.tsx`

**ProtectedRoute.tsx pattern:**
```typescript
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { user, isLoading, isConfigured } = useAuth();

  // Dev mode: bypass auth when Supabase not configured
  if (!isConfigured) return <>{children}</>;

  // Show loading while checking auth state
  if (isLoading) return fallback ?? <ActivityIndicator />;

  // Redirect to login if not authenticated
  if (!user) return <Redirect href="/auth/login" />;

  return <>{children}</>;
}
```

**Usage in (tabs)/_layout.tsx:**
```typescript
export default function TabLayout() {
  return (
    <ProtectedRoute>
      <Tabs>
        {/* existing tab config */}
      </Tabs>
    </ProtectedRoute>
  );
}
```

**Test:** Loading state, redirect when unauthenticated, render children when authenticated

---

## Key Files Reference

| Purpose | File Path |
|---------|-----------|
| Supabase client pattern | `packages/supabase-client/src/client.ts` |
| Root layout to modify | `apps/mobile/app/_layout.tsx` |
| Component pattern | `apps/mobile/components/FormInput.tsx` |
| Test pattern | `apps/mobile/components/__tests__/Button.test.tsx` |

---

## Testing Approach

- Unit tests for AuthContext, auth service functions
- Component tests for login, signup, ProtectedRoute
- Use `@testing-library/react-native` with jest-expo
- Mock Supabase client in tests
- No integration tests with real Supabase in this workstream

---

## Verification

After all 5 PRs merged:
1. `pnpm test` passes in apps/mobile
2. App starts without errors
3. Unauthenticated users see login screen for protected routes
4. Login flow works with valid credentials
5. Signup flow redirects to onboarding
6. Session persists across app restarts
7. Logout clears session and redirects to login
