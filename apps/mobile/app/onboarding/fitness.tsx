import { StyleSheet, View, Pressable, TextInput, ScrollView } from 'react-native';
import { useColorScheme } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

type FitnessInputProps = {
  label: string;
  unit: string;
  placeholder: string;
  hint?: string;
  colorScheme: 'light' | 'dark';
};

function FitnessInput({
  label,
  unit,
  placeholder,
  hint,
  colorScheme,
}: FitnessInputProps) {
  return (
    <View style={styles.inputGroup}>
      <ThemedText type="defaultSemiBold" style={styles.inputLabel}>
        {label}
      </ThemedText>
      {hint && (
        <ThemedText type="caption" style={styles.inputHint}>
          {hint}
        </ThemedText>
      )}
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme].surface,
              color: Colors[colorScheme].text,
              borderColor: Colors[colorScheme].border,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={Colors[colorScheme].textTertiary}
          keyboardType="numeric"
          editable={false}
        />
        <View
          style={[
            styles.unitBadge,
            { backgroundColor: Colors[colorScheme].surfaceVariant },
          ]}
        >
          <ThemedText type="caption">{unit}</ThemedText>
        </View>
      </View>
    </View>
  );
}

export default function FitnessScreen() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            Your Fitness Numbers
          </ThemedText>
          <ThemedText style={styles.description}>
            Share your current fitness metrics so Khepri can personalize your
            training zones. Skip any you don't know - you can always add them
            later.
          </ThemedText>
        </View>

        {/* Info card */}
        <ThemedView
          style={[
            styles.infoCard,
            { backgroundColor: Colors[colorScheme].surfaceVariant },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={Colors[colorScheme].icon}
          />
          <ThemedText type="caption" style={styles.infoText}>
            If you connect Intervals.icu, these can be synced automatically from
            your profile.
          </ThemedText>
        </ThemedView>

        {/* Cycling metrics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="bicycle"
              size={24}
              color={Colors[colorScheme].primary}
            />
            <ThemedText type="defaultSemiBold">Cycling</ThemedText>
          </View>

          <FitnessInput
            label="FTP (Functional Threshold Power)"
            unit="watts"
            placeholder="e.g., 250"
            hint="Your sustainable power for ~1 hour"
            colorScheme={colorScheme}
          />

          <FitnessInput
            label="LTHR (Lactate Threshold Heart Rate)"
            unit="bpm"
            placeholder="e.g., 165"
            hint="Heart rate at threshold effort"
            colorScheme={colorScheme}
          />
        </View>

        {/* Running metrics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="walk"
              size={24}
              color={Colors[colorScheme].primary}
            />
            <ThemedText type="defaultSemiBold">Running</ThemedText>
          </View>

          <FitnessInput
            label="Threshold Pace"
            unit="min/km"
            placeholder="e.g., 5:30"
            hint="Your sustainable pace for ~1 hour"
            colorScheme={colorScheme}
          />
        </View>

        {/* Swimming metrics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="water"
              size={24}
              color={Colors[colorScheme].primary}
            />
            <ThemedText type="defaultSemiBold">Swimming</ThemedText>
          </View>

          <FitnessInput
            label="CSS (Critical Swim Speed)"
            unit="/100m"
            placeholder="e.g., 1:45"
            hint="Your threshold pace per 100m"
            colorScheme={colorScheme}
          />
        </View>

        {/* Heart rate */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons
              name="heart"
              size={24}
              color={Colors[colorScheme].primary}
            />
            <ThemedText type="defaultSemiBold">Heart Rate</ThemedText>
          </View>

          <FitnessInput
            label="Resting Heart Rate"
            unit="bpm"
            placeholder="e.g., 52"
            hint="Measure first thing in the morning"
            colorScheme={colorScheme}
          />

          <FitnessInput
            label="Max Heart Rate"
            unit="bpm"
            placeholder="e.g., 185"
            hint="From a max effort test or recent data"
            colorScheme={colorScheme}
          />
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Link href="/onboarding/goals" asChild>
          <Pressable
            style={[
              styles.continueButton,
              { backgroundColor: Colors[colorScheme].primary },
            ]}
          >
            <ThemedText
              style={[
                styles.continueButtonText,
                { color: Colors[colorScheme].textInverse },
              ]}
            >
              Continue
            </ThemedText>
          </Pressable>
        </Link>

        <Link href="/onboarding/goals" asChild>
          <Pressable style={styles.skipButton}>
            <ThemedText
              style={[
                styles.skipButtonText,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              Skip - I'll add these later
            </ThemedText>
          </Pressable>
        </Link>
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
  header: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    opacity: 0.8,
    lineHeight: 24,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    marginBottom: 4,
  },
  inputHint: {
    marginBottom: 8,
    opacity: 0.7,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  unitBadge: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 60,
    alignItems: 'center',
  },
  actions: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  continueButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonText: {
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
