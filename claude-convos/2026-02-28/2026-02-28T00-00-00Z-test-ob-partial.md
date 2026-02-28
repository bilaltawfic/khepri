# Manual Testing: Onboarding (OB) Category - Partial Run

## Goals
- Manual testing of OB category test cases OB-01 through OB-04
- Fix failures immediately with separate commits
- Session handed off to another worker for OB-05 through OB-18

## Test Results

| ID | Use Case | Result | Notes |
|----|----------|--------|-------|
| OB-01 | Welcome screen display | PASS | |
| OB-02 | Email signup and onboarding redirect | PASS | Fixed in prior session |
| OB-03 | Connect Intervals.icu - skip flow | PASS | Fixed: disabled Connect button when fields empty |
| OB-04 | Intervals.icu connection - partial entry | PASS | Multiple fixes required (see below) |

## Fixes Applied

### 1. fix(mobile): disable Connect Account button when fields are empty
- **Test:** OB-03
- **Failure:** "Connect Account" button allowed proceeding with empty fields (same as Skip)
- **Root cause:** No disabled state on the button
- **Fix:** Added `isConnectDisabled` computed from field values, set `disabled` prop on Button

### 2. fix(mobile): make connect screen scrollable and prevent swipe dismiss
- **Test:** OB-04
- **Failure:** API Key field cut off screen; swiping down dismissed onboarding
- **Root cause:** No ScrollView wrapping content; onboarding presented as modal (`presentation: 'modal'`)
- **Fix:** Added ScrollView; removed modal presentation from _layout.tsx

### 3. fix(mobile): remove double top padding on onboarding sub-screens
- **Test:** OB-04
- **Failure:** Two nav bars worth of space at top of screen
- **Root cause:** ScreenContainer's SafeAreaView `edges={['top']}` + Stack header both adding top padding
- **Fix:** Replaced ScreenContainer with ThemedView on all four onboarding sub-screens

### 4. fix(mobile): use react-native-keyboard-controller for form keyboard handling
- **Test:** OB-04
- **Failure:** Keyboard covered input fields; built-in KeyboardAvoidingView didn't work with navigation header
- **Root cause:** RN's KeyboardAvoidingView is unreliable with Stack navigation headers
- **Fix:** Installed `react-native-keyboard-controller` (MIT, community standard endorsed by Expo and Reanimated team). Replaced KAV+ScrollView with KeyboardAwareScrollView on connect and fitness screens. Added KeyboardProvider to root layout.

### 5. fix(mobile): disable Connect button until both fields are filled
- **Test:** OB-04
- **Failure:** User suggested simpler UX than validation error
- **Fix:** Button stays disabled until both Athlete ID and API Key have values. Removed error state and validation logic entirely.

## Files Changed
- `apps/mobile/app/_layout.tsx` - KeyboardProvider wrapper, removed modal presentation
- `apps/mobile/app/onboarding/_layout.tsx` - No changes (reference only)
- `apps/mobile/app/onboarding/connect.tsx` - KeyboardAwareScrollView, button disable logic, removed error state
- `apps/mobile/app/onboarding/fitness.tsx` - KeyboardAwareScrollView, ScreenContainer removal
- `apps/mobile/app/onboarding/goals.tsx` - ScreenContainer removal
- `apps/mobile/app/onboarding/plan.tsx` - ScreenContainer removal
- `apps/mobile/app/onboarding/__tests__/connect.test.tsx` - Updated tests for button disabled state
- `apps/mobile/jest.setup.ts` - Added mock for react-native-keyboard-controller
- `apps/mobile/package.json` - Added react-native-keyboard-controller dependency
- `docs/testing/manual-test-cases.csv` - Updated OB-03, OB-04 results

## Learnings
- RN's built-in `KeyboardAvoidingView` is unreliable with navigation headers; use `react-native-keyboard-controller` instead
- `ScreenContainer` (SafeAreaView) should not be used inside Stack screens with `headerShown: true` - causes double top padding
- `presentation: 'modal'` on iOS enables swipe-down dismiss gesture
- `@react-navigation/elements` is a transitive dep that Metro can't resolve directly - don't import it
- Disabling buttons based on input state is simpler UX than validation errors for required-together fields
