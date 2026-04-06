import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';
import { ThemedText } from './ThemedText';

// ====================================================================
// Types
// ====================================================================

export interface DayPreference {
  readonly id: string; // stable unique key for React reconciliation
  readonly sport: string;
  readonly workoutLabel?: string;
}

interface DayPreferenceRowProps {
  readonly dayIndex: number; // 0=Mon ... 6=Sun
  readonly preferences: readonly DayPreference[];
  readonly onAdd: (dayIndex: number) => void;
  readonly onRemove: (dayIndex: number, prefIndex: number) => void;
}

// ====================================================================
// Constants
// ====================================================================

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

type SportIconName = 'water' | 'bicycle' | 'walk' | 'barbell' | 'fitness';

const SPORT_ICONS: Record<string, SportIconName> = {
  swim: 'water',
  bike: 'bicycle',
  run: 'walk',
  strength: 'barbell',
};

function getSportIcon(sport: string): SportIconName {
  return SPORT_ICONS[sport.toLowerCase()] ?? 'fitness';
}

// ====================================================================
// Component
// ====================================================================

export function DayPreferenceRow({
  dayIndex,
  preferences,
  onAdd,
  onRemove,
}: DayPreferenceRowProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View style={styles.row}>
      <ThemedText style={[styles.dayLabel, { color: colors.text }]}>
        {DAY_NAMES[dayIndex]}
      </ThemedText>

      <View style={styles.chips}>
        {preferences.map((pref, prefIndex) => {
          const label =
            pref.workoutLabel != null ? `${pref.sport} · ${pref.workoutLabel}` : pref.sport;
          const removeLabel = `Remove ${pref.sport}${pref.workoutLabel != null ? ` ${pref.workoutLabel}` : ''} on ${DAY_NAMES[dayIndex]}`;
          return (
            <View
              key={pref.id}
              style={[
                styles.chip,
                { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
              ]}
            >
              <Ionicons name={getSportIcon(pref.sport)} size={14} color={colors.primary} />
              <ThemedText style={styles.chipText}>{label}</ThemedText>
              <Pressable
                onPress={() => onRemove(dayIndex, prefIndex)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={removeLabel}
              >
                <Ionicons name="close-circle" size={16} color={colors.icon} />
              </Pressable>
            </View>
          );
        })}
      </View>

      <Pressable
        onPress={() => onAdd(dayIndex)}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Add preference for ${DAY_NAMES[dayIndex]}`}
        style={[styles.addButton, { borderColor: colors.border }]}
      >
        <Ionicons name="add" size={18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

// ====================================================================
// Styles
// ====================================================================

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    paddingVertical: 4,
    gap: 8,
  },
  dayLabel: {
    width: 36,
    fontSize: 13,
    fontWeight: '600',
  },
  chips: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
