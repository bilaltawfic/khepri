import { Modal, Pressable, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';
import { ThemedText } from './ThemedText';

// ====================================================================
// Types
// ====================================================================

export interface AddPreferenceSheetProps {
  readonly visible: boolean;
  readonly dayIndex: number;
  readonly availableSports: readonly string[];
  readonly onConfirm: (sport: string, workoutLabel?: string) => void;
  readonly onDismiss: () => void;
}

// ====================================================================
// Constants
// ====================================================================

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export const WORKOUT_LABELS = [
  'Long',
  'Tempo',
  'Threshold',
  'Easy/Recovery',
  'Technique',
  'Intervals',
] as const;

// ====================================================================
// Component
// ====================================================================

export function AddPreferenceSheet({
  visible,
  dayIndex,
  availableSports,
  onConfirm,
  onDismiss,
}: AddPreferenceSheetProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const sports = availableSports.length > 0 ? availableSports : ['Swim', 'Bike', 'Run'];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.container}>
        <Pressable
          style={styles.backdrop}
          onPress={onDismiss}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <ThemedText type="defaultSemiBold" style={styles.title}>
            Add for {DAY_NAMES[dayIndex] ?? 'Day'}
          </ThemedText>

          <ThemedText type="caption" style={[styles.sectionLabel, { color: colors.icon }]}>
            Sport
          </ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportScroll}>
            <View style={styles.chipRow}>
              {sports.map((sport) => (
                <SportPicker key={sport} sport={sport} onConfirm={onConfirm} colors={colors} />
              ))}
            </View>
          </ScrollView>

          <Pressable
            onPress={onDismiss}
            style={[styles.cancelButton, { borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <ThemedText style={{ color: colors.icon }}>Cancel</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ====================================================================
// Sub-component: SportPicker
// ====================================================================

interface SportPickerProps {
  readonly sport: string;
  readonly onConfirm: (sport: string, workoutLabel?: string) => void;
  readonly colors: {
    readonly primary: string;
    readonly surfaceVariant: string;
    readonly border: string;
    readonly text: string;
    readonly icon: string;
  };
}

function SportPicker({ sport, onConfirm, colors }: SportPickerProps) {
  return (
    <View style={styles.sportSection}>
      <Pressable
        onPress={() => onConfirm(sport)}
        style={[
          styles.sportChip,
          { backgroundColor: colors.surfaceVariant, borderColor: colors.border },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Add ${sport}`}
      >
        <ThemedText style={styles.sportChipText}>{sport}</ThemedText>
      </Pressable>
      <View style={styles.labelRow}>
        {WORKOUT_LABELS.map((label) => (
          <Pressable
            key={label}
            onPress={() => onConfirm(sport, label)}
            style={[styles.labelChip, { borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Add ${sport} ${label}`}
          >
            <ThemedText style={styles.labelChipText}>{label}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ====================================================================
// Styles
// ====================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  sectionLabel: {
    marginBottom: 8,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sportScroll: {
    marginBottom: 16,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 8,
  },
  sportSection: {
    alignItems: 'flex-start',
    gap: 6,
    minWidth: 100,
  },
  sportChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  sportChipText: {
    fontWeight: '600',
  },
  labelRow: {
    gap: 4,
    alignItems: 'flex-start',
  },
  labelChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  labelChipText: {
    fontSize: 12,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
});
