import { StyleSheet, View, Pressable, TextInput } from 'react-native';
import { useColorScheme } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

export default function ConnectScreen() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ScreenContainer>
      <View style={styles.content}>
        {/* Intervals.icu icon/illustration */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: Colors[colorScheme].surfaceVariant },
          ]}
        >
          <Ionicons
            name="link"
            size={48}
            color={Colors[colorScheme].primary}
          />
        </View>

        <ThemedText type="subtitle" style={styles.title}>
          Connect Intervals.icu
        </ThemedText>

        <ThemedText style={styles.description}>
          Connect your Intervals.icu account to automatically sync your workouts,
          training load metrics, and calendar events. This allows Khepri to
          provide personalized recommendations based on your actual training
          data.
        </ThemedText>

        {/* Connection benefits */}
        <ThemedView
          style={[
            styles.benefitsCard,
            { backgroundColor: Colors[colorScheme].surface },
          ]}
        >
          <ThemedText type="defaultSemiBold" style={styles.benefitsTitle}>
            What you'll get:
          </ThemedText>
          {[
            'Automatic workout sync',
            'Real-time CTL/ATL/TSB metrics',
            'Training plan integration',
            'Workout push to calendar',
          ].map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <Ionicons
                name="checkmark"
                size={20}
                color={Colors[colorScheme].success}
              />
              <ThemedText style={styles.benefitText}>{benefit}</ThemedText>
            </View>
          ))}
        </ThemedView>

        {/* API Key input placeholder */}
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
            editable={false}
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
            secureTextEntry
            editable={false}
          />
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Link href="/onboarding/fitness" asChild>
          <Pressable
            style={[
              styles.connectButton,
              { backgroundColor: Colors[colorScheme].primary },
            ]}
            accessibilityLabel="Connect Intervals.icu account"
            accessibilityRole="button"
          >
            <ThemedText
              style={[
                styles.connectButtonText,
                { color: Colors[colorScheme].textInverse },
              ]}
            >
              Connect Account
            </ThemedText>
          </Pressable>
        </Link>

        <Link href="/onboarding/fitness" asChild>
          <Pressable
            style={styles.skipButton}
            accessibilityLabel="Skip connection setup"
            accessibilityRole="button"
          >
            <ThemedText
              style={[
                styles.skipButtonText,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              Skip for now
            </ThemedText>
          </Pressable>
        </Link>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: 24,
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
    paddingBottom: 24,
    gap: 12,
  },
  connectButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  connectButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
  },
});
