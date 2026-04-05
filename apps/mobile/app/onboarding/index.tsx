import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { createAthlete, getAthleteByAuthUser } from '@khepri/supabase-client';

export default function WelcomeScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { user } = useAuth();
  const [isSkipping, setIsSkipping] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  /**
   * Ensure the athlete record exists before proceeding.
   * Both "Get Started" and "Skip" need this — the connect screen's
   * credentials edge function requires an athlete row.
   */
  const ensureAthleteExists = async (): Promise<boolean> => {
    if (!user?.id) {
      Alert.alert(
        'Email Not Confirmed',
        'Please confirm your email address before continuing. Check your inbox for a confirmation link.',
        [{ text: 'Go to Sign In', onPress: () => router.replace('/auth/login') }]
      );
      return false;
    }

    if (!supabase) {
      Alert.alert('Configuration Error', 'The app is not configured correctly. Please try again later.');
      return false;
    }

    try {
      const { data: existing, error: lookupError } = await getAthleteByAuthUser(supabase, user.id);
      if (existing) return true;

      // getAthleteByAuthUser uses .single(), so "no rows" produces an error
      // with PGRST116 code preserved in error.cause. Only proceed to create
      // for that expected case; surface other errors (network, RLS) to the user.
      const causeCode = (lookupError?.cause as { code?: string } | undefined)?.code;
      if (lookupError && causeCode !== 'PGRST116') {
        Alert.alert('Error', 'Failed to check your profile. Please try again.');
        return false;
      }

      const result = await createAthlete(supabase, { auth_user_id: user.id });
      if (result.error) {
        Alert.alert('Error', 'Failed to set up your profile. Please try again.');
        return false;
      }
      return true;
    } catch {
      Alert.alert('Error', 'Failed to set up your profile. Please try again.');
      return false;
    }
  };

  const handleGetStarted = async () => {
    setIsStarting(true);
    try {
      const ok = await ensureAthleteExists();
      if (ok) {
        router.push('/onboarding/connect');
      }
    } finally {
      setIsStarting(false);
    }
  };

  const handleSkip = async () => {
    setIsSkipping(true);
    try {
      const ok = await ensureAthleteExists();
      if (ok) {
        router.replace('/(tabs)');
      }
    } finally {
      setIsSkipping(false);
    }
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
            title={isStarting ? 'Setting up...' : 'Get Started'}
            onPress={handleGetStarted}
            disabled={isStarting || isSkipping}
            accessibilityLabel="Get started with onboarding"
          />
          <Button
            title={isSkipping ? 'Setting up...' : 'Skip for now'}
            variant="text"
            onPress={handleSkip}
            disabled={isSkipping || isStarting}
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
