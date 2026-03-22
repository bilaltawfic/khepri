import { StyleSheet, View, useColorScheme } from 'react-native';

import type { DaySlot, WeekDay, WeekOverviewInfo } from '@khepri/core';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

/** Short display labels for each day of the week. */
const DAY_LABELS: Record<WeekDay, string> = {
  monday: 'M',
  tuesday: 'T',
  wednesday: 'W',
  thursday: 'T',
  friday: 'F',
  saturday: 'S',
  sunday: 'S',
};

/** Category abbreviations for compact display. */
function getCategoryLabel(slot: DaySlot): string {
  if (slot.type === 'rest') return 'Rest';
  if (slot.category == null) return 'Train';
  const cat = slot.category.toLowerCase();
  if (cat === 'run') return 'Run';
  if (cat === 'bike' || cat === 'cycling') return 'Bike';
  if (cat === 'swim' || cat === 'swimming') return 'Swim';
  if (cat === 'strength' || cat === 'gym') return 'Gym';
  return slot.category.slice(0, 4);
}

function DayCell({
  slot,
  isToday,
  colorScheme,
}: Readonly<{
  slot: DaySlot & { readonly day: WeekDay };
  isToday: boolean;
  colorScheme: 'light' | 'dark';
}>) {
  const isRest = slot.type === 'rest';
  const todayBg = isToday ? Colors[colorScheme].primary : 'transparent';
  const todayTextColor = isToday ? Colors[colorScheme].textInverse : undefined;

  return (
    <View
      style={[styles.dayCell, isToday && { backgroundColor: todayBg, borderRadius: 8 }]}
      accessibilityRole="text"
      accessibilityLabel={`${slot.day}: ${getCategoryLabel(slot)}${isToday ? ', today' : ''}`}
    >
      <ThemedText type="caption" style={[styles.dayLabel, isToday && { color: todayTextColor }]}>
        {DAY_LABELS[slot.day]}
      </ThemedText>
      <ThemedText
        style={[
          styles.dayCategory,
          isRest && styles.dayCategoryRest,
          isToday && { color: todayTextColor },
        ]}
      >
        {getCategoryLabel(slot)}
      </ThemedText>
    </View>
  );
}

export function WeekOverviewCard({ info }: Readonly<{ info: WeekOverviewInfo }>) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="subtitle">This Week</ThemedText>
        <ThemedText type="caption">
          Week {info.currentWeek} of {info.totalWeeks}
        </ThemedText>
      </View>

      {info.phaseFocus.length > 0 && (
        <ThemedText style={styles.phaseInfo}>
          {info.phaseName} — {info.phaseFocus}
        </ThemedText>
      )}

      <View style={styles.weekRow}>
        {info.dailySlots.map((slot, index) => (
          <DayCell
            key={slot.day}
            slot={slot}
            isToday={index === info.todayIndex}
            colorScheme={colorScheme}
          />
        ))}
      </View>

      <View style={styles.progressContainer}>
        <View
          style={[styles.progressTrack, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: Colors[colorScheme].primary,
                width: `${Math.round((info.currentWeek / info.totalWeeks) * 100)}%`,
              },
            ]}
          />
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseInfo: {
    marginBottom: 12,
    opacity: 0.7,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dayCell: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    minWidth: 40,
  },
  dayLabel: {
    marginBottom: 4,
    fontWeight: '600',
  },
  dayCategory: {
    fontSize: 11,
  },
  dayCategoryRest: {
    opacity: 0.5,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
