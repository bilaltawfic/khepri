import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

/**
 * Mock check-in history data
 * In the future, this will be fetched from Supabase
 */
type CheckinHistoryItem = {
  id: string;
  date: string;
  sleepQuality: number;
  sleepHours: number;
  energyLevel: number;
  stressLevel: number;
  overallSoreness: number;
  availableTimeMinutes: number;
  recommendationIntensity: 'recovery' | 'easy' | 'moderate' | 'hard';
  recommendationSummary: string;
};

const MOCK_HISTORY: CheckinHistoryItem[] = [
  {
    id: '1',
    date: '2026-02-06',
    sleepQuality: 8,
    sleepHours: 7.5,
    energyLevel: 7,
    stressLevel: 4,
    overallSoreness: 3,
    availableTimeMinutes: 60,
    recommendationIntensity: 'moderate',
    recommendationSummary: 'Steady state workout - good day for building fitness',
  },
  {
    id: '2',
    date: '2026-02-05',
    sleepQuality: 6,
    sleepHours: 6,
    energyLevel: 5,
    stressLevel: 6,
    overallSoreness: 5,
    availableTimeMinutes: 45,
    recommendationIntensity: 'easy',
    recommendationSummary: 'Easy aerobic session to maintain without adding stress',
  },
  {
    id: '3',
    date: '2026-02-04',
    sleepQuality: 9,
    sleepHours: 8,
    energyLevel: 9,
    stressLevel: 2,
    overallSoreness: 2,
    availableTimeMinutes: 90,
    recommendationIntensity: 'hard',
    recommendationSummary: 'Quality training session - you were fresh and ready',
  },
  {
    id: '4',
    date: '2026-02-03',
    sleepQuality: 4,
    sleepHours: 5,
    energyLevel: 3,
    stressLevel: 8,
    overallSoreness: 7,
    availableTimeMinutes: 30,
    recommendationIntensity: 'recovery',
    recommendationSummary: 'Light recovery session - body needed rest',
  },
  {
    id: '5',
    date: '2026-02-02',
    sleepQuality: 7,
    sleepHours: 7,
    energyLevel: 6,
    stressLevel: 5,
    overallSoreness: 4,
    availableTimeMinutes: 60,
    recommendationIntensity: 'moderate',
    recommendationSummary: 'Steady state workout with good recovery status',
  },
];

function formatDate(dateString: string): string {
  // Parse YYYY-MM-DD as local date (not UTC) by splitting and constructing
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to start of day

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  }
  if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function getIntensityColor(
  intensity: CheckinHistoryItem['recommendationIntensity'],
  colorScheme: 'light' | 'dark'
): string {
  switch (intensity) {
    case 'recovery':
      return Colors[colorScheme].zoneRecovery;
    case 'easy':
      return Colors[colorScheme].zoneEndurance;
    case 'moderate':
      return Colors[colorScheme].zoneTempo;
    case 'hard':
      return Colors[colorScheme].zoneThreshold;
  }
}

function getWellnessScore(item: CheckinHistoryItem): number {
  const sleepScore = item.sleepQuality / 10;
  const energyScore = item.energyLevel / 10;
  const stressScore = 1 - item.stressLevel / 10;
  const sorenessScore = 1 - item.overallSoreness / 10;
  return Math.round(((sleepScore + energyScore + stressScore + sorenessScore) / 4) * 100);
}

type HistoryItemProps = {
  item: CheckinHistoryItem;
  colorScheme: 'light' | 'dark';
  onPress: () => void;
};

function HistoryItem({ item, colorScheme, onPress }: Readonly<HistoryItemProps>) {
  const wellnessScore = getWellnessScore(item);
  const intensityColor = getIntensityColor(item.recommendationIntensity, colorScheme);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Check-in from ${formatDate(item.date)}`}
    >
      <ThemedView style={[styles.historyItem, { backgroundColor: Colors[colorScheme].surface }]}>
        <View style={styles.historyHeader}>
          <View style={styles.dateContainer}>
            <ThemedText type="defaultSemiBold">{formatDate(item.date)}</ThemedText>
            <View style={[styles.intensityDot, { backgroundColor: intensityColor }]} />
          </View>
          <View
            style={[styles.wellnessScore, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
          >
            <ThemedText type="caption" style={styles.wellnessLabel}>
              Wellness
            </ThemedText>
            <ThemedText type="defaultSemiBold">{wellnessScore}%</ThemedText>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <MetricBadge
            icon="moon"
            value={`${item.sleepHours}h`}
            sublabel={`Q: ${item.sleepQuality}`}
            colorScheme={colorScheme}
          />
          <MetricBadge
            icon="flash"
            value={item.energyLevel.toString()}
            sublabel="Energy"
            colorScheme={colorScheme}
          />
          <MetricBadge
            icon="pulse"
            value={item.stressLevel.toString()}
            sublabel="Stress"
            colorScheme={colorScheme}
          />
          <MetricBadge
            icon="body"
            value={item.overallSoreness.toString()}
            sublabel="Soreness"
            colorScheme={colorScheme}
          />
        </View>

        <View style={[styles.recommendationBox, { borderLeftColor: intensityColor }]}>
          <ThemedText type="caption" style={styles.recommendationText}>
            {item.recommendationSummary}
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

type MetricBadgeProps = {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  sublabel: string;
  colorScheme: 'light' | 'dark';
};

function MetricBadge({ icon, value, sublabel, colorScheme }: Readonly<MetricBadgeProps>) {
  return (
    <View style={[styles.metricBadge, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
      <Ionicons name={icon} size={14} color={Colors[colorScheme].iconSecondary} />
      <ThemedText type="defaultSemiBold" style={styles.metricValue}>
        {value}
      </ThemedText>
      <ThemedText type="caption" style={styles.metricLabel}>
        {sublabel}
      </ThemedText>
    </View>
  );
}

export default function CheckinHistoryScreen() {
  const colorScheme = useColorScheme() ?? 'light';

  const handleItemPress = (item: CheckinHistoryItem) => {
    // TODO: Navigate to check-in detail screen
    console.log('View check-in detail:', item.id);
  };

  const renderItem = ({ item }: { item: CheckinHistoryItem }) => (
    <HistoryItem item={item} colorScheme={colorScheme} onPress={() => handleItemPress(item)} />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
        <Ionicons name="calendar-outline" size={48} color={Colors[colorScheme].iconSecondary} />
      </View>
      <ThemedText type="subtitle" style={styles.emptyTitle}>
        No check-ins yet
      </ThemedText>
      <ThemedText type="caption" style={styles.emptyText}>
        Complete your first daily check-in to start tracking your wellness and training.
      </ThemedText>
      <Pressable
        style={[styles.emptyButton, { backgroundColor: Colors[colorScheme].primary }]}
        onPress={() => router.back()}
        accessibilityLabel="Start first check-in"
        accessibilityRole="button"
      >
        <ThemedText style={[styles.emptyButtonText, { color: Colors[colorScheme].textInverse }]}>
          Start Check-in
        </ThemedText>
      </Pressable>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={MOCK_HISTORY}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  historyItem: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  intensityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  wellnessScore: {
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  wellnessLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricBadge: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    gap: 2,
  },
  metricValue: {
    fontSize: 14,
  },
  metricLabel: {
    fontSize: 10,
  },
  recommendationBox: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    paddingVertical: 4,
  },
  recommendationText: {
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
