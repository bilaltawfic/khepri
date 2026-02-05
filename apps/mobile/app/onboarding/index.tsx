import { StyleSheet, View, Pressable } from 'react-native';
import { useColorScheme } from 'react-native';
import { Link, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

export default function WelcomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with logo area */}
        <View style={styles.header}>
          <View
            style={[
              styles.logoContainer,
              { backgroundColor: Colors[colorScheme].primary },
            ]}
          >
            <Ionicons
              name="sunny"
              size={48}
              color={Colors[colorScheme].textInverse}
            />
          </View>
          <ThemedText type="title" style={styles.title}>
            Khepri
          </ThemedText>
          <ThemedText type="caption" style={styles.tagline}>
            Your AI Triathlon Coach
          </ThemedText>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <ThemedText type="subtitle" style={styles.welcomeTitle}>
            Welcome to smarter training
          </ThemedText>
          <ThemedText style={styles.description}>
            Khepri is your personal AI coach powered by Claude. Get daily
            training recommendations based on your goals, recovery, and the
            latest exercise science.
          </ThemedText>

          {/* Feature highlights */}
          <View style={styles.features}>
            {[
              {
                icon: 'checkmark-circle' as const,
                text: 'Daily check-ins for personalized workouts',
              },
              {
                icon: 'sync' as const,
                text: 'Syncs with Intervals.icu for your data',
              },
              {
                icon: 'book' as const,
                text: 'Recommendations backed by science',
              },
              {
                icon: 'shield-checkmark' as const,
                text: 'Safety guardrails to prevent overtraining',
              },
            ].map((feature, index) => (
              <View key={index} style={styles.featureRow}>
                <Ionicons
                  name={feature.icon}
                  size={24}
                  color={Colors[colorScheme].primary}
                />
                <ThemedText style={styles.featureText}>{feature.text}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Link href="/onboarding/connect" asChild>
            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: Colors[colorScheme].primary },
              ]}
            >
              <ThemedText
                style={[
                  styles.primaryButtonText,
                  { color: Colors[colorScheme].textInverse },
                ]}
              >
                Get Started
              </ThemedText>
            </Pressable>
          </Link>

          <Pressable
            style={styles.skipButton}
            onPress={() => router.replace('/(tabs)')}
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
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    marginBottom: 4,
  },
  tagline: {
    opacity: 0.7,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeTitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    opacity: 0.8,
  },
  features: {
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    flex: 1,
  },
  actions: {
    paddingBottom: 24,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
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
