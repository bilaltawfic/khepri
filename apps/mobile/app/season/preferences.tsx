import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View, useColorScheme } from 'react-native';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TipCard } from '@/components/TipCard';
import { Colors } from '@/constants/Colors';
import { type SeasonPreferencesInput, getMinHoursForRaces, useSeasonSetup } from '@/contexts';
import { seasonFormStyles } from './shared-styles';

// =============================================================================
// CONSTANTS
// =============================================================================

const DAYS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
] as const;

// =============================================================================
// DAY TOGGLE
// =============================================================================

type DayToggleProps = Readonly<{
  selectedDays: readonly number[];
  onChange: (days: number[]) => void;
  colorScheme: 'light' | 'dark';
}>;

function DayToggle({ selectedDays, onChange, colorScheme }: DayToggleProps) {
  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter((d) => d !== day));
    } else {
      onChange([...selectedDays, day]);
    }
  };

  return (
    <View style={styles.dayRow}>
      {DAYS.map(({ label, value }) => {
        const isSelected = selectedDays.includes(value);
        return (
          <Pressable
            key={value}
            style={[
              styles.dayChip,
              {
                backgroundColor: isSelected
                  ? Colors[colorScheme].primary
                  : Colors[colorScheme].surfaceVariant,
              },
            ]}
            onPress={() => toggleDay(value)}
            accessibilityLabel={`${label}: ${isSelected ? 'selected' : 'not selected'}`}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
          >
            <ThemedText
              style={{
                color: isSelected ? Colors[colorScheme].textInverse : Colors[colorScheme].text,
                fontSize: 13,
                fontWeight: isSelected ? '600' : '400',
              }}
            >
              {label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

// =============================================================================
// SPORT PRIORITY
// =============================================================================

type SportPriorityProps = Readonly<{
  sports: readonly string[];
  onChange: (sports: string[]) => void;
  colorScheme: 'light' | 'dark';
}>;

function SportPriority({ sports, onChange, colorScheme }: SportPriorityProps) {
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newSports = [...sports];
    [newSports[index - 1], newSports[index]] = [newSports[index], newSports[index - 1]];
    onChange(newSports);
  };

  const moveDown = (index: number) => {
    if (index === sports.length - 1) return;
    const newSports = [...sports];
    [newSports[index], newSports[index + 1]] = [newSports[index + 1], newSports[index]];
    onChange(newSports);
  };

  return (
    <View style={styles.sportList}>
      {sports.map((sport, index) => (
        <View
          key={sport}
          style={[styles.sportRow, { backgroundColor: Colors[colorScheme].surface }]}
        >
          <ThemedText style={styles.sportRank}>{index + 1}.</ThemedText>
          <ThemedText type="defaultSemiBold" style={styles.sportName}>
            {sport}
          </ThemedText>
          <View style={styles.sportActions}>
            <Pressable
              onPress={() => moveUp(index)}
              disabled={index === 0}
              accessibilityLabel={`Move ${sport} up`}
              accessibilityRole="button"
              accessibilityState={{ disabled: index === 0 }}
              hitSlop={4}
            >
              <Ionicons
                name="chevron-up"
                size={20}
                color={index === 0 ? Colors[colorScheme].textTertiary : Colors[colorScheme].primary}
              />
            </Pressable>
            <Pressable
              onPress={() => moveDown(index)}
              disabled={index === sports.length - 1}
              accessibilityLabel={`Move ${sport} down`}
              accessibilityRole="button"
              accessibilityState={{ disabled: index === sports.length - 1 }}
              hitSlop={4}
            >
              <Ionicons
                name="chevron-down"
                size={20}
                color={
                  index === sports.length - 1
                    ? Colors[colorScheme].textTertiary
                    : Colors[colorScheme].primary
                }
              />
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function PreferencesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { data, setPreferences } = useSeasonSetup();
  const prefs = data.preferences;

  const [hoursMin, setHoursMin] = useState(String(prefs.weeklyHoursMin));
  const [hoursMax, setHoursMax] = useState(String(prefs.weeklyHoursMax));
  const [trainingDays, setTrainingDays] = useState<number[]>([...prefs.trainingDays]);
  const [sportPriority, setSportPriority] = useState<string[]>([...prefs.sportPriority]);
  const [error, setError] = useState('');

  const hoursWarning = getHoursWarning(hoursMin, hoursMax, data.races);

  const handleContinue = () => {
    const min = Number(hoursMin);
    const max = Number(hoursMax);

    if (Number.isNaN(min) || Number.isNaN(max) || min < 1 || max < 1) {
      setError('Please enter valid weekly hours');
      return;
    }
    if (min > max) {
      setError('Minimum hours cannot exceed maximum');
      return;
    }
    if (trainingDays.length === 0) {
      setError('Please select at least one training day');
      return;
    }

    const updated: SeasonPreferencesInput = {
      weeklyHoursMin: min,
      weeklyHoursMax: max,
      trainingDays,
      sportPriority,
      dayConstraints: prefs.dayConstraints,
    };
    setPreferences(updated);
    router.push('/season/overview');
  };

  return (
    <ThemedView style={seasonFormStyles.container}>
      <ScrollView
        style={seasonFormStyles.scrollView}
        contentContainerStyle={seasonFormStyles.scrollContent}
      >
        <View style={seasonFormStyles.header}>
          <ThemedText type="subtitle" style={seasonFormStyles.title}>
            Training preferences
          </ThemedText>
          <ThemedText style={seasonFormStyles.description}>
            Set your weekly availability so Khepri builds a plan that fits your life.
          </ThemedText>
        </View>

        {/* Weekly hours */}
        <View style={[styles.section, { backgroundColor: Colors[colorScheme].surface }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
            Weekly training hours
          </ThemedText>
          <View style={styles.hoursRow}>
            <View style={styles.hoursInput}>
              <ThemedText type="caption">Min</ThemedText>
              <TextInput
                style={[
                  seasonFormStyles.formInput,
                  {
                    backgroundColor: Colors[colorScheme].surfaceVariant,
                    color: Colors[colorScheme].text,
                    borderColor: Colors[colorScheme].border,
                  },
                ]}
                value={hoursMin}
                onChangeText={(text) => {
                  setHoursMin(text);
                  if (error) setError('');
                }}
                keyboardType="numeric"
                accessibilityLabel="Minimum weekly hours"
              />
            </View>
            <ThemedText style={styles.hoursSeparator}>—</ThemedText>
            <View style={styles.hoursInput}>
              <ThemedText type="caption">Max</ThemedText>
              <TextInput
                style={[
                  seasonFormStyles.formInput,
                  {
                    backgroundColor: Colors[colorScheme].surfaceVariant,
                    color: Colors[colorScheme].text,
                    borderColor: Colors[colorScheme].border,
                  },
                ]}
                value={hoursMax}
                onChangeText={(text) => {
                  setHoursMax(text);
                  if (error) setError('');
                }}
                keyboardType="numeric"
                accessibilityLabel="Maximum weekly hours"
              />
            </View>
          </View>

          {hoursWarning != null && (
            <View
              style={[
                styles.warningBanner,
                { backgroundColor: `${Colors[colorScheme].warning}20` },
              ]}
            >
              <Ionicons name="warning" size={16} color={Colors[colorScheme].warning} />
              <ThemedText type="caption" style={styles.warningText}>
                {hoursWarning}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Training days */}
        <View style={[styles.section, { backgroundColor: Colors[colorScheme].surface }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
            Training days
          </ThemedText>
          <DayToggle
            selectedDays={trainingDays}
            onChange={setTrainingDays}
            colorScheme={colorScheme}
          />
        </View>

        {/* Sport priority */}
        <View style={[styles.section, { backgroundColor: Colors[colorScheme].surface }]}>
          <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
            Sport priority
          </ThemedText>
          <SportPriority
            sports={sportPriority}
            onChange={setSportPriority}
            colorScheme={colorScheme}
          />
        </View>

        {error ? (
          <ThemedText
            type="caption"
            style={[
              seasonFormStyles.errorText,
              { color: Colors[colorScheme].error, marginBottom: 16 },
            ]}
            accessibilityRole="alert"
          >
            {error}
          </ThemedText>
        ) : null}

        <TipCard message="Tip: Be honest about your available hours. Khepri will adjust intensity to maximize your results within your time budget." />
      </ScrollView>

      <View style={seasonFormStyles.actions}>
        <Button
          title="Generate Season Plan"
          onPress={handleContinue}
          accessibilityLabel="Generate season plan"
        />
      </View>
    </ThemedView>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function getHoursWarning(
  hoursMinStr: string,
  hoursMaxStr: string,
  races: readonly {
    name: string;
    date: string;
    discipline: string;
    distance: string;
    priority: 'A' | 'B' | 'C';
  }[]
): string | null {
  const maxTrimmed = hoursMaxStr.trim();
  if (maxTrimmed === '') return null;
  const maxHours = Number(maxTrimmed);
  if (Number.isNaN(maxHours) || maxHours <= 0) return null;

  const minTrimmed = hoursMinStr.trim();
  const minHours = minTrimmed === '' ? 0 : Number(minTrimmed);
  if (!Number.isNaN(minHours) && minHours > maxHours) {
    return 'Maximum hours must be at least equal to minimum';
  }

  const minReq = getMinHoursForRaces(races);
  if (minReq != null && maxHours < minReq.minHours) {
    return `${maxHours}h/week is below the recommended ${minReq.minHours}h minimum for ${minReq.raceType}`;
  }
  return null;
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  section: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionLabel: {
    marginBottom: 12,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  hoursInput: {
    flex: 1,
    gap: 4,
  },
  hoursSeparator: {
    paddingBottom: 12,
    fontSize: 20,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  warningText: {
    flex: 1,
  },
  dayRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  dayChip: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportList: {
    gap: 8,
  },
  sportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  sportRank: {
    width: 24,
    fontWeight: '600',
  },
  sportName: {
    flex: 1,
  },
  sportActions: {
    flexDirection: 'row',
    gap: 8,
  },
});
