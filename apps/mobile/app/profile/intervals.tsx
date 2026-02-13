import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormInput } from '@/components/FormInput';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

type ConnectionStatus = 'not_connected' | 'connected';

type FormData = Readonly<{
  athleteId: string;
  apiKey: string;
}>;

const INITIAL_FORM_DATA: FormData = {
  athleteId: '',
  apiKey: '',
};

/**
 * Validate Intervals.icu Athlete ID format.
 * Format: "iXXXXX" where X is digits, or just digits.
 */
function isValidAthleteId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^i?\d+$/.test(trimmed);
}

/**
 * Validate API Key format.
 * API keys are typically 20+ character alphanumeric strings.
 */
function isValidApiKey(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[a-zA-Z0-9]{20,}$/.test(trimmed);
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
    Linking.openURL('https://intervals.icu/settings');
  };

  const handleConnect = async () => {
    const validationErrors = validateForm(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSaving(true);

    try {
      // TODO: Actually save credentials securely (P3-B-02)
      Alert.alert('Connection Settings Saved', 'Your Intervals.icu credentials have been saved.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
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
          onPress: () => {
            // TODO: Clear credentials from secure storage (P3-B-02)
            Alert.alert('Disconnected', 'Your Intervals.icu connection has been removed.');
          },
        },
      ]
    );
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
        <ThemedText style={styles.description}>
          Connect your Intervals.icu account to sync activities, wellness data, and training plans.
        </ThemedText>

        {/* Connection Status Card */}
        <ThemedView style={styles.statusCard}>
          <View
            style={styles.statusRow}
            accessibilityRole="summary"
            accessibilityLabel={`Connection status: ${isConnected ? 'Connected' : 'Not Connected'}`}
          >
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
              Find your API credentials in your Intervals.icu account settings under
              &quot;Developer&quot;.
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
