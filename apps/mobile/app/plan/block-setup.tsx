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

import { Button } from '@/components/Button';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useBlockPlanning } from '@/hooks/useBlockPlanning';

// ====================================================================
// Main Screen
// ====================================================================

export default function BlockSetupScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { season, step, error, isLoading, generateWorkouts } = useBlockPlanning();

  const [hoursMin, setHoursMin] = useState('8');
  const [hoursMax, setHoursMax] = useState('12');
  const [unavailableInput, setUnavailableInput] = useState('');
  const [unavailableDates, setUnavailableDates] = useState<readonly string[]>([]);

  const addUnavailableDate = useCallback(() => {
    const trimmed = unavailableInput.trim();
    if (trimmed.length > 0 && !unavailableDates.includes(trimmed)) {
      setUnavailableDates((prev) => [...prev, trimmed]);
      setUnavailableInput('');
    }
  }, [unavailableInput, unavailableDates]);

  const removeUnavailableDate = useCallback((date: string) => {
    setUnavailableDates((prev) => prev.filter((d) => d !== date));
  }, []);

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
                    borderColor: colors.border,
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
            <ThemedText style={styles.hoursSeparator}>—</ThemedText>
            <View style={styles.hoursInput}>
              <ThemedText type="caption">Max</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.border,
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
        </ThemedView>

        {/* Unavailable Days */}
        <ThemedView style={[styles.card, { backgroundColor: colors.surface }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Unavailable days
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionDescription}>
            Add dates when you cannot train (e.g., vacation, travel).
          </ThemedText>
          <View style={styles.addRow}>
            <TextInput
              style={[
                styles.input,
                styles.dateInput,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.background,
                },
              ]}
              value={unavailableInput}
              onChangeText={setUnavailableInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.icon}
              accessibilityLabel="Unavailable date"
            />
            <Pressable
              onPress={addUnavailableDate}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Add unavailable date"
            >
              <Ionicons name="add" size={20} color={colors.textInverse} />
            </Pressable>
          </View>
          {unavailableDates.map((date) => (
            <View key={date} style={styles.dateChip}>
              <ThemedText type="caption">{date}</ThemedText>
              <Pressable
                onPress={() => removeUnavailableDate(date)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${date}`}
              >
                <Ionicons name="close-circle" size={18} color={colors.error} />
              </Pressable>
            </View>
          ))}
        </ThemedView>
      </ScrollView>

      <View style={styles.actions}>
        <Button
          title="Generate Workouts"
          onPress={handleGenerate}
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
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  addRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  dateInput: {
    flex: 1,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
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
