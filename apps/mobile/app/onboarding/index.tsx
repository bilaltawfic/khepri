import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { createAthlete } from '@khepri/supabase-client';

export default function WelcomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { user } = useAuth();
  const [isSkipping, setIsSkipping] = useState(false);

  const handleSkip = async () => {
    if (!user?.id) {
      Alert.alert(
        'Email Not Confirmed',
        'Please confirm your email address before continuing. Check your inbox for a confirmation link.',
        [{ text: 'Go to Sign In', onPress: () => router.replace('/auth/login') }]
      );
      return;
    }

    if (supabase) {
      setIsSkipping(true);
      // Create athlete record with defaults so the dashboard works
      await createAthlete(supabase, { auth_user_id: user.id });
      setIsSkipping(false);
    }

    router.replace('/(tabs)');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with logo area */}
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: Colors[colorScheme].primary }]}>
            <Ionicons name="sunny" size={48} color={Colors[colorScheme].textInverse} />
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
            Khepri is your personal AI coach powered by Claude. Get daily training recommendations
            based on your goals, recovery, and the latest exercise science.
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
            ].map((feature) => (
              <View key={feature.icon} style={styles.featureRow}>
                <Ionicons name={feature.icon} size={24} color={Colors[colorScheme].primary} />
                <ThemedText style={styles.featureText}>{feature.text}</ThemedText>
              </View>
            ))}
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <Button
            title="Get Started"
            onPress={() => router.push('/onboarding/connect')}
            accessibilityLabel="Get started with onboarding"
          />
          <Button
            title={isSkipping ? 'Setting up...' : 'Skip for now'}
            variant="text"
            onPress={handleSkip}
            disabled={isSkipping}
            accessibilityLabel="Skip onboarding"
          />
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
});
