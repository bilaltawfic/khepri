import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { FormInput } from '@/components/FormInput';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

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

// Mock initial data - will be replaced with real data from Supabase
const initialData: FormData = {
  ftpWatts: '',
  runThresholdMin: '',
  runThresholdSec: '',
  cssMin: '',
  cssSec: '',
  restingHeartRate: '',
  maxHeartRate: '',
  lthr: '',
};

export default function FitnessNumbersScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const [formData, setFormData] = useState<FormData>(initialData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (formData.ftpWatts) {
      const ftp = Number.parseInt(formData.ftpWatts, 10);
      if (Number.isNaN(ftp) || ftp < 50 || ftp > 500) {
        newErrors.ftpWatts = 'FTP should be between 50-500 watts';
      }
    }

    if (formData.restingHeartRate) {
      const rhr = Number.parseInt(formData.restingHeartRate, 10);
      if (Number.isNaN(rhr) || rhr < 30 || rhr > 100) {
        newErrors.restingHeartRate = 'Resting HR should be between 30-100 bpm';
      }
    }

    if (formData.maxHeartRate) {
      const mhr = Number.parseInt(formData.maxHeartRate, 10);
      if (Number.isNaN(mhr) || mhr < 100 || mhr > 220) {
        newErrors.maxHeartRate = 'Max HR should be between 100-220 bpm';
      }
    }

    if (formData.lthr) {
      const lthr = Number.parseInt(formData.lthr, 10);
      if (Number.isNaN(lthr) || lthr < 80 || lthr > 200) {
        newErrors.lthr = 'LTHR should be between 80-200 bpm';
      }
    }

    // Validate pace entries (minutes should be reasonable)
    if (formData.runThresholdMin || formData.runThresholdSec) {
      const min = Number.parseInt(formData.runThresholdMin || '0', 10);
      const sec = Number.parseInt(formData.runThresholdSec || '0', 10);
      if (min < 2 || min > 15 || sec < 0 || sec > 59) {
        newErrors.runThresholdMin = 'Enter a valid pace (2:00 - 15:59 /km)';
      }
    }

    if (formData.cssMin || formData.cssSec) {
      const min = Number.parseInt(formData.cssMin || '0', 10);
      const sec = Number.parseInt(formData.cssSec || '0', 10);
      if (min < 0 || min > 5 || sec < 0 || sec > 59 || (min === 0 && sec < 30)) {
        newErrors.cssMin = 'Enter a valid pace (0:30 - 5:59 /100m)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    // TODO: Save to Supabase
    Alert.alert('Success', 'Fitness numbers saved successfully', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

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
          title="Save Changes"
          onPress={handleSave}
          accessibilityLabel="Save fitness numbers"
        />
        <Button
          title="Cancel"
          variant="text"
          onPress={() => router.back()}
          accessibilityLabel="Cancel and go back"
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
