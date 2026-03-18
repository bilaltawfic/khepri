import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  type KeyboardTypeOptions,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

import { Button } from '@/components/Button';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useOnboarding } from '@/contexts';
import { getAthleteProfile } from '@/services/intervals';

type FitnessInputProps = Readonly<{
  label: string;
  unit: string;
  placeholder: string;
  hint?: string;
  colorScheme: 'light' | 'dark';
  value: string;
  onChangeText: (text: string) => void;
  error?: string;
  synced?: boolean;
  accessibilityLabel?: string;
  keyboardType?: KeyboardTypeOptions;
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
  synced,
  accessibilityLabel,
  keyboardType = 'numeric',
}: FitnessInputProps) {
  return (
    <View style={styles.inputGroup}>
      <View style={styles.labelRow}>
        <ThemedText type="defaultSemiBold" style={styles.inputLabel}>
          {label}
        </ThemedText>
        {synced && (
          <View style={styles.syncBadge}>
            <Ionicons name="sync-circle" size={14} color={Colors[colorScheme].primary} />
            <ThemedText
              type="caption"
              style={{ color: Colors[colorScheme].primary }}
              accessibilityLabel="Synced from Intervals.icu"
            >
              Synced
            </ThemedText>
          </View>
        )}
      </View>
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
          keyboardType={keyboardType}
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

/**
 * Parse a mm:ss string to total seconds. Returns null if invalid.
 */
function parseMmSsToSeconds(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (seconds >= 60) return null;
  return minutes * 60 + seconds;
}

/**
 * Convert total seconds to mm:ss display string.
 */
function secondsToMmSs(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

type SyncState =
  | { status: 'idle' }
  | { status: 'syncing' }
  | { status: 'synced'; fields: Set<keyof FormData> }
  | { status: 'error'; message: string };

export default function FitnessScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { data, setFitnessNumbers } = useOnboarding();

  const [formData, setFormData] = useState<FormData>({
    ftp: data.ftp?.toString() ?? '',
    lthr: data.lthr?.toString() ?? '',
    runThresholdPace: data.runThresholdPace == null ? '' : secondsToMmSs(data.runThresholdPace),
    css: data.css == null ? '' : secondsToMmSs(data.css),
    restingHR: data.restingHR?.toString() ?? '',
    maxHR: data.maxHR?.toString() ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [syncState, setSyncState] = useState<SyncState>({ status: 'idle' });
  const syncAttempted = useRef(false);

  const isConnected = data.intervalsAthleteId != null && data.intervalsApiKey != null;

  // Auto-sync from Intervals.icu when connected
  useEffect(() => {
    if (!isConnected || syncAttempted.current) return;
    syncAttempted.current = true;

    let cancelled = false;
    setSyncState({ status: 'syncing' });

    // Credentials are saved to the server during the connect screen flow.
    // The context check (isConnected) gates whether the user went through
    // that flow — the MCP gateway uses server-stored credentials for the API call.
    getAthleteProfile()
      .then((profile) => {
        if (cancelled) return;
        if (!profile) {
          setSyncState({ status: 'idle' });
          return;
        }

        const syncedFields = new Set<keyof FormData>();
        const updates: Partial<FormData> = {};

        if (profile.ftp != null) {
          updates.ftp = String(profile.ftp);
          syncedFields.add('ftp');
        }
        if (profile.lthr != null) {
          updates.lthr = String(profile.lthr);
          syncedFields.add('lthr');
        }
        if (profile.run_ftp != null) {
          updates.runThresholdPace = secondsToMmSs(profile.run_ftp);
          syncedFields.add('runThresholdPace');
        }
        if (profile.swim_ftp != null) {
          updates.css = secondsToMmSs(profile.swim_ftp);
          syncedFields.add('css');
        }
        if (profile.resting_hr != null) {
          updates.restingHR = String(profile.resting_hr);
          syncedFields.add('restingHR');
        }
        if (profile.max_hr != null) {
          updates.maxHR = String(profile.max_hr);
          syncedFields.add('maxHR');
        }

        if (syncedFields.size > 0) {
          setFormData((prev) => ({ ...prev, ...updates }));
          setSyncState({ status: 'synced', fields: syncedFields });
        } else {
          setSyncState({ status: 'idle' });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSyncState({ status: 'error', message: 'Could not sync from Intervals.icu' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isConnected]);

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

    // Validate mm:ss pace fields
    if (formData.runThresholdPace.trim() && parseMmSsToSeconds(formData.runThresholdPace) == null) {
      newErrors.runThresholdPace = 'Use mm:ss format (e.g., 5:30)';
    }
    if (formData.css.trim() && parseMmSsToSeconds(formData.css) == null) {
      newErrors.css = 'Use mm:ss format (e.g., 1:45)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (!validateForm()) return;

    setFitnessNumbers({
      ftp: formData.ftp ? Number(formData.ftp) : null,
      lthr: formData.lthr ? Number(formData.lthr) : null,
      runThresholdPace: formData.runThresholdPace
        ? parseMmSsToSeconds(formData.runThresholdPace)
        : null,
      css: formData.css ? parseMmSsToSeconds(formData.css) : null,
      restingHR: formData.restingHR ? Number(formData.restingHR) : null,
      maxHR: formData.maxHR ? Number(formData.maxHR) : null,
    });

    router.push('/onboarding/goals');
  };

  const isSynced = (field: keyof FormData): boolean =>
    syncState.status === 'synced' && syncState.fields.has(field);

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

        {/* Sync status card */}
        {syncState.status === 'syncing' && (
          <ThemedView
            style={[styles.infoCard, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
          >
            <ActivityIndicator size="small" color={Colors[colorScheme].primary} />
            <ThemedText type="caption" style={styles.infoText}>
              Syncing from Intervals.icu...
            </ThemedText>
          </ThemedView>
        )}
        {syncState.status === 'synced' && (
          <ThemedView
            style={[styles.infoCard, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
          >
            <Ionicons name="checkmark-circle" size={20} color={Colors[colorScheme].primary} />
            <ThemedText type="caption" style={styles.infoText}>
              Synced from Intervals.icu. You can edit any value below.
            </ThemedText>
          </ThemedView>
        )}
        {syncState.status === 'error' && (
          <ThemedView
            style={[styles.infoCard, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
          >
            <Ionicons name="warning-outline" size={20} color={Colors[colorScheme].error} />
            <ThemedText type="caption" style={styles.infoText}>
              {syncState.message}
            </ThemedText>
          </ThemedView>
        )}
        {syncState.status === 'idle' && (
          <ThemedView
            style={[styles.infoCard, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
          >
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={Colors[colorScheme].icon}
            />
            <ThemedText type="caption" style={styles.infoText}>
              If you connect Intervals.icu, these can be synced automatically from your profile.
            </ThemedText>
          </ThemedView>
        )}

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
            synced={isSynced('ftp')}
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
            synced={isSynced('lthr')}
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
            keyboardType="numbers-and-punctuation"
            synced={isSynced('runThresholdPace')}
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
            keyboardType="numbers-and-punctuation"
            synced={isSynced('css')}
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
            synced={isSynced('restingHR')}
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
            synced={isSynced('maxHR')}
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
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputLabel: {},
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
