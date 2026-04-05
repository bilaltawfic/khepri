import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { formatDateLocal, parseDateOnly } from '@khepri/core';
import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PrioritySelector } from '@/components/PrioritySelector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TipCard } from '@/components/TipCard';
import { Colors } from '@/constants/Colors';
import { MAX_RACES, RACE_DISTANCES, type SeasonRace, useSeasonSetup } from '@/contexts';
import { getCalendarEvents } from '@/services/calendar';
import { seasonFormStyles } from './shared-styles';

// =============================================================================
// HELPERS
// =============================================================================

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseDateOnly(value);
  if (Number.isNaN(parsed.getTime())) return false;
  return formatDateLocal(parsed) === value;
}

const DISTANCE_PATTERNS: readonly { pattern: RegExp; distance: string }[] = [
  { pattern: /\bironman\b(?!.*70\.3)/i, distance: 'Ironman' },
  { pattern: /\b(?:70\.3|half\s*ironman)\b/i, distance: '70.3' },
  { pattern: /\bolympic\s*(?:tri|distance)\b/i, distance: 'Olympic Tri' },
  { pattern: /\bsprint\s*(?:tri|distance)\b/i, distance: 'Sprint Tri' },
  { pattern: /\baqua(?:thlon|bike)\b/i, distance: 'Aquathlon' },
  { pattern: /\bduathlon\b/i, distance: 'Duathlon' },
  { pattern: /\bultra\b/i, distance: 'Ultra Marathon' },
  { pattern: /\bhalf\s*marathon\b/i, distance: 'Half Marathon' },
  { pattern: /\bmarathon\b/i, distance: 'Marathon' },
  { pattern: /\b10\s*k\b/i, distance: '10K' },
  { pattern: /\b5\s*k\b/i, distance: '5K' },
] as const;

function inferDistance(name: string): string {
  for (const { pattern, distance } of DISTANCE_PATTERNS) {
    if (pattern.test(name)) return distance;
  }
  return 'Custom';
}

// =============================================================================
// DISTANCE SELECTOR
// =============================================================================

type DistanceSelectorProps = Readonly<{
  value: string;
  onChange: (distance: string) => void;
  colorScheme: 'light' | 'dark';
}>;

function DistanceSelector({ value, onChange, colorScheme }: DistanceSelectorProps) {
  return (
    <View style={styles.distanceGrid}>
      {RACE_DISTANCES.map((d) => (
        <Pressable
          key={d}
          style={[
            styles.distanceChip,
            {
              backgroundColor:
                value === d ? Colors[colorScheme].primary : Colors[colorScheme].surfaceVariant,
            },
          ]}
          onPress={() => onChange(d)}
          accessibilityLabel={`Distance: ${d}`}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === d }}
        >
          <ThemedText
            style={{
              color: value === d ? Colors[colorScheme].textInverse : Colors[colorScheme].text,
              fontSize: 13,
              fontWeight: value === d ? '600' : '400',
            }}
          >
            {d}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

// =============================================================================
// ADD RACE FORM
// =============================================================================

type AddRaceFormProps = Readonly<{
  colorScheme: 'light' | 'dark';
  onSubmit: (race: SeasonRace) => void;
  onCancel: () => void;
}>;

function AddRaceForm({ colorScheme, onSubmit, onCancel }: AddRaceFormProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [distance, setDistance] = useState('');
  const [priority, setPriority] = useState<SeasonRace['priority']>('A');
  const [location, setLocation] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a race name');
      return;
    }
    if (!isValidDateString(date)) {
      setError('Please enter a valid date (YYYY-MM-DD)');
      return;
    }
    if (!distance) {
      setError('Please select a distance');
      return;
    }
    onSubmit({
      name: trimmedName,
      date,
      distance,
      priority,
      location: location.trim() || undefined,
    });
  };

  return (
    <View style={[seasonFormStyles.form, { backgroundColor: Colors[colorScheme].surface }]}>
      <View style={seasonFormStyles.formHeader}>
        <ThemedText type="defaultSemiBold">Add Race</ThemedText>
        <Pressable
          onPress={onCancel}
          accessibilityLabel="Cancel adding race"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={Colors[colorScheme].icon} />
        </Pressable>
      </View>

      <ThemedText type="caption" style={seasonFormStyles.formLabel}>
        Race Name
      </ThemedText>
      <TextInput
        style={[
          seasonFormStyles.formInput,
          {
            backgroundColor: Colors[colorScheme].surfaceVariant,
            color: Colors[colorScheme].text,
            borderColor: error ? Colors[colorScheme].error : Colors[colorScheme].border,
          },
        ]}
        value={name}
        onChangeText={(text) => {
          setName(text);
          if (error) setError('');
        }}
        placeholder="Ironman 70.3 Geelong"
        placeholderTextColor={Colors[colorScheme].textTertiary}
        accessibilityLabel="Race name"
      />

      <ThemedText type="caption" style={seasonFormStyles.formLabel}>
        Date
      </ThemedText>
      <View style={styles.dateRow}>
        <TextInput
          style={[
            seasonFormStyles.formInput,
            styles.dateInput,
            {
              backgroundColor: Colors[colorScheme].surfaceVariant,
              color: Colors[colorScheme].text,
              borderColor: error ? Colors[colorScheme].error : Colors[colorScheme].border,
            },
          ]}
          value={date}
          onChangeText={(text) => {
            setDate(text);
            if (error) setError('');
          }}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={Colors[colorScheme].textTertiary}
          keyboardType="numbers-and-punctuation"
          accessibilityLabel="Race date"
        />
        <Pressable
          style={[
            styles.calendarButton,
            { backgroundColor: Colors[colorScheme].surfaceVariant },
          ]}
          onPress={() => setShowDatePicker(true)}
          accessibilityLabel="Pick date from calendar"
          accessibilityRole="button"
        >
          <Ionicons name="calendar-outline" size={22} color={Colors[colorScheme].primary} />
        </Pressable>
      </View>
      {showDatePicker && (
        <DateTimePicker
          value={isValidDateString(date) ? parseDateOnly(date) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          minimumDate={new Date()}
          onChange={(_event, selectedDate) => {
            setShowDatePicker(Platform.OS === 'android');
            if (selectedDate != null) {
              setDate(formatDateLocal(selectedDate));
              if (error) setError('');
            }
          }}
        />
      )}

      <ThemedText type="caption" style={seasonFormStyles.formLabel}>
        Distance
      </ThemedText>
      <DistanceSelector value={distance} onChange={setDistance} colorScheme={colorScheme} />

      <ThemedText type="caption" style={seasonFormStyles.formLabel}>
        Location (optional)
      </ThemedText>
      <TextInput
        style={[
          seasonFormStyles.formInput,
          {
            backgroundColor: Colors[colorScheme].surfaceVariant,
            color: Colors[colorScheme].text,
            borderColor: Colors[colorScheme].border,
          },
        ]}
        value={location}
        onChangeText={setLocation}
        placeholder="Geelong, VIC"
        placeholderTextColor={Colors[colorScheme].textTertiary}
        accessibilityLabel="Race location"
      />

      <ThemedText type="caption" style={seasonFormStyles.formLabel}>
        Priority
      </ThemedText>
      <PrioritySelector value={priority} onChange={setPriority} />

      {error ? (
        <ThemedText
          type="caption"
          style={[seasonFormStyles.errorText, { color: Colors[colorScheme].error }]}
          accessibilityRole="alert"
        >
          {error}
        </ThemedText>
      ) : null}

      <Button title="Add Race" onPress={handleSubmit} accessibilityLabel="Add race" />
    </View>
  );
}

// =============================================================================
// RACE CARD
// =============================================================================

type RaceCardProps = Readonly<{
  race: SeasonRace;
  index: number;
  colorScheme: 'light' | 'dark';
  onRemove: (index: number) => void;
}>;

function RaceCard({ race, index, colorScheme, onRemove }: RaceCardProps) {
  return (
    <View style={[seasonFormStyles.card, { backgroundColor: Colors[colorScheme].surface }]}>
      <View
        style={[seasonFormStyles.cardIcon, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
      >
        <Ionicons name="trophy" size={24} color={Colors[colorScheme].primary} />
      </View>
      <View style={seasonFormStyles.cardContent}>
        <ThemedText type="defaultSemiBold" style={styles.raceTitle}>
          {race.name}
        </ThemedText>
        <View style={styles.raceMeta}>
          <View style={[styles.priorityBadge, { backgroundColor: Colors[colorScheme].primary }]}>
            <ThemedText style={[styles.priorityText, { color: Colors[colorScheme].textInverse }]}>
              {race.priority}
            </ThemedText>
          </View>
          <ThemedText type="caption">{race.distance}</ThemedText>
          <ThemedText type="caption" style={styles.raceDate}>
            {parseDateOnly(race.date).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
      <Pressable
        onPress={() => onRemove(index)}
        accessibilityLabel={`Remove race: ${race.name}`}
        accessibilityRole="button"
        hitSlop={8}
      >
        <Ionicons name="close-circle" size={24} color={Colors[colorScheme].error} />
      </Pressable>
    </View>
  );
}

// =============================================================================
// IMPORT FROM INTERVALS.ICU
// =============================================================================

type ImportSectionProps = Readonly<{
  colorScheme: 'light' | 'dark';
  onImport: (races: SeasonRace[]) => void;
}>;

function ImportSection({ colorScheme, onImport }: ImportSectionProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const handleImport = useCallback(async () => {
    setIsImporting(true);
    setImportError(null);
    try {
      const today = new Date();
      const oneYearOut = new Date();
      oneYearOut.setFullYear(oneYearOut.getFullYear() + 1);

      const allRaces: SeasonRace[] = [];
      const chunkStart = new Date(today);

      while (chunkStart < oneYearOut) {
        const chunkEnd = new Date(chunkStart);
        chunkEnd.setDate(chunkEnd.getDate() + 89);
        if (chunkEnd > oneYearOut) {
          chunkEnd.setTime(oneYearOut.getTime());
        }

        const calendarEvents = await getCalendarEvents(
          formatDateLocal(chunkStart),
          formatDateLocal(chunkEnd)
        );

        for (const ce of calendarEvents) {
          if (ce.type !== 'race') continue;
          allRaces.push({
            name: ce.name,
            date: ce.start_date.slice(0, 10),
            distance: inferDistance(ce.name),
            priority: ce.priority ?? 'B',
          });
        }

        chunkStart.setDate(chunkStart.getDate() + 90);
      }

      if (allRaces.length === 0) {
        setImportError('No race events found in the next 12 months.');
      } else {
        allRaces.sort((a, b) => a.date.localeCompare(b.date));
        onImport(allRaces.slice(0, MAX_RACES));
      }
    } catch {
      setImportError('Failed to import from Intervals.icu. You can add races manually.');
    } finally {
      setIsImporting(false);
    }
  }, [onImport]);

  return (
    <View style={[seasonFormStyles.form, { backgroundColor: Colors[colorScheme].surface }]}>
      <View style={[seasonFormStyles.card, { padding: 0, shadowOpacity: 0, elevation: 0 }]}>
        <View
          style={[
            seasonFormStyles.cardIcon,
            { backgroundColor: Colors[colorScheme].surfaceVariant },
          ]}
        >
          <Ionicons name="cloud-download-outline" size={24} color={Colors[colorScheme].primary} />
        </View>
        <View style={seasonFormStyles.cardContent}>
          <ThemedText type="defaultSemiBold">Import from Intervals.icu</ThemedText>
          <ThemedText type="caption">Import race events for the next 12 months</ThemedText>
        </View>
      </View>

      {importError != null && (
        <ThemedText
          type="caption"
          style={[seasonFormStyles.errorText, { color: Colors[colorScheme].error, marginTop: 8 }]}
          accessibilityRole="alert"
        >
          {importError}
        </ThemedText>
      )}

      <View style={styles.importActions}>
        <Button
          title={isImporting ? 'Importing...' : 'Import Races'}
          onPress={handleImport}
          variant="secondary"
          disabled={isImporting}
          accessibilityLabel={isImporting ? 'Importing races' : 'Import races from Intervals.icu'}
        />
        {isImporting && <ActivityIndicator size="small" color={Colors[colorScheme].primary} />}
      </View>
    </View>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function RacesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { data, setRaces, addRace, removeRace } = useSeasonSetup();
  const [isAdding, setIsAdding] = useState(false);

  const isAtMaxRaces = data.races.length >= MAX_RACES;

  const handleAddRace = (race: SeasonRace) => {
    const merged = [...data.races, race].sort((a, b) => a.date.localeCompare(b.date));
    setRaces(merged);
    setIsAdding(false);
  };

  const handleImport = useCallback(
    (imported: SeasonRace[]) => {
      const existingKeys = new Set(data.races.map((r) => `${r.name}::${r.date}`));
      const newRaces = imported.filter((r) => !existingKeys.has(`${r.name}::${r.date}`));
      const merged = [...data.races, ...newRaces]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, MAX_RACES);
      setRaces(merged);
    },
    [data.races, setRaces]
  );

  const handleContinue = () => {
    router.push('/season/goals');
  };

  const handleSkip = () => {
    router.push('/season/goals');
  };

  return (
    <ThemedView style={seasonFormStyles.container}>
      <ScrollView
        style={seasonFormStyles.scrollView}
        contentContainerStyle={seasonFormStyles.scrollContent}
      >
        <View style={seasonFormStyles.header}>
          <ThemedText type="subtitle" style={seasonFormStyles.title}>
            Your race calendar
          </ThemedText>
          <ThemedText style={seasonFormStyles.description}>
            Add your A, B, and C races for the season. Khepri will build your training around these
            events.
          </ThemedText>
        </View>

        {/* Import from Intervals.icu */}
        {!isAdding && !isAtMaxRaces && (
          <ImportSection colorScheme={colorScheme} onImport={handleImport} />
        )}

        {/* Add race form */}
        {isAdding && (
          <AddRaceForm
            colorScheme={colorScheme}
            onSubmit={handleAddRace}
            onCancel={() => setIsAdding(false)}
          />
        )}

        {/* Add race button */}
        {!isAdding && (
          <Pressable
            style={[styles.addButton, { borderColor: Colors[colorScheme].primary }]}
            onPress={() => setIsAdding(true)}
            disabled={isAtMaxRaces}
            accessibilityLabel="Add a race"
            accessibilityRole="button"
            accessibilityState={{ disabled: isAtMaxRaces }}
          >
            <Ionicons name="add-circle-outline" size={24} color={Colors[colorScheme].primary} />
            <ThemedText style={{ color: Colors[colorScheme].primary, fontWeight: '600' }}>
              Add Race
            </ThemedText>
          </Pressable>
        )}

        {/* Race list */}
        {data.races.length > 0 && !isAdding && (
          <View style={styles.raceList}>
            <ThemedText type="defaultSemiBold" style={seasonFormStyles.sectionTitle}>
              Your Races ({data.races.length}/{MAX_RACES})
            </ThemedText>
            <View style={styles.raceCards}>
              {data.races.map((race, index) => (
                <RaceCard
                  key={`${race.name}-${race.date}-${index}`}
                  race={race}
                  index={index}
                  colorScheme={colorScheme}
                  onRemove={removeRace}
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {data.races.length === 0 && !isAdding && (
          <EmptyState
            icon="trophy-outline"
            iconSize={32}
            message="No races added yet. Add your target races or skip for standalone training."
            style={{ padding: 24, marginBottom: 16 }}
          />
        )}

        {!isAdding && (
          <TipCard message="Tip: Mark your most important race as priority A. Khepri will time your peak performance to match." />
        )}
      </ScrollView>

      {!isAdding && (
        <View style={seasonFormStyles.actions}>
          <Button
            title="Continue"
            onPress={handleContinue}
            accessibilityLabel="Continue to goals"
          />
          {data.races.length === 0 && (
            <Button
              title="Skip - No races this season"
              variant="text"
              onPress={handleSkip}
              accessibilityLabel="Skip race entry"
            />
          )}
        </View>
      )}
    </ThemedView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderWidth: 2,
    borderRadius: 12,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  raceList: {
    marginBottom: 24,
  },
  raceCards: {
    gap: 8,
  },
  raceTitle: {
    marginBottom: 4,
  },
  raceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  raceDate: {
    opacity: 0.7,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    marginBottom: 0,
  },
  calendarButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  distanceChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  importActions: {
    marginTop: 12,
    gap: 8,
  },
});
