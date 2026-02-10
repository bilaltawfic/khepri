import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import { Button } from '@/components/Button';
import { FormInput } from '@/components/FormInput';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useAthleteProfile } from '@/hooks';

type FormData = {
  ftpWatts: string;
  runThresholdMin: string;
  runThresholdSec: string;
  cssMin: string;
  cssSec: string;
  restingHeartRate: string;
  maxHeartRate: string;
  lthr: string;
};

// Conversion helpers for pace (stored as total seconds in DB)
function secondsToMinSec(totalSeconds: number | null | undefined): { min: string; sec: string } {
  if (totalSeconds == null) return { min: '', sec: '' };
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return { min: String(min), sec: String(sec).padStart(2, '0') };
}

function minSecToSeconds(min: string, sec: string): number | null {
  const minNum = Number.parseInt(min || '0', 10);
  const secNum = Number.parseInt(sec || '0', 10);
  // If both input strings are empty, user hasn't entered anything - return null
  // Note: Inputs like min="0"/sec="" will return 0; whether 0 is acceptable is handled by validation logic elsewhere
  if (!min && !sec) return null;
  return minNum * 60 + secNum;
}

function numberToString(value: number | null | undefined): string {
  if (value == null) return '';
  return String(value);
}

function stringToNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isInteger(num) ? num : null;
}

// Validation helpers
function validateIntRange(value: string, min: number, max: number): boolean {
  if (!value) return true;
  const num = Number(value.trim());
  return Number.isInteger(num) && num >= min && num <= max;
}

function validatePace(
  minStr: string,
  secStr: string,
  minMin: number,
  minMax: number,
  secMin: number
): boolean {
  const min = Number.parseInt(minStr || '0', 10);
  const sec = Number.parseInt(secStr || '0', 10);
  return (
    min >= minMin && min <= minMax && sec >= 0 && sec <= 59 && !(min === minMin && sec < secMin)
  );
}

function validateFitnessForm(formData: FormData): Partial<Record<keyof FormData, string>> {
  const errors: Partial<Record<keyof FormData, string>> = {};

  if (formData.ftpWatts && !validateIntRange(formData.ftpWatts, 50, 500)) {
    errors.ftpWatts = 'FTP should be between 50-500 watts';
  }
  if (formData.restingHeartRate && !validateIntRange(formData.restingHeartRate, 30, 100)) {
    errors.restingHeartRate = 'Resting HR should be between 30-100 bpm';
  }
  if (formData.maxHeartRate && !validateIntRange(formData.maxHeartRate, 100, 220)) {
    errors.maxHeartRate = 'Max HR should be between 100-220 bpm';
  }
  if (formData.lthr && !validateIntRange(formData.lthr, 80, 200)) {
    errors.lthr = 'LTHR should be between 80-200 bpm';
  }
  if (
    (formData.runThresholdMin || formData.runThresholdSec) &&
    !validatePace(formData.runThresholdMin, formData.runThresholdSec, 2, 15, 0)
  ) {
    errors.runThresholdMin = 'Enter a valid pace (2:00 - 15:59 /km)';
  }
  if (
    (formData.cssMin || formData.cssSec) &&
    !validatePace(formData.cssMin, formData.cssSec, 0, 5, 30)
  ) {
    errors.cssMin = 'Enter a valid pace (0:30 - 5:59 /100m)';
  }

  return errors;
}

export default function FitnessNumbersScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { athlete, isLoading, error, updateProfile } = useAthleteProfile();
  const [formData, setFormData] = useState<FormData>({
    ftpWatts: '',
    runThresholdMin: '',
    runThresholdSec: '',
    cssMin: '',
    cssSec: '',
    restingHeartRate: '',
    maxHeartRate: '',
    lthr: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const hasInitializedForm = useRef(false);

  // Load athlete data into form when available (once only)
  useEffect(() => {
    if (athlete && !hasInitializedForm.current) {
      hasInitializedForm.current = true;
      const runPace = secondsToMinSec(athlete.running_threshold_pace_sec_per_km);
      const swimPace = secondsToMinSec(athlete.css_sec_per_100m);
      setFormData({
        ftpWatts: numberToString(athlete.ftp_watts),
        runThresholdMin: runPace.min,
        runThresholdSec: runPace.sec,
        cssMin: swimPace.min,
        cssSec: swimPace.sec,
        restingHeartRate: numberToString(athlete.resting_heart_rate),
        maxHeartRate: numberToString(athlete.max_heart_rate),
        lthr: numberToString(athlete.lthr),
      });
    }
  }, [athlete]);

  const validateForm = (): boolean => {
    const newErrors = validateFitnessForm(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateProfile({
        ftp_watts: stringToNumber(formData.ftpWatts),
        running_threshold_pace_sec_per_km: minSecToSeconds(
          formData.runThresholdMin,
          formData.runThresholdSec
        ),
        css_sec_per_100m: minSecToSeconds(formData.cssMin, formData.cssSec),
        resting_heart_rate: stringToNumber(formData.restingHeartRate),
        max_heart_rate: stringToNumber(formData.maxHeartRate),
        lthr: stringToNumber(formData.lthr),
      });

      if (result.success) {
        Alert.alert('Success', 'Fitness numbers saved successfully', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error ?? 'Failed to save fitness numbers');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for the field being edited
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    // Clear pace errors when editing either minutes or seconds field
    // Pace errors are stored on the minutes field, so we need to clear them
    // when editing the paired seconds field as well
    if (field === 'runThresholdSec' && errors.runThresholdMin) {
      setErrors((prev) => ({ ...prev, runThresholdMin: undefined }));
    }
    if (field === 'cssSec' && errors.cssMin) {
      setErrors((prev) => ({ ...prev, cssMin: undefined }));
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
          <ThemedText style={styles.loadingText}>Loading fitness numbers...</ThemedText>
        </View>
      </ScreenContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors[colorScheme].error} />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Button title="Go Back" onPress={() => router.back()} accessibilityLabel="Go back" />
        </View>
      </ScreenContainer>
    );
  }

  // No athlete profile available (user logged out or no profile row)
  if (!athlete) {
    return (
      <ScreenContainer>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={48} color={Colors[colorScheme].iconSecondary} />
          <ThemedText style={styles.errorText}>No athlete profile found</ThemedText>
          <Button title="Go Back" onPress={() => router.back()} accessibilityLabel="Go back" />
        </View>
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
          Your fitness numbers help Khepri calculate training zones and recommend appropriate
          intensities. All fields are optional.
        </ThemedText>

        {/* Intervals.icu Sync Tip */}
        <ThemedView style={[styles.tipCard, { borderColor: Colors[colorScheme].primary }]}>
          <Ionicons name="sync-outline" size={20} color={Colors[colorScheme].primary} />
          <ThemedText type="caption" style={styles.tipText}>
            Connect Intervals.icu in the Profile tab to automatically sync your fitness numbers from
            your training history.
          </ThemedText>
        </ThemedView>

        {/* Cycling Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bicycle-outline" size={24} color={Colors[colorScheme].primary} />
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Cycling
            </ThemedText>
          </View>

          <FormInput
            label="Functional Threshold Power (FTP)"
            value={formData.ftpWatts}
            onChangeText={(text) => updateField('ftpWatts', text)}
            placeholder="Enter your FTP"
            keyboardType="number-pad"
            unit="watts"
            error={errors.ftpWatts}
            helpText="Your best average power for a ~60 minute effort"
          />
        </View>

        {/* Running Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="walk-outline" size={24} color={Colors[colorScheme].primary} />
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Running
            </ThemedText>
          </View>

          <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
            Threshold Pace
          </ThemedText>
          <ThemedText type="caption" style={styles.fieldDescription}>
            Your best sustainable pace for ~60 minutes
          </ThemedText>
          <View style={styles.paceRow}>
            <View style={styles.paceInput}>
              <FormInput
                label=""
                accessibilityLabel="Run threshold pace minutes"
                value={formData.runThresholdMin}
                onChangeText={(text) => updateField('runThresholdMin', text)}
                placeholder="mm"
                keyboardType="number-pad"
                error={errors.runThresholdMin}
              />
            </View>
            <ThemedText style={styles.paceSeparator}>:</ThemedText>
            <View style={styles.paceInput}>
              <FormInput
                label=""
                accessibilityLabel="Run threshold pace seconds"
                value={formData.runThresholdSec}
                onChangeText={(text) => updateField('runThresholdSec', text)}
                placeholder="ss"
                keyboardType="number-pad"
              />
            </View>
            <ThemedText style={styles.paceUnit}>/km</ThemedText>
          </View>
        </View>

        {/* Swimming Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="water-outline" size={24} color={Colors[colorScheme].primary} />
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Swimming
            </ThemedText>
          </View>

          <ThemedText type="defaultSemiBold" style={styles.fieldLabel}>
            Critical Swim Speed (CSS)
          </ThemedText>
          <ThemedText type="caption" style={styles.fieldDescription}>
            Your threshold pace in the pool
          </ThemedText>
          <View style={styles.paceRow}>
            <View style={styles.paceInput}>
              <FormInput
                label=""
                accessibilityLabel="Swim CSS pace minutes"
                value={formData.cssMin}
                onChangeText={(text) => updateField('cssMin', text)}
                placeholder="mm"
                keyboardType="number-pad"
                error={errors.cssMin}
              />
            </View>
            <ThemedText style={styles.paceSeparator}>:</ThemedText>
            <View style={styles.paceInput}>
              <FormInput
                label=""
                accessibilityLabel="Swim CSS pace seconds"
                value={formData.cssSec}
                onChangeText={(text) => updateField('cssSec', text)}
                placeholder="ss"
                keyboardType="number-pad"
              />
            </View>
            <ThemedText style={styles.paceUnit}>/100m</ThemedText>
          </View>
        </View>

        {/* Heart Rate Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="heart-outline" size={24} color={Colors[colorScheme].primary} />
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Heart Rate
            </ThemedText>
          </View>

          <FormInput
            label="Resting Heart Rate"
            value={formData.restingHeartRate}
            onChangeText={(text) => updateField('restingHeartRate', text)}
            placeholder="Enter resting HR"
            keyboardType="number-pad"
            unit="bpm"
            error={errors.restingHeartRate}
            helpText="Measured first thing in the morning"
          />

          <FormInput
            label="Max Heart Rate"
            value={formData.maxHeartRate}
            onChangeText={(text) => updateField('maxHeartRate', text)}
            placeholder="Enter max HR"
            keyboardType="number-pad"
            unit="bpm"
            error={errors.maxHeartRate}
            helpText="Your highest recorded heart rate"
          />

          <FormInput
            label="Lactate Threshold Heart Rate (LTHR)"
            value={formData.lthr}
            onChangeText={(text) => updateField('lthr', text)}
            placeholder="Enter LTHR"
            keyboardType="number-pad"
            unit="bpm"
            error={errors.lthr}
            helpText="Heart rate at your lactate threshold"
          />
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          title={isSaving ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          disabled={isSaving}
          accessibilityLabel="Save fitness numbers"
        />
        <Button
          title="Cancel"
          variant="text"
          onPress={() => router.back()}
          disabled={isSaving}
          accessibilityLabel="Cancel and go back"
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    paddingHorizontal: 32,
  },
  errorText: {
    textAlign: 'center',
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  description: {
    marginBottom: 16,
    opacity: 0.8,
    lineHeight: 24,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    gap: 8,
    marginBottom: 24,
  },
  tipText: {
    flex: 1,
    lineHeight: 20,
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
  sectionTitle: {
    fontSize: 18,
  },
  fieldLabel: {
    marginBottom: 2,
  },
  fieldDescription: {
    marginBottom: 8,
  },
  paceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paceInput: {
    width: 80,
  },
  paceSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 4,
    marginBottom: 16,
  },
  paceUnit: {
    marginLeft: 8,
    marginBottom: 16,
    opacity: 0.7,
  },
  actions: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
});
