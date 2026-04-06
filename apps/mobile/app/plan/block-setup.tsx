import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

import type { UnavailableDate } from '@khepri/core';
import { expandDateRange, groupUnavailableDates } from '@khepri/core';

import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { FormDatePicker } from '@/components/FormDatePicker';
import { LoadingState } from '@/components/LoadingState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useBlockPlanning } from '@/hooks/useBlockPlanning';

// ====================================================================
// Helpers
// ====================================================================

function formatGroupLabel(startDate: string, endDate: string): string {
  if (startDate === endDate) return startDate;
  return `${startDate} \u2013 ${endDate}`;
}

// ====================================================================
// Main Screen
// ====================================================================

export default function BlockSetupScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { season, step, error, isLoading, generateWorkouts } = useBlockPlanning();

  const [hoursMin, setHoursMin] = useState('8');
  const [hoursMax, setHoursMax] = useState('12');
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [reason, setReason] = useState('');
  const [unavailableDates, setUnavailableDates] = useState<readonly UnavailableDate[]>([]);

  const handleRangeSelect = useCallback((start: Date | null, end: Date | null) => {
    setRangeStart(start);
    setRangeEnd(end);
  }, []);

  const addUnavailableDates = useCallback(() => {
    if (rangeStart == null) return;

    const fromStr = rangeStart.toISOString().slice(0, 10);
    const toStr = rangeEnd == null ? fromStr : rangeEnd.toISOString().slice(0, 10);
    const newEntries = expandDateRange(fromStr, toStr, reason.trim() || undefined);

    if (newEntries.length === 0) return;

    setUnavailableDates((prev) => {
      const existingDates = new Set(prev.map((d) => d.date));
      const unique = newEntries.filter((e) => !existingDates.has(e.date));
      return [...prev, ...unique];
    });

    // Clear selection
    setRangeStart(null);
    setRangeEnd(null);
    setReason('');
  }, [rangeStart, rangeEnd, reason]);

  const removeGroup = useCallback((startDate: string, endDate: string, groupReason?: string) => {
    setUnavailableDates((prev) =>
      prev.filter((d) => {
        if (d.date < startDate || d.date > endDate) return true;
        return d.reason !== groupReason;
      })
    );
  }, []);

  const dateGroups = groupUnavailableDates(unavailableDates);

  // Derive validation inline — no submit-time check needed
  const parsedMin = Number.parseFloat(hoursMin);
  const parsedMax = Number.parseFloat(hoursMax);
  const hoursError = (() => {
    if (hoursMin.length === 0 || hoursMax.length === 0) return null;
    if (Number.isNaN(parsedMin) || parsedMin <= 0) return 'Min hours must be greater than 0';
    if (Number.isNaN(parsedMax) || parsedMax <= 0) return 'Max hours must be greater than 0';
    if (parsedMax < parsedMin) return 'Max hours must be ≥ min hours';
    return null;
  })();
  const hoursValid =
    !Number.isNaN(parsedMin) && !Number.isNaN(parsedMax) && parsedMin > 0 && parsedMax >= parsedMin;

  const handleGenerate = useCallback(async () => {
    const min = Number.parseFloat(hoursMin);
    const max = Number.parseFloat(hoursMax);
    if (Number.isNaN(min) || Number.isNaN(max) || min <= 0 || max < min) {
      return;
    }

    const success = await generateWorkouts({
      weeklyHoursMin: min,
      weeklyHoursMax: max,
      unavailableDates,
    });

    if (success) {
      router.push('/plan/block-review');
    }
  }, [hoursMin, hoursMax, unavailableDates, generateWorkouts]);

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <LoadingState message="Loading season data..." />
      </ThemedView>
    );
  }

  if (error != null && season == null) {
    return (
      <ThemedView style={styles.container}>
        <ErrorState message={error} title="Unable to load season" />
      </ThemedView>
    );
  }

  if (step === 'generating') {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <ThemedText type="subtitle" style={styles.loadingTitle}>
          Generating workouts
        </ThemedText>
        <ThemedText style={styles.loadingSubtitle}>
          Building your training block with optimal workout distribution...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Block info */}
        <View style={styles.header}>
          <ThemedText type="subtitle">Plan your next block</ThemedText>
          <ThemedText style={styles.description}>
            Confirm your hours and add any unavailable days for this training block.
          </ThemedText>
        </View>

        {error != null && (
          <ThemedText
            type="caption"
            style={[styles.errorText, { color: colors.error }]}
            accessibilityRole="alert"
          >
            {error}
          </ThemedText>
        )}

        {/* Weekly Hours */}
        <ThemedView style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Weekly hours for this block
          </ThemedText>
          <View style={styles.hoursRow}>
            <View style={styles.hoursInput}>
              <ThemedText type="caption">Min</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: hoursError != null ? colors.error : colors.border,
                    color: colors.text,
                    backgroundColor: colors.background,
                  },
                ]}
                value={hoursMin}
                onChangeText={setHoursMin}
                keyboardType="numeric"
                accessibilityLabel="Minimum weekly hours"
              />
            </View>
            <ThemedText style={styles.hoursSeparator}>{'\u2014'}</ThemedText>
            <View style={styles.hoursInput}>
              <ThemedText type="caption">Max</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: hoursError != null ? colors.error : colors.border,
                    color: colors.text,
                    backgroundColor: colors.background,
                  },
                ]}
                value={hoursMax}
                onChangeText={setHoursMax}
                keyboardType="numeric"
                accessibilityLabel="Maximum weekly hours"
              />
            </View>
            <ThemedText type="caption" style={styles.hoursUnit}>
              h/week
            </ThemedText>
          </View>
          {hoursError != null && (
            <ThemedText
              type="caption"
              style={[styles.hoursError, { color: colors.error }]}
              accessibilityRole="alert"
            >
              {hoursError}
            </ThemedText>
          )}
        </ThemedView>

        {/* Unavailable Days */}
        <ThemedView style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Unavailable days
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionDescription}>
            Add dates when you cannot train (e.g., vacation, travel).
          </ThemedText>

          <FormDatePicker
            mode="range"
            label="Date range"
            placeholder="Select dates"
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            onRangeSelect={handleRangeSelect}
            allowClear
          />

          <TextInput
            style={[
              styles.input,
              styles.reasonInput,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            value={reason}
            onChangeText={setReason}
            placeholder="Reason (e.g., Vacation, Work trip)"
            placeholderTextColor={colors.icon}
            accessibilityLabel="Unavailable reason"
          />

          <Button
            title="Add Unavailable Dates"
            onPress={addUnavailableDates}
            disabled={rangeStart == null}
            accessibilityLabel="Add unavailable dates"
          />

          {dateGroups.map((group) => {
            const key = `${group.startDate}-${group.endDate}-${group.reason ?? ''}`;
            return (
              <View key={key} style={styles.dateChip}>
                <View style={styles.chipTextContainer}>
                  <ThemedText type="caption">
                    {formatGroupLabel(group.startDate, group.endDate)}
                  </ThemedText>
                  {group.reason != null && (
                    <ThemedText type="caption" style={styles.chipReason}>
                      {group.reason}
                    </ThemedText>
                  )}
                </View>
                <Pressable
                  onPress={() => removeGroup(group.startDate, group.endDate, group.reason)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${formatGroupLabel(group.startDate, group.endDate)}`}
                >
                  <Ionicons name="close-circle" size={18} color={colors.error} />
                </Pressable>
              </View>
            );
          })}
        </ThemedView>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          title="Generate Workouts"
          onPress={handleGenerate}
          disabled={!hoursValid}
          accessibilityLabel="Generate workouts for this block"
        />
      </View>
    </ThemedView>
  );
}

// ====================================================================
// Styles
// ====================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    marginBottom: 24,
  },
  description: {
    marginTop: 8,
    opacity: 0.8,
    lineHeight: 22,
  },
  errorText: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionDescription: {
    marginBottom: 12,
    opacity: 0.7,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  hoursInput: {
    flex: 1,
    gap: 4,
  },
  hoursSeparator: {
    paddingBottom: 12,
  },
  hoursUnit: {
    paddingBottom: 12,
  },
  hoursError: {
    marginTop: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  reasonInput: {
    marginBottom: 12,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  chipTextContainer: {
    flex: 1,
    gap: 2,
  },
  chipReason: {
    opacity: 0.7,
  },
  actions: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  loadingTitle: {
    marginTop: 24,
    textAlign: 'center',
  },
  loadingSubtitle: {
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 22,
  },
});
