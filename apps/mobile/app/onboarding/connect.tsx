import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useColorScheme } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useOnboarding } from '@/contexts';

export default function ConnectScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { data, setIntervalsCredentials, clearIntervalsCredentials } = useOnboarding();

  // Initialize from context if navigating back
  const [athleteId, setAthleteId] = useState(data.intervalsAthleteId ?? '');
  const [apiKey, setApiKey] = useState(data.intervalsApiKey ?? '');

  const isConnectDisabled = !athleteId.trim() || !apiKey.trim();

  const handleConnect = () => {
    // Store credentials
    setIntervalsCredentials({
      athleteId: athleteId.trim(),
      apiKey: apiKey.trim(),
    });

    router.push('/onboarding/fitness');
  };

  const handleSkip = () => {
    // Clear any previously saved credentials when skipping
    clearIntervalsCredentials();
    router.push('/onboarding/fitness');
  };

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
                borderColor: Colors[colorScheme].border,
              },
            ]}
            placeholder="Found in your Intervals.icu URL"
            placeholderTextColor={Colors[colorScheme].textTertiary}
            value={athleteId}
            onChangeText={setAthleteId}
            autoCapitalize="none"
            autoCorrect={false}
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
                borderColor: Colors[colorScheme].border,
              },
            ]}
            placeholder="From Settings > API in Intervals.icu"
            placeholderTextColor={Colors[colorScheme].textTertiary}
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="API Key"
          />
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Button
            title="Connect Account"
            onPress={handleConnect}
            disabled={isConnectDisabled}
            accessibilityLabel="Connect Intervals.icu account"
          />
          <Button
            title="Skip for now"
            variant="text"
            onPress={handleSkip}
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
    marginBottom: 24,
    lineHeight: 24,
    opacity: 0.8,
  },
  benefitsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
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
  actions: {
    marginTop: 'auto',
    paddingTop: 16,
    gap: 12,
  },
});
