import { Ionicons } from '@expo/vector-icons';
import { formatDateLocal, parseDateOnly } from '@khepri/core';
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
import { EmptyState } from '@/components/EmptyState';
import { PrioritySelector } from '@/components/PrioritySelector';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TipCard } from '@/components/TipCard';
import { Colors } from '@/constants/Colors';
import { MAX_EVENTS, type OnboardingEvent, useOnboarding } from '@/contexts';
import { getCalendarEvents } from '@/services/calendar';

// =============================================================================
// TYPES
// =============================================================================

type EventType = OnboardingEvent['type'];

type EventTypeConfig = {
  type: EventType;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
};

// =============================================================================
// CONSTANTS
// =============================================================================

const EVENT_TYPES: readonly EventTypeConfig[] = [
  {
    type: 'race',
    icon: 'trophy',
    title: 'Race',
    description: 'A race or competition',
  },
  {
    type: 'camp',
    icon: 'bonfire',
    title: 'Training Camp',
    description: 'A training camp or clinic',
  },
  {
    type: 'travel',
    icon: 'airplane',
    title: 'Travel',
    description: 'Travel that affects training',
  },
  {
    type: 'other',
    icon: 'calendar',
    title: 'Other Event',
    description: 'Any other key event',
  },
];

const VALID_EVENT_TYPES = ['race', 'travel', 'camp', 'other'] as const;

function isValidEventType(value: string): value is EventType {
  return (VALID_EVENT_TYPES as readonly string[]).includes(value);
}

function getEventTypeConfig(type: EventType): EventTypeConfig | undefined {
  return EVENT_TYPES.find((c) => c.type === type);
}

function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = parseDateOnly(value);
  if (Number.isNaN(parsed.getTime())) return false;
  // Reject overflow dates like 2026-02-31 (Date normalizes to March 3)
  return formatDateLocal(parsed) === value;
}

// =============================================================================
// EVENT TYPE CARD
// =============================================================================

type EventTypeCardProps = Readonly<{
  config: EventTypeConfig;
  colorScheme: 'light' | 'dark';
  onPress: () => void;
  disabled?: boolean;
}>;

function EventTypeCard({ config, colorScheme, onPress, disabled }: EventTypeCardProps) {
  return (
    <Pressable
      style={[
        styles.eventTypeCard,
        { backgroundColor: Colors[colorScheme].surface },
        disabled && styles.cardDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={`Add ${config.title.toLowerCase()}`}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <View style={[styles.eventIcon, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
        <Ionicons name={config.icon} size={24} color={Colors[colorScheme].primary} />
      </View>
      <View style={styles.eventTypeContent}>
        <ThemedText type="defaultSemiBold">{config.title}</ThemedText>
        <ThemedText type="caption">{config.description}</ThemedText>
      </View>
      <Ionicons name="add-circle-outline" size={24} color={Colors[colorScheme].primary} />
    </Pressable>
  );
}

// =============================================================================
// ADDED EVENT CARD
// =============================================================================

type AddedEventCardProps = Readonly<{
  event: OnboardingEvent;
  index: number;
  colorScheme: 'light' | 'dark';
  onRemove: (index: number) => void;
}>;

function AddedEventCard({ event, index, colorScheme, onRemove }: AddedEventCardProps) {
  const config = getEventTypeConfig(event.type);
  if (!config) return null;

  return (
    <View style={[styles.addedEventCard, { backgroundColor: Colors[colorScheme].surface }]}>
      <View style={[styles.eventIcon, { backgroundColor: Colors[colorScheme].surfaceVariant }]}>
        <Ionicons name={config.icon} size={20} color={Colors[colorScheme].primary} />
      </View>
      <View style={styles.addedEventContent}>
        <ThemedText type="defaultSemiBold" style={styles.addedEventTitle}>
          {event.name}
        </ThemedText>
        <View style={styles.addedEventMeta}>
          <View style={[styles.priorityBadge, { backgroundColor: Colors[colorScheme].primary }]}>
            <ThemedText style={[styles.priorityText, { color: Colors[colorScheme].textInverse }]}>
              {event.priority}
            </ThemedText>
          </View>
          <ThemedText type="caption">{config.title}</ThemedText>
          <ThemedText type="caption" style={styles.eventDate}>
            {parseDateOnly(event.date).toLocaleDateString()}
          </ThemedText>
        </View>
      </View>
      <Pressable
        onPress={() => onRemove(index)}
        accessibilityLabel={`Remove event: ${event.name}`}
        accessibilityRole="button"
        hitSlop={8}
      >
        <Ionicons name="close-circle" size={24} color={Colors[colorScheme].error} />
      </Pressable>
    </View>
  );
}

// =============================================================================
// ADD EVENT FORM
// =============================================================================

type AddEventFormProps = Readonly<{
  eventType: EventType;
  colorScheme: 'light' | 'dark';
  onSubmit: (event: OnboardingEvent) => void;
  onCancel: () => void;
}>;

function AddEventForm({ eventType, colorScheme, onSubmit, onCancel }: AddEventFormProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [priority, setPriority] = useState<OnboardingEvent['priority']>('A');
  const [error, setError] = useState('');
  const config = getEventTypeConfig(eventType);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter an event name');
      return;
    }
    if (!isValidDateString(date)) {
      setError('Please enter a valid date (YYYY-MM-DD)');
      return;
    }
    onSubmit({
      name: trimmedName,
      type: eventType,
      date,
      priority,
    });
  };

  return (
    <View style={[styles.addEventForm, { backgroundColor: Colors[colorScheme].surface }]}>
      <View style={styles.formHeader}>
        <ThemedText type="defaultSemiBold">Add {config?.title}</ThemedText>
        <Pressable
          onPress={onCancel}
          accessibilityLabel="Cancel adding event"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={Colors[colorScheme].icon} />
        </Pressable>
      </View>

      <ThemedText type="caption" style={styles.formLabel}>
        Event Name
      </ThemedText>
      <TextInput
        style={[
          styles.formInput,
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
        placeholder={config?.type === 'race' ? 'Ironman 70.3 Geelong' : 'Event name'}
        placeholderTextColor={Colors[colorScheme].textTertiary}
        accessibilityLabel="Event name"
      />

      <ThemedText type="caption" style={styles.formLabel}>
        Date (YYYY-MM-DD)
      </ThemedText>
      <TextInput
        style={[
          styles.formInput,
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
        placeholder="2026-06-15"
        placeholderTextColor={Colors[colorScheme].textTertiary}
        keyboardType="numbers-and-punctuation"
        accessibilityLabel="Event date"
      />

      {error ? (
        <ThemedText
          type="caption"
          style={[styles.errorText, { color: Colors[colorScheme].error }]}
          accessibilityRole="alert"
        >
          {error}
        </ThemedText>
      ) : null}

      <ThemedText type="caption" style={styles.formLabel}>
        Priority
      </ThemedText>
      <PrioritySelector value={priority} onChange={setPriority} />

      <Button title="Add Event" onPress={handleSubmit} accessibilityLabel="Add event" />
    </View>
  );
}

// =============================================================================
// IMPORT FROM INTERVALS.ICU
// =============================================================================

type ImportSectionProps = Readonly<{
  colorScheme: 'light' | 'dark';
  onImport: (events: OnboardingEvent[]) => void;
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

      // Fetch in 90-day chunks (API limit)
      const allEvents: OnboardingEvent[] = [];
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
          if (ce.type !== 'race' && ce.type !== 'travel') continue;
          const mappedType = isValidEventType(ce.type) ? ce.type : 'other';
          allEvents.push({
            name: ce.name,
            type: mappedType,
            date: ce.start_date.slice(0, 10),
            priority: ce.priority ?? 'B',
          });
        }

        chunkStart.setDate(chunkStart.getDate() + 90);
      }

      if (allEvents.length === 0) {
        setImportError('No race or travel events found in the next 12 months.');
      } else {
        onImport(allEvents.slice(0, MAX_EVENTS));
      }
    } catch {
      setImportError('Failed to import events from Intervals.icu. You can add events manually.');
    } finally {
      setIsImporting(false);
    }
  }, [onImport]);

  return (
    <View style={[styles.importSection, { backgroundColor: Colors[colorScheme].surface }]}>
      <View style={styles.importHeader}>
        <Ionicons name="cloud-download-outline" size={24} color={Colors[colorScheme].primary} />
        <View style={styles.importHeaderText}>
          <ThemedText type="defaultSemiBold">Import from Intervals.icu</ThemedText>
          <ThemedText type="caption">
            Import race and travel events for the next 12 months
          </ThemedText>
        </View>
      </View>

      {importError != null && (
        <ThemedText
          type="caption"
          style={[styles.importError, { color: Colors[colorScheme].error }]}
          accessibilityRole="alert"
        >
          {importError}
        </ThemedText>
      )}

      <Button
        title={isImporting ? 'Importing...' : 'Import Events'}
        onPress={handleImport}
        variant="secondary"
        disabled={isImporting}
        accessibilityLabel={isImporting ? 'Importing events' : 'Import events from Intervals.icu'}
      />
      {isImporting && (
        <ActivityIndicator
          size="small"
          color={Colors[colorScheme].primary}
          style={styles.importSpinner}
        />
      )}
    </View>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function EventsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const { data, setEvents, addEvent, removeEvent } = useOnboarding();
  const [addingEventType, setAddingEventType] = useState<EventType | null>(null);

  const hasIntervalsConnected = data.intervalsAthleteId != null && data.intervalsApiKey != null;
  const isAtMaxEvents = data.events.length >= MAX_EVENTS;

  const handleContinue = () => {
    router.push('/onboarding/plan');
  };

  const handleAddEvent = (event: OnboardingEvent) => {
    addEvent(event);
    setAddingEventType(null);
  };

  const handleImport = useCallback(
    (imported: OnboardingEvent[]) => {
      setEvents(imported);
    },
    [setEvents]
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            Key events this year
          </ThemedText>
          <ThemedText style={styles.description}>
            Add your races, camps, and travel so Khepri can build your training around them. You can
            add up to {MAX_EVENTS} events.
          </ThemedText>
        </View>

        {/* Import from Intervals.icu (if connected) */}
        {hasIntervalsConnected && data.events.length === 0 && addingEventType == null && (
          <ImportSection colorScheme={colorScheme} onImport={handleImport} />
        )}

        {/* Add event form (shown when adding) */}
        {addingEventType != null && (
          <AddEventForm
            eventType={addingEventType}
            colorScheme={colorScheme}
            onSubmit={handleAddEvent}
            onCancel={() => setAddingEventType(null)}
          />
        )}

        {/* Event type cards (hidden when adding) */}
        {addingEventType == null && (
          <View style={styles.eventTypes}>
            {EVENT_TYPES.map((config) => (
              <EventTypeCard
                key={config.type}
                config={config}
                colorScheme={colorScheme}
                onPress={() => setAddingEventType(config.type)}
                disabled={isAtMaxEvents}
              />
            ))}
          </View>
        )}

        {/* Added events */}
        {data.events.length > 0 && addingEventType == null && (
          <View style={styles.addedEventsSection}>
            <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
              Your Events ({data.events.length}/{MAX_EVENTS})
            </ThemedText>
            <View style={styles.addedEventsList}>
              {data.events.map((event, index) => (
                <AddedEventCard
                  key={`${event.type}-${event.name}-${index}`}
                  event={event}
                  index={index}
                  colorScheme={colorScheme}
                  onRemove={removeEvent}
                />
              ))}
            </View>
          </View>
        )}

        {/* Empty state */}
        {data.events.length === 0 && addingEventType == null && !hasIntervalsConnected && (
          <EmptyState
            icon="calendar-outline"
            iconSize={32}
            message="No events added yet. Tap an event type above to get started, or skip to continue."
            style={{ padding: 24, marginBottom: 16 }}
          />
        )}

        {/* Tip */}
        {addingEventType == null && (
          <TipCard message="Tip: Adding your A-race helps Khepri periodize your training with proper taper and peak timing." />
        )}
      </ScrollView>

      {/* Action buttons (hidden when adding) */}
      {addingEventType == null && (
        <View style={styles.actions}>
          <Button
            title="Continue"
            onPress={handleContinue}
            accessibilityLabel="Continue to plan selection"
          />
          <Button
            title="Skip - I'll add events later"
            variant="text"
            onPress={handleContinue}
            accessibilityLabel="Skip event entry"
          />
        </View>
      )}
    </ThemedView>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
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
  title: {
    marginBottom: 8,
  },
  description: {
    opacity: 0.8,
    lineHeight: 24,
  },
  // Event type cards
  eventTypes: {
    gap: 12,
    marginBottom: 24,
  },
  eventTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventTypeContent: {
    flex: 1,
  },
  // Added event cards
  addedEventsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  addedEventsList: {
    gap: 8,
  },
  addedEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  addedEventContent: {
    flex: 1,
  },
  addedEventTitle: {
    marginBottom: 4,
  },
  addedEventMeta: {
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
  eventDate: {
    opacity: 0.7,
  },
  // Add event form
  addEventForm: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formLabel: {
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  errorText: {
    marginTop: 4,
  },
  // Import section
  importSection: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  importHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  importHeaderText: {
    flex: 1,
  },
  importError: {
    marginBottom: 8,
  },
  importSpinner: {
    marginTop: 8,
  },
  // Actions
  actions: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },
});
