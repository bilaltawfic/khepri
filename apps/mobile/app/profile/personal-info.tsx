import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { FormDatePicker } from '@/components/FormDatePicker';
import { FormInput } from '@/components/FormInput';
import { FormSelect, type SelectOption } from '@/components/FormSelect';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAthleteProfile } from '@/hooks';
import type { PreferredUnits } from '@khepri/supabase-client';
import { useColorScheme } from 'react-native';

type FormData = {
  displayName: string;
  dateOfBirth: Date | null;
  weightKg: string;
  heightCm: string;
  preferredUnits: PreferredUnits;
  timezone: string;
};

const unitOptions: SelectOption<PreferredUnits>[] = [
  { label: 'Metric (kg, km, m)', value: 'metric' },
  { label: 'Imperial (lbs, mi, ft)', value: 'imperial' },
];

// Common timezones
const timezoneOptions: SelectOption[] = [
  { label: 'UTC', value: 'UTC' },
  { label: 'US/Eastern', value: 'America/New_York' },
  { label: 'US/Central', value: 'America/Chicago' },
  { label: 'US/Mountain', value: 'America/Denver' },
  { label: 'US/Pacific', value: 'America/Los_Angeles' },
  { label: 'Europe/London', value: 'Europe/London' },
  { label: 'Europe/Paris', value: 'Europe/Paris' },
  { label: 'Europe/Berlin', value: 'Europe/Berlin' },
  { label: 'Asia/Tokyo', value: 'Asia/Tokyo' },
  { label: 'Asia/Singapore', value: 'Asia/Singapore' },
  { label: 'Australia/Sydney', value: 'Australia/Sydney' },
];

const INITIAL_FORM_DATA: FormData = {
  displayName: '',
  dateOfBirth: null,
  weightKg: '',
  heightCm: '',
  preferredUnits: 'metric',
  timezone: 'UTC',
};

// Validation ranges by unit type
const WEIGHT_RANGES = {
  metric: { min: 20, max: 300, unit: 'kg' },
  imperial: { min: 44, max: 660, unit: 'lbs' },
};
const HEIGHT_RANGES = {
  metric: { min: 100, max: 250, unit: 'cm' },
  imperial: { min: 39, max: 98, unit: 'in' },
};

function validateNumber(value: string, min: number, max: number): boolean {
  if (!value) return true;
  const num = Number.parseFloat(value);
  return !Number.isNaN(num) && num >= min && num <= max;
}

function validatePersonalInfoForm(data: FormData): Partial<Record<keyof FormData, string>> {
  const errors: Partial<Record<keyof FormData, string>> = {};
  const weightRange = WEIGHT_RANGES[data.preferredUnits];
  const heightRange = HEIGHT_RANGES[data.preferredUnits];

  if (!data.displayName.trim()) {
    errors.displayName = 'Display name is required';
  }
  if (data.weightKg && !validateNumber(data.weightKg, weightRange.min, weightRange.max)) {
    errors.weightKg = `Please enter a valid weight (${weightRange.min}-${weightRange.max} ${weightRange.unit})`;
  }
  if (data.heightCm && !validateNumber(data.heightCm, heightRange.min, heightRange.max)) {
    errors.heightCm = `Please enter a valid height (${heightRange.min}-${heightRange.max} ${heightRange.unit})`;
  }

  return errors;
}

/**
 * Check if a value is a valid PreferredUnits type at runtime
 */
function isPreferredUnits(value: unknown): value is PreferredUnits {
  return value === 'metric' || value === 'imperial';
}

export default function PersonalInfoScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { athlete, isLoading, error, updateProfile } = useAthleteProfile();

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Populate form with athlete data when loaded
  useEffect(() => {
    if (athlete) {
      setFormData({
        displayName: athlete.display_name ?? '',
        dateOfBirth: athlete.date_of_birth ? new Date(athlete.date_of_birth) : null,
        // Use nullish check: athlete.weight_kg can be 0 (though unlikely)
        weightKg: athlete.weight_kg != null ? String(athlete.weight_kg) : '',
        heightCm: athlete.height_cm != null ? String(athlete.height_cm) : '',
        preferredUnits: isPreferredUnits(athlete.preferred_units)
          ? athlete.preferred_units
          : 'metric',
        timezone: athlete.timezone ?? 'UTC',
      });
    }
  }, [athlete]);

  const validateForm = (): boolean => {
    const newErrors = validatePersonalInfoForm(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    const result = await updateProfile({
      display_name: formData.displayName.trim(),
      date_of_birth: formData.dateOfBirth ? formData.dateOfBirth.toISOString().slice(0, 10) : null,
      // Parse weight/height to numbers, or null if empty
      weight_kg: formData.weightKg ? Number.parseFloat(formData.weightKg) : null,
      height_cm: formData.heightCm ? Number.parseFloat(formData.heightCm) : null,
      preferred_units: formData.preferredUnits,
      timezone: formData.timezone,
    });

    setIsSaving(false);

    if (result.success) {
      Alert.alert('Success', 'Personal information saved successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } else {
      Alert.alert('Error', result.error ?? 'Failed to save changes');
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Calculate max date for DOB (must be at least 10 years old)
  const maxDobDate = new Date();
  maxDobDate.setFullYear(maxDobDate.getFullYear() - 10);

  // Calculate min date for DOB (must be less than 100 years old)
  const minDobDate = new Date();
  minDobDate.setFullYear(minDobDate.getFullYear() - 100);

  // Show loading state while fetching athlete data
  if (isLoading) {
    return (
      <ScreenContainer>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={Colors[colorScheme].primary}
            accessibilityLabel="Loading profile"
          />
          <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
        </ThemedView>
      </ScreenContainer>
    );
  }

  // Show error state if failed to load
  if (error) {
    return (
      <ScreenContainer>
        <ThemedView style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Button title="Go Back" onPress={() => router.back()} accessibilityLabel="Go back" />
        </ThemedView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ThemedText style={styles.description}>
          Update your personal information. This helps Khepri personalize your training
          recommendations.
        </ThemedText>

        {/* Basic Info Section */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Basic Information
          </ThemedText>

          <FormInput
            label="Display Name"
            value={formData.displayName}
            onChangeText={(text) => updateField('displayName', text)}
            placeholder="Enter your name"
            error={errors.displayName}
            autoCapitalize="words"
          />

          <FormDatePicker
            label="Date of Birth"
            value={formData.dateOfBirth}
            onChange={(date) => updateField('dateOfBirth', date)}
            placeholder="Select your date of birth"
            minimumDate={minDobDate}
            maximumDate={maxDobDate}
            helpText="Used to calculate age-appropriate training zones"
            allowClear
          />
        </View>

        {/* Physical Stats Section */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Physical Stats
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionDescription}>
            These are optional but help with power-to-weight calculations and training load
            estimates.
          </ThemedText>

          <FormInput
            label="Weight"
            value={formData.weightKg}
            onChangeText={(text) => updateField('weightKg', text)}
            placeholder="Enter your weight"
            keyboardType="decimal-pad"
            unit={formData.preferredUnits === 'metric' ? 'kg' : 'lbs'}
            error={errors.weightKg}
          />

          <FormInput
            label="Height"
            value={formData.heightCm}
            onChangeText={(text) => updateField('heightCm', text)}
            placeholder="Enter your height"
            keyboardType="decimal-pad"
            unit={formData.preferredUnits === 'metric' ? 'cm' : 'in'}
            error={errors.heightCm}
          />
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Preferences
          </ThemedText>

          <FormSelect
            label="Units"
            value={formData.preferredUnits}
            options={unitOptions}
            onChange={(value) => updateField('preferredUnits', value)}
            helpText="Used for displaying distances, weights, and paces"
          />

          <FormSelect
            label="Timezone"
            value={formData.timezone}
            options={timezoneOptions}
            onChange={(value) => updateField('timezone', value)}
            helpText="Used for scheduling daily check-ins"
          />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title={isSaving ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          disabled={isSaving}
          accessibilityLabel="Save personal info"
          accessibilityState={{ disabled: isSaving }}
        />
        <Button
          title="Cancel"
          variant="text"
          onPress={() => router.back()}
          disabled={isSaving}
          accessibilityLabel="Cancel and go back"
          accessibilityState={{ disabled: isSaving }}
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
  description: {
    marginBottom: 24,
    opacity: 0.8,
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  sectionDescription: {
    marginBottom: 16,
  },
  actions: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 24,
  },
  errorText: {
    textAlign: 'center',
    opacity: 0.8,
  },
});
