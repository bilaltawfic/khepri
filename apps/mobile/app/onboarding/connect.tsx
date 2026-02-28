import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useColorScheme } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useOnboarding } from '@/contexts';
import { useIntervalsConnection } from '@/hooks/useIntervalsConnection';

// =============================================================================
// Explainer section (IC-02)
// =============================================================================

function IntervalsExplainer({ colorScheme }: { readonly colorScheme: 'light' | 'dark' }) {
  const [expanded, setExpanded] = useState(false);

  const handleOpenSignUp = () => {
    Linking.openURL('https://intervals.icu');
  };

  return (
    <View style={styles.explainerContainer}>
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        style={[styles.explainerHeader, { backgroundColor: Colors[colorScheme].surface }]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel="What is Intervals.icu?"
      >
        <ThemedText type="defaultSemiBold" style={styles.explainerHeaderText}>
          What is Intervals.icu?
        </ThemedText>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors[colorScheme].textSecondary}
        />
      </Pressable>

      {expanded && (
        <View style={[styles.explainerBody, { backgroundColor: Colors[colorScheme].surface }]}>
          <ThemedText style={styles.explainerText}>
            Intervals.icu is a free training analytics platform for endurance athletes. It syncs
            with Garmin, Strava, and Wahoo to track your fitness (CTL), fatigue (ATL), and form
            (TSB).
          </ThemedText>

          <Pressable
            onPress={handleOpenSignUp}
            accessibilityRole="link"
            accessibilityLabel="Create a free Intervals.icu account"
            style={styles.signUpLink}
          >
            <ThemedText style={[styles.signUpLinkText, { color: Colors[colorScheme].primary }]}>
              Create a free account
            </ThemedText>
            <Ionicons name="open-outline" size={16} color={Colors[colorScheme].primary} />
          </Pressable>

          <ThemedText style={[styles.explainerHint, { color: Colors[colorScheme].textSecondary }]}>
            After creating your account, come back here to connect.
          </ThemedText>

          <View style={styles.credentialHelp}>
            <ThemedText style={styles.credentialHelpItem}>
              {'\u2022'} Athlete ID: Found in your Intervals.icu URL (e.g.,
              intervals.icu/athlete/i12345)
            </ThemedText>
            <ThemedText style={styles.credentialHelpItem}>
              {'\u2022'} API Key: Go to Settings {'>'} Developer Settings {'>'} API Key
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );
}

// =============================================================================
// Connected view (IC-03)
// =============================================================================

function ConnectedView({
  athleteId,
  colorScheme,
  onChangeAccount,
  onContinue,
}: {
  readonly athleteId: string;
  readonly colorScheme: 'light' | 'dark';
  readonly onChangeAccount: () => void;
  readonly onContinue: () => void;
}) {
  return (
    <View style={styles.connectedContainer}>
      <View style={[styles.successBanner, { backgroundColor: Colors[colorScheme].surface }]}>
        <Ionicons name="checkmark-circle" size={32} color={Colors[colorScheme].success} />
        <View style={styles.successTextContainer}>
          <ThemedText type="defaultSemiBold">Connected to Intervals.icu</ThemedText>
          <ThemedText style={{ color: Colors[colorScheme].textSecondary }}>
            Athlete ID: {athleteId}
          </ThemedText>
        </View>
      </View>

      <View style={styles.connectedActions}>
        <Button title="Continue" onPress={onContinue} accessibilityLabel="Continue to next step" />
        <Button
          title="Change Account"
          variant="text"
          onPress={onChangeAccount}
          accessibilityLabel="Change Intervals.icu account"
        />
      </View>
    </View>
  );
}

// =============================================================================
// Main screen (IC-03)
// =============================================================================

export default function ConnectScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { setIntervalsCredentials, clearIntervalsCredentials } = useOnboarding();
  const {
    status,
    isLoading: hookLoading,
    error: hookError,
    connect,
    disconnect,
  } = useIntervalsConnection();

  const [athleteId, setAthleteId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [justConnected, setJustConnected] = useState(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Determine if we're in the initial loading state (hook fetching status)
  const isInitialLoad = hookLoading && !isConnecting;

  const isConnectDisabled = !athleteId.trim() || !apiKey.trim() || isConnecting;

  // Auto-advance after successful connection
  useEffect(() => {
    if (justConnected && status.connected) {
      autoAdvanceTimer.current = setTimeout(() => {
        router.push('/onboarding/fitness');
      }, 1500);
    }

    return () => {
      if (autoAdvanceTimer.current != null) {
        clearTimeout(autoAdvanceTimer.current);
      }
    };
  }, [justConnected, status.connected]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await connect(athleteId.trim(), apiKey.trim());
      // Update onboarding context too
      setIntervalsCredentials({
        athleteId: athleteId.trim(),
        apiKey: apiKey.trim(),
      });
      setJustConnected(true);
    } catch {
      // Error is already set in the hook
    } finally {
      setIsConnecting(false);
    }
  }, [athleteId, apiKey, connect, setIntervalsCredentials]);

  const handleChangeAccount = useCallback(async () => {
    await disconnect();
    clearIntervalsCredentials();
    setAthleteId('');
    setApiKey('');
    setJustConnected(false);
  }, [disconnect, clearIntervalsCredentials]);

  const handleSkip = useCallback(() => {
    clearIntervalsCredentials();
    router.push('/onboarding/fitness');
  }, [clearIntervalsCredentials]);

  const handleContinue = useCallback(() => {
    router.push('/onboarding/fitness');
  }, []);

  // Show loading spinner during initial status check
  if (isInitialLoad) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
        </View>
      </ThemedView>
    );
  }

  // Show connected view if already connected (re-entry or just connected)
  if (status.connected && status.intervalsAthleteId) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.scrollContent}>
          {/* Header */}
          <View
            style={[styles.iconContainer, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
          >
            <Ionicons name="link" size={48} color={Colors[colorScheme].primary} />
          </View>

          <ThemedText type="subtitle" style={styles.title}>
            Connect Intervals.icu
          </ThemedText>

          <ConnectedView
            athleteId={status.intervalsAthleteId}
            colorScheme={colorScheme}
            onChangeAccount={handleChangeAccount}
            onContinue={handleContinue}
          />
        </View>
      </ThemedView>
    );
  }

  // Input view (IDLE / CONNECTING / ERROR)
  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        bottomOffset={20}
      >
        {/* Intervals.icu icon/illustration */}
        <View
          style={[styles.iconContainer, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
        >
          <Ionicons name="link" size={48} color={Colors[colorScheme].primary} />
        </View>

        <ThemedText type="subtitle" style={styles.title}>
          Connect Intervals.icu
        </ThemedText>

        <ThemedText style={styles.description}>
          Connect your Intervals.icu account to automatically sync your workouts, training load
          metrics, and calendar events. This allows Khepri to provide personalized recommendations
          based on your actual training data.
        </ThemedText>

        {/* Explainer section (IC-02) */}
        <IntervalsExplainer colorScheme={colorScheme} />

        {/* Connection benefits */}
        <ThemedView style={[styles.benefitsCard, { backgroundColor: Colors[colorScheme].surface }]}>
          <ThemedText type="defaultSemiBold" style={styles.benefitsTitle}>
            What you'll get:
          </ThemedText>
          {[
            'Automatic workout sync',
            'Real-time CTL/ATL/TSB metrics',
            'Training plan integration',
            'Workout push to calendar',
          ].map((benefit) => (
            <View key={benefit} style={styles.benefitRow}>
              <Ionicons name="checkmark" size={20} color={Colors[colorScheme].success} />
              <ThemedText style={styles.benefitText}>{benefit}</ThemedText>
            </View>
          ))}
        </ThemedView>

        {/* Error banner */}
        {hookError != null && (
          <View
            style={[styles.errorBanner, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
            accessibilityRole="alert"
          >
            <Ionicons name="alert-circle" size={20} color={Colors[colorScheme].error} />
            <ThemedText style={[styles.errorText, { color: Colors[colorScheme].error }]}>
              {hookError}
            </ThemedText>
          </View>
        )}

        {/* Credentials input */}
        <View style={styles.inputSection}>
          <ThemedText type="caption" style={styles.inputLabel}>
            Athlete ID
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: Colors[colorScheme].surface,
                color: Colors[colorScheme].text,
                borderColor:
                  hookError != null ? Colors[colorScheme].error : Colors[colorScheme].border,
              },
            ]}
            placeholder="Found in your Intervals.icu URL"
            placeholderTextColor={Colors[colorScheme].textTertiary}
            value={athleteId}
            onChangeText={setAthleteId}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isConnecting}
            accessibilityLabel="Athlete ID"
          />

          <ThemedText type="caption" style={styles.inputLabel}>
            API Key
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: Colors[colorScheme].surface,
                color: Colors[colorScheme].text,
                borderColor:
                  hookError != null ? Colors[colorScheme].error : Colors[colorScheme].border,
              },
            ]}
            placeholder="From Settings > API in Intervals.icu"
            placeholderTextColor={Colors[colorScheme].textTertiary}
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isConnecting}
            accessibilityLabel="API Key"
          />
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Button
            title={isConnecting ? 'Connecting...' : 'Connect Account'}
            onPress={handleConnect}
            disabled={isConnectDisabled}
            accessibilityLabel={
              isConnecting ? 'Connecting to Intervals.icu' : 'Connect Intervals.icu account'
            }
          />
          {isConnecting && (
            <ActivityIndicator
              size="small"
              color={Colors[colorScheme].primary}
              style={styles.connectingSpinner}
            />
          )}
          <Button
            title="Skip for now"
            variant="text"
            onPress={handleSkip}
            disabled={isConnecting}
            accessibilityLabel="Skip connection setup"
          />
        </View>
      </KeyboardAwareScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 24,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
    opacity: 0.8,
  },
  // Explainer section (IC-02)
  explainerContainer: {
    marginBottom: 16,
  },
  explainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
  },
  explainerHeaderText: {
    flex: 1,
  },
  explainerBody: {
    padding: 14,
    paddingTop: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    marginTop: -12,
  },
  explainerText: {
    lineHeight: 22,
    marginBottom: 12,
  },
  signUpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  signUpLinkText: {
    fontWeight: '600',
  },
  explainerHint: {
    fontSize: 13,
    marginBottom: 12,
  },
  credentialHelp: {
    gap: 4,
  },
  credentialHelpItem: {
    fontSize: 13,
    lineHeight: 20,
  },
  // Benefits card
  benefitsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  benefitsTitle: {
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  benefitText: {
    flex: 1,
  },
  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  // Input section
  inputSection: {
    gap: 8,
  },
  inputLabel: {
    marginLeft: 4,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 8,
  },
  // Actions
  actions: {
    marginTop: 'auto',
    paddingTop: 16,
    gap: 12,
  },
  connectingSpinner: {
    marginTop: -4,
  },
  // Connected view
  connectedContainer: {
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  successTextContainer: {
    flex: 1,
    gap: 4,
  },
  connectedActions: {
    marginTop: 'auto',
    paddingTop: 16,
    gap: 12,
  },
});
