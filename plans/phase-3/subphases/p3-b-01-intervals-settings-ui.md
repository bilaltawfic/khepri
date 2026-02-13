# P3-B-01: Create Intervals.icu Connection Settings UI

## Branch
```bash
git checkout feat/p3-b-01-intervals-settings-ui
```

## Goal

Create a profile settings screen where users can enter their Intervals.icu API credentials (Athlete ID and API Key). This screen provides the UI for connecting to Intervals.icu - the actual secure storage and API integration happen in subsequent PRs.

The screen will:
- Display connection status (not connected / connected)
- Allow users to enter Athlete ID and API Key
- Validate input format before saving
- Provide a way to disconnect (clear credentials)

## Files to Create

```
apps/mobile/app/profile/
├── intervals.tsx                    # Intervals.icu settings screen
└── __tests__/intervals.test.tsx     # Screen tests
```

## Files to Modify

```
apps/mobile/app/profile/_layout.tsx  # Add route to intervals screen
```

## Implementation Steps

### 1. Add Route to Profile Layout

Update `apps/mobile/app/profile/_layout.tsx` to add the intervals route:

```typescript
// Add to the Stack.Screen list:
<Stack.Screen
  name="intervals"
  options={{
    title: 'Intervals.icu',
    headerShown: true,
  }}
/>
```

### 2. Create intervals.tsx Screen

```typescript
// apps/mobile/app/profile/intervals.tsx

import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormInput } from '@/components/FormInput';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

type ConnectionStatus = 'not_connected' | 'connected';

type FormData = {
  athleteId: string;
  apiKey: string;
};

const INITIAL_FORM_DATA: FormData = {
  athleteId: '',
  apiKey: '',
};

/**
 * Validate Intervals.icu Athlete ID format.
 * Format: "iXXXXX" where X is digits, or just digits.
 */
function isValidAthleteId(value: string): boolean {
  if (!value.trim()) return false;
  // Accept either "i12345" format or just "12345"
  return /^i?\d+$/.test(value.trim());
}

/**
 * Validate API Key format.
 * API keys are typically 32+ character alphanumeric strings.
 */
function isValidApiKey(value: string): boolean {
  if (!value.trim()) return false;
  // API keys should be at least 20 chars, alphanumeric
  return /^[a-zA-Z0-9]{20,}$/.test(value.trim());
}

function validateForm(data: FormData): Partial<Record<keyof FormData, string>> {
  const errors: Partial<Record<keyof FormData, string>> = {};

  if (!data.athleteId.trim()) {
    errors.athleteId = 'Athlete ID is required';
  } else if (!isValidAthleteId(data.athleteId)) {
    errors.athleteId = 'Invalid format. Example: i12345 or 12345';
  }

  if (!data.apiKey.trim()) {
    errors.apiKey = 'API Key is required';
  } else if (!isValidApiKey(data.apiKey)) {
    errors.apiKey = 'Invalid API key format';
  }

  return errors;
}

export default function IntervalsSettingsScreen() {
  // TODO: Load actual connection status from secure storage (P3-B-02)
  const [connectionStatus] = useState<ConnectionStatus>('not_connected');
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  const isConnected = connectionStatus === 'connected';

  const handleOpenIntervalsHelp = () => {
    // Link to Intervals.icu API settings page
    Linking.openURL('https://intervals.icu/settings');
  };

  const handleConnect = async () => {
    // Validate form
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      // TODO: Actually save credentials securely (P3-B-02)
      // For now, just show success and go back
      Alert.alert(
        'Connection Settings Saved',
        'Your Intervals.icu credentials have been saved. Connection verification will be added soon.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Error', 'Failed to save connection settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Intervals.icu',
      'This will remove your stored credentials. You can reconnect anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            // TODO: Clear credentials from secure storage (P3-B-02)
            Alert.alert('Disconnected', 'Your Intervals.icu connection has been removed.');
          },
        },
      ]
    );
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <ThemedText style={styles.description}>
          Connect your Intervals.icu account to sync activities, wellness data, and training plans.
        </ThemedText>

        {/* Connection Status Card */}
        <ThemedView style={styles.statusCard}>
          <View style={styles.statusRow}>
            <ThemedText type="defaultSemiBold">Status</ThemedText>
            <ThemedText
              style={[
                styles.statusBadge,
                isConnected ? styles.statusConnected : styles.statusNotConnected,
              ]}
            >
              {isConnected ? 'Connected' : 'Not Connected'}
            </ThemedText>
          </View>
        </ThemedView>

        {/* Credentials Form */}
        {!isConnected && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              API Credentials
            </ThemedText>
            <ThemedText type="caption" style={styles.sectionDescription}>
              Find your API credentials in your Intervals.icu account settings under "Developer".
            </ThemedText>

            <FormInput
              label="Athlete ID"
              value={formData.athleteId}
              onChangeText={(text) => updateField('athleteId', text)}
              placeholder="e.g., i12345"
              error={errors.athleteId}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Intervals.icu Athlete ID"
            />

            <FormInput
              label="API Key"
              value={formData.apiKey}
              onChangeText={(text) => updateField('apiKey', text)}
              placeholder="Your API key"
              error={errors.apiKey}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Intervals.icu API Key"
            />

            <Button
              title="Find my credentials"
              variant="text"
              onPress={handleOpenIntervalsHelp}
              accessibilityLabel="Open Intervals.icu settings"
            />
          </View>
        )}

        {/* Connected State Info */}
        {isConnected && (
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Connected Account
            </ThemedText>
            <ThemedText style={styles.connectedInfo}>
              Your Intervals.icu account is connected. Khepri can now access your activities and
              wellness data to provide personalized coaching.
            </ThemedText>
          </View>
        )}

        {/* Help Section */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            About Intervals.icu
          </ThemedText>
          <ThemedText type="caption" style={styles.helpText}>
            Intervals.icu is a training analytics platform for endurance athletes. Connecting your
            account allows Khepri to access your training history and provide more personalized
            recommendations.
          </ThemedText>
          <ThemedText type="caption" style={styles.helpText}>
            Your credentials are stored securely and only used to fetch your data. You can
            disconnect at any time.
          </ThemedText>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {!isConnected ? (
          <>
            <Button
              title={isSaving ? 'Connecting...' : 'Connect'}
              onPress={handleConnect}
              disabled={isSaving}
              accessibilityLabel="Connect to Intervals.icu"
            />
            <Button
              title="Cancel"
              variant="text"
              onPress={() => router.back()}
              disabled={isSaving}
              accessibilityLabel="Cancel and go back"
            />
          </>
        ) : (
          <>
            <Button
              title="Disconnect"
              variant="secondary"
              onPress={handleDisconnect}
              accessibilityLabel="Disconnect Intervals.icu"
            />
            <Button
              title="Done"
              variant="text"
              onPress={() => router.back()}
              accessibilityLabel="Go back"
            />
          </>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  description: {
    marginBottom: 24,
    opacity: 0.8,
    lineHeight: 24,
  },
  statusCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    fontSize: 14,
  },
  statusConnected: {
    backgroundColor: '#22c55e20',
    color: '#22c55e',
  },
  statusNotConnected: {
    backgroundColor: '#64748b20',
    color: '#64748b',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  sectionDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  connectedInfo: {
    marginTop: 8,
    lineHeight: 22,
    opacity: 0.8,
  },
  helpText: {
    marginTop: 8,
    lineHeight: 20,
    opacity: 0.7,
  },
  actions: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
});
```

### 3. Create Test File

```typescript
// apps/mobile/app/profile/__tests__/intervals.test.tsx

import { fireEvent, render, screen } from '@testing-library/react-native';

import IntervalsSettingsScreen from '../intervals';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));

// Mock Linking
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

describe('IntervalsSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders connection status as not connected by default', () => {
    render(<IntervalsSettingsScreen />);

    expect(screen.getByText('Not Connected')).toBeTruthy();
  });

  it('renders Athlete ID and API Key inputs', () => {
    render(<IntervalsSettingsScreen />);

    expect(screen.getByLabelText('Intervals.icu Athlete ID')).toBeTruthy();
    expect(screen.getByLabelText('Intervals.icu API Key')).toBeTruthy();
  });

  it('shows validation error for empty Athlete ID', () => {
    render(<IntervalsSettingsScreen />);

    const connectButton = screen.getByLabelText('Connect to Intervals.icu');
    fireEvent.press(connectButton);

    expect(screen.getByText('Athlete ID is required')).toBeTruthy();
  });

  it('shows validation error for invalid Athlete ID format', () => {
    render(<IntervalsSettingsScreen />);

    const athleteIdInput = screen.getByLabelText('Intervals.icu Athlete ID');
    fireEvent.changeText(athleteIdInput, 'invalid-format!');

    const apiKeyInput = screen.getByLabelText('Intervals.icu API Key');
    fireEvent.changeText(apiKeyInput, 'abcdefghij1234567890valid');

    const connectButton = screen.getByLabelText('Connect to Intervals.icu');
    fireEvent.press(connectButton);

    expect(screen.getByText('Invalid format. Example: i12345 or 12345')).toBeTruthy();
  });

  it('shows validation error for empty API Key', () => {
    render(<IntervalsSettingsScreen />);

    const athleteIdInput = screen.getByLabelText('Intervals.icu Athlete ID');
    fireEvent.changeText(athleteIdInput, 'i12345');

    const connectButton = screen.getByLabelText('Connect to Intervals.icu');
    fireEvent.press(connectButton);

    expect(screen.getByText('API Key is required')).toBeTruthy();
  });

  it('shows validation error for short API Key', () => {
    render(<IntervalsSettingsScreen />);

    const athleteIdInput = screen.getByLabelText('Intervals.icu Athlete ID');
    fireEvent.changeText(athleteIdInput, 'i12345');

    const apiKeyInput = screen.getByLabelText('Intervals.icu API Key');
    fireEvent.changeText(apiKeyInput, 'short');

    const connectButton = screen.getByLabelText('Connect to Intervals.icu');
    fireEvent.press(connectButton);

    expect(screen.getByText('Invalid API key format')).toBeTruthy();
  });

  it('clears error when user starts typing', () => {
    render(<IntervalsSettingsScreen />);

    // Trigger validation error
    const connectButton = screen.getByLabelText('Connect to Intervals.icu');
    fireEvent.press(connectButton);
    expect(screen.getByText('Athlete ID is required')).toBeTruthy();

    // Start typing - error should clear
    const athleteIdInput = screen.getByLabelText('Intervals.icu Athlete ID');
    fireEvent.changeText(athleteIdInput, 'i');

    expect(screen.queryByText('Athlete ID is required')).toBeNull();
  });

  it('opens Intervals.icu settings when help link pressed', () => {
    const { Linking } = require('react-native/Libraries/Linking/Linking');
    render(<IntervalsSettingsScreen />);

    const helpButton = screen.getByLabelText('Open Intervals.icu settings');
    fireEvent.press(helpButton);

    expect(Linking.openURL).toHaveBeenCalledWith('https://intervals.icu/settings');
  });

  it('navigates back when cancel pressed', () => {
    const { router } = require('expo-router');
    render(<IntervalsSettingsScreen />);

    const cancelButton = screen.getByLabelText('Cancel and go back');
    fireEvent.press(cancelButton);

    expect(router.back).toHaveBeenCalled();
  });
});
```

## Verification

1. Run tests: `pnpm --filter mobile test -- intervals`
2. Run lint: `pnpm lint`
3. Manual testing:
   - Navigate to Profile → Intervals.icu
   - Verify "Not Connected" status shows
   - Test input validation (empty, invalid formats)
   - Test "Find my credentials" opens browser
   - Test Cancel button navigates back

## PR Guidelines

- Commit: `feat(mobile): add Intervals.icu connection settings UI`
- This PR creates the UI only; secure storage comes in P3-B-02
- Add accessibility labels for all interactive elements
- Follow existing profile screen patterns (personal-info.tsx)

## Dependencies

- None (first task in Workstream B)

## Enables

- P3-B-02: Store encrypted API credentials
