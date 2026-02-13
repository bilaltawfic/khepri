import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useOnboarding } from '@/contexts';

type FitnessInputProps = Readonly<{
  label: string;
  unit: string;
  placeholder: string;
  hint?: string;
  colorScheme: 'light' | 'dark';
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  accessibilityLabel?: string;
}>;

function FitnessInput({
  label,
  unit,
  placeholder,
  hint,
  colorScheme,
  value,
  onChangeText,
  error,
  accessibilityLabel,
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
              borderColor: error ? Colors[colorScheme].error : Colors[colorScheme].border,
            },
          ]}
          placeholder={placeholder}
          placeholderTextColor={Colors[colorScheme].textTertiary}
          keyboardType="numeric"
          value={value}
          onChangeText={onChangeText}
          accessibilityLabel={accessibilityLabel ?? label}
        />
        <View style={[styles.unitBadge, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
          <ThemedText type="caption">{unit}</ThemedText>
        </View>
      </View>
      {error && (
        <ThemedText
          type="caption"
          style={[styles.errorText, { color: Colors[colorScheme].error }]}
          accessibilityRole="alert"
        >
          {error}
        </ThemedText>
      )}
    </View>
  );
}

type FormData = {
  ftp: string;
  lthr: string;
  runThresholdPace: string;
  css: string;
  restingHR: string;
  maxHR: string;
};

const VALIDATION = {
  ftp: { min: 50, max: 500, label: 'FTP' },
  lthr: { min: 80, max: 200, label: 'LTHR' },
  restingHR: { min: 30, max: 100, label: 'Resting HR' },
  maxHR: { min: 100, max: 220, label: 'Max HR' },
} as const;

function validateNumber(value: string, min: number, max: number): boolean {
  if (!value.trim()) return true; // Empty is valid (optional fields)
  const num = Number(value);
  return !Number.isNaN(num) && Number.isInteger(num) && num >= min && num <= max;
}

export default function FitnessScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { data, setFitnessNumbers } = useOnboarding();

  const [formData, setFormData] = useState<FormData>({
    ftp: data.ftp?.toString() ?? '',
    lthr: '',
    runThresholdPace: '',
    css: '',
    restingHR: data.restingHR?.toString() ?? '',
    maxHR: data.maxHR?.toString() ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const updateField = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    for (const [field, config] of Object.entries(VALIDATION)) {
      const value = formData[field as keyof FormData];
      if (!validateNumber(value, config.min, config.max)) {
        newErrors[field as keyof FormData] =
          `${config.label} should be ${config.min}-${config.max}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validateForm()) return;

    setFitnessNumbers({
      ftp: formData.ftp ? Number(formData.ftp) : undefined,
      restingHR: formData.restingHR ? Number(formData.restingHR) : undefined,
      maxHR: formData.maxHR ? Number(formData.maxHR) : undefined,
    });

    router.push('/onboarding/goals');
  };

  const handleSkip = () => {
    router.push('/onboarding/goals');
  };

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            Your Fitness Numbers
          </ThemedText>
          <ThemedText style={styles.description}>
            Share your current fitness metrics so Khepri can personalize your training zones. Skip
            any you don't know - you can always add them later.
          </ThemedText>
        </View>

        {/* Info card */}
        <ThemedView
          style={[styles.infoCard, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
        >
          <Ionicons name="information-circle-outline" size={20} color={Colors[colorScheme].icon} />
          <ThemedText type="caption" style={styles.infoText}>
            If you connect Intervals.icu, these can be synced automatically from your profile.
          </ThemedText>
        </ThemedView>

        {/* Cycling metrics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bicycle" size={24} color={Colors[colorScheme].primary} />
            <ThemedText type="defaultSemiBold">Cycling</ThemedText>
          </View>

          <FitnessInput
            label="FTP (Functional Threshold Power)"
            unit="watts"
            placeholder="e.g., 250"
            hint="Your sustainable power for ~1 hour"
            colorScheme={colorScheme}
            value={formData.ftp}
            onChangeText={(text) => updateField('ftp', text)}
            error={errors.ftp}
          />

          <FitnessInput
            label="LTHR (Lactate Threshold Heart Rate)"
            unit="bpm"
            placeholder="e.g., 165"
            hint="Heart rate at threshold effort"
            colorScheme={colorScheme}
            value={formData.lthr}
            onChangeText={(text) => updateField('lthr', text)}
            error={errors.lthr}
          />
        </View>

        {/* Running metrics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="walk" size={24} color={Colors[colorScheme].primary} />
            <ThemedText type="defaultSemiBold">Running</ThemedText>
          </View>

          <FitnessInput
            label="Threshold Pace"
            unit="min/km"
            placeholder="e.g., 5:30"
            hint="Your sustainable pace for ~1 hour"
            colorScheme={colorScheme}
            value={formData.runThresholdPace}
            onChangeText={(text) => updateField('runThresholdPace', text)}
          />
        </View>

        {/* Swimming metrics */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="water" size={24} color={Colors[colorScheme].primary} />
            <ThemedText type="defaultSemiBold">Swimming</ThemedText>
          </View>

          <FitnessInput
            label="CSS (Critical Swim Speed)"
            unit="/100m"
            placeholder="e.g., 1:45"
            hint="Your threshold pace per 100m"
            colorScheme={colorScheme}
            value={formData.css}
            onChangeText={(text) => updateField('css', text)}
          />
        </View>

        {/* Heart rate */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart" size={24} color={Colors[colorScheme].primary} />
            <ThemedText type="defaultSemiBold">Heart Rate</ThemedText>
          </View>

          <FitnessInput
            label="Resting Heart Rate"
            unit="bpm"
            placeholder="e.g., 52"
            hint="Measure first thing in the morning"
            colorScheme={colorScheme}
            value={formData.restingHR}
            onChangeText={(text) => updateField('restingHR', text)}
            error={errors.restingHR}
          />

          <FitnessInput
            label="Max Heart Rate"
            unit="bpm"
            placeholder="e.g., 185"
            hint="From a max effort test or recent data"
            colorScheme={colorScheme}
            value={formData.maxHR}
            onChangeText={(text) => updateField('maxHR', text)}
            error={errors.maxHR}
          />
        </View>
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.actions}>
        <Button title="Continue" onPress={handleContinue} accessibilityLabel="Continue to goals" />
        <Button
          title="Skip - I'll add these later"
          variant="text"
          onPress={handleSkip}
          accessibilityLabel="Skip fitness numbers"
        />
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
  errorText: {
    marginTop: 4,
  },
  actions: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
});
