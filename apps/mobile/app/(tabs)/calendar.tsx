import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import { parseDateOnly } from '@khepri/core';

import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useCalendarEvents } from '@/hooks';
import type { CalendarEvent } from '@/services/calendar';

/** Group events by their date (YYYY-MM-DD) for the agenda view. */
function groupEventsByDate(events: readonly CalendarEvent[]): Map<string, CalendarEvent[]> {
  const grouped = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const dateKey = event.start_date.slice(0, 10);
    const existing = grouped.get(dateKey) ?? [];
    existing.push(event);
    grouped.set(dateKey, existing);
  }
  return grouped;
}

/** Map event type to an Ionicons icon name. */
function getEventIcon(type: CalendarEvent['type']): React.ComponentProps<typeof Ionicons>['name'] {
  switch (type) {
    case 'workout':
      return 'barbell';
    case 'race':
      return 'trophy';
    case 'rest_day':
      return 'bed';
    case 'note':
      return 'document-text';
    case 'travel':
      return 'airplane';
  }
}

/** Format a duration in seconds to a readable string (e.g., "1h 30m"). */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

/** Format a YYYY-MM-DD string to a readable date heading. */
function formatDateHeading(dateStr: string): string {
  const date = parseDateOnly(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/** Format the date range for the header. */
function formatDateRange(oldest: string, newest: string): string {
  const start = parseDateOnly(oldest);
  const end = parseDateOnly(newest);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${oldest} – ${newest}`;
  }
  const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${startStr} – ${endStr}`;
}

function EventCard({
  event,
  colorScheme,
}: Readonly<{ event: CalendarEvent; colorScheme: 'light' | 'dark' }>) {
  return (
    <ThemedView
      style={[styles.eventCard, { backgroundColor: Colors[colorScheme].surface }]}
      accessibilityRole="text"
    >
      <View style={styles.eventCardRow}>
        <Ionicons
          name={getEventIcon(event.type)}
          size={20}
          color={Colors[colorScheme].icon}
          style={styles.eventIcon}
        />
        <View style={styles.eventCardInfo}>
          <ThemedText numberOfLines={1}>{event.name}</ThemedText>
          <View style={styles.eventMeta}>
            {event.category != null && <ThemedText type="caption">{event.category}</ThemedText>}
            {event.planned_duration != null && event.planned_duration > 0 && (
              <ThemedText type="caption">{formatDuration(event.planned_duration)}</ThemedText>
            )}
            {event.planned_tss != null && (
              <ThemedText type="caption">{event.planned_tss} TSS</ThemedText>
            )}
            {event.priority != null && (
              <ThemedText type="caption" style={styles.priorityBadge}>
                {event.priority}
              </ThemedText>
            )}
          </View>
        </View>
      </View>
    </ThemedView>
  );
}

export default function CalendarScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { events, isLoading, error, dateRange, refresh, navigateForward, navigateBack } =
    useCalendarEvents();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (isLoading && events.length === 0) {
    return (
      <ScreenContainer>
        <LoadingState message="Loading calendar events..." />
      </ScreenContainer>
    );
  }

  if (error && events.length === 0) {
    return (
      <ScreenContainer>
        <ErrorState
          message={error}
          title="Unable to load calendar"
          action={{ title: 'Retry', onPress: refresh }}
        />
      </ScreenContainer>
    );
  }

  const grouped = groupEventsByDate(events);
  const sortedDates = [...grouped.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable
          onPress={navigateBack}
          accessibilityRole="button"
          accessibilityLabel="Previous 2 weeks"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={24} color={Colors[colorScheme].primary} />
        </Pressable>
        <ThemedText type="defaultSemiBold" style={styles.dateRangeText}>
          {formatDateRange(dateRange.oldest, dateRange.newest)}
        </ThemedText>
        <Pressable
          onPress={navigateForward}
          accessibilityRole="button"
          accessibilityLabel="Next 2 weeks"
          hitSlop={8}
        >
          <Ionicons name="chevron-forward" size={24} color={Colors[colorScheme].primary} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {sortedDates.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="No Events"
            message="No events scheduled for this period."
          />
        ) : (
          sortedDates.map((dateKey) => {
            const dateEvents = grouped.get(dateKey);
            if (!dateEvents) return null;
            return (
              <View key={dateKey} style={styles.dateGroup}>
                <ThemedText type="defaultSemiBold" style={styles.dateHeading}>
                  {formatDateHeading(dateKey)}
                </ThemedText>
                {dateEvents.map((event) => (
                  <EventCard key={event.id} event={event} colorScheme={colorScheme} />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  dateRangeText: {
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeading: {
    marginBottom: 8,
    opacity: 0.7,
  },
  eventCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  eventCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventIcon: {
    marginRight: 12,
  },
  eventCardInfo: {
    flex: 1,
    gap: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priorityBadge: {
    fontWeight: '700',
  },
});
