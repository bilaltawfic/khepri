import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

// ====================================================================
// Types
// ====================================================================

type SingleModeProps = Readonly<{
  mode?: 'single';
  value: Date | null;
  onChange: (date: Date | null) => void;
  rangeStart?: never;
  rangeEnd?: never;
  onRangeSelect?: never;
}>;

type RangeModeProps = Readonly<{
  mode: 'range';
  value?: never;
  onChange?: never;
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onRangeSelect: (start: Date | null, end: Date | null) => void;
}>;

type CommonProps = Readonly<{
  label: string;
  placeholder?: string;
  error?: string;
  helpText?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  allowClear?: boolean;
}>;

export type FormDatePickerProps = CommonProps & (SingleModeProps | RangeModeProps);

// ====================================================================
// Helpers
// ====================================================================

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateRange(start: Date | null, end: Date | null): string {
  if (start == null) return '';
  const startStr = formatDate(start);
  if (end == null || isSameDay(start, end)) return startStr;
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function normalizeToStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isDateInRange(date: Date, start: Date | null, end: Date | null): boolean {
  if (start == null) return false;
  const d = normalizeToStartOfDay(date).getTime();
  const s = normalizeToStartOfDay(start).getTime();
  if (end == null) return d === s;
  const e = normalizeToStartOfDay(end).getTime();
  return d >= s && d <= e;
}

export function isRangeEndpoint(date: Date, start: Date | null, end: Date | null): boolean {
  if (start != null && isSameDay(date, start)) return true;
  if (end != null && isSameDay(date, end)) return true;
  return false;
}

// ====================================================================
// Calendar Grid (shared between single and range modes)
// ====================================================================

type CalendarGridProps = Readonly<{
  currentYear: number;
  currentMonth: number;
  minimumDate?: Date;
  maximumDate?: Date;
  colorScheme: 'light' | 'dark';
  isSelected: (day: number) => boolean;
  isInRangeMiddle: (day: number) => boolean;
  onSelectDay: (day: number) => void;
  onChangeMonth: (delta: number) => void;
}>;

/** @internal Exported for testing — do not use directly in app code. */
export function CalendarGrid({
  currentYear,
  currentMonth,
  minimumDate,
  maximumDate,
  colorScheme,
  isSelected,
  isInRangeMiddle,
  onSelectDay,
  onChangeMonth,
}: CalendarGridProps) {
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const days: { id: string; day: number | null }[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push({ id: `empty-${i}`, day: null });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ id: `day-${i}`, day: i });
  }

  const isDisabled = (day: number): boolean => {
    const date = new Date(currentYear, currentMonth, day);
    if (minimumDate && date < normalizeToStartOfDay(minimumDate)) return true;
    if (maximumDate && date > normalizeToStartOfDay(maximumDate)) return true;
    return false;
  };

  return (
    <>
      <View style={styles.monthNav}>
        <Pressable
          onPress={() => onChangeMonth(-1)}
          accessibilityLabel="Previous month"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={Colors[colorScheme].primary} />
        </Pressable>
        <ThemedText type="defaultSemiBold">
          {MONTHS[currentMonth]} {currentYear}
        </ThemedText>
        <Pressable
          onPress={() => onChangeMonth(1)}
          accessibilityLabel="Next month"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-forward" size={24} color={Colors[colorScheme].primary} />
        </Pressable>
      </View>

      <View style={styles.weekDays}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <ThemedText key={day} type="caption" style={styles.weekDay}>
            {day}
          </ThemedText>
        ))}
      </View>

      <View style={styles.daysGrid}>
        {days.map((cell) => {
          const selected = cell.day != null && isSelected(cell.day);
          const inRange = cell.day != null && isInRangeMiddle(cell.day);
          const disabled = cell.day != null && isDisabled(cell.day);

          return (
            <Pressable
              key={cell.id}
              style={[styles.dayCell, disabled && { opacity: 0.3 }]}
              onPress={() => cell.day != null && onSelectDay(cell.day)}
              disabled={cell.day == null || disabled}
              accessibilityLabel={
                cell.day == null ? undefined : `${MONTHS[currentMonth]} ${cell.day}`
              }
              accessibilityRole="button"
            >
              {cell.day != null && (
                <View
                  style={[
                    styles.dayHighlight,
                    inRange && {
                      backgroundColor: `${Colors[colorScheme].primary}20`,
                      borderRadius: 16,
                    },
                    selected && {
                      backgroundColor: Colors[colorScheme].primary,
                      borderRadius: 16,
                    },
                  ]}
                >
                  <ThemedText
                    style={[styles.dayText, selected && { color: Colors[colorScheme].textInverse }]}
                  >
                    {cell.day}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

// ====================================================================
// Single Date Picker Modal
// ====================================================================

type SinglePickerModalProps = Readonly<{
  value: Date | null;
  onChange: (date: Date) => void;
  onClose: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
  colorScheme: 'light' | 'dark';
}>;

/** @internal Exported for testing — do not use directly in app code. */
export function SinglePickerModal({
  value,
  onChange,
  onClose,
  minimumDate,
  maximumDate,
  colorScheme,
}: SinglePickerModalProps) {
  const getInitialDate = () => {
    if (value) return value;
    const now = new Date();
    if (maximumDate && now > normalizeToStartOfDay(maximumDate)) return maximumDate;
    if (minimumDate && now < normalizeToStartOfDay(minimumDate)) return minimumDate;
    return now;
  };
  const [selectedDate, setSelectedDate] = useState(getInitialDate);

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();

  const changeMonth = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    newDate.setDate(1);
    setSelectedDate(newDate);
  };

  const selectDay = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    if (minimumDate && newDate < normalizeToStartOfDay(minimumDate)) return;
    if (maximumDate && newDate > normalizeToStartOfDay(maximumDate)) return;
    setSelectedDate(newDate);
  };

  return (
    <View style={styles.modalOverlay}>
      <SafeAreaView
        style={[styles.modalContent, { backgroundColor: Colors[colorScheme].background }]}
        edges={['bottom']}
      >
        <View style={styles.modalHeader}>
          <ThemedText type="subtitle">Select Date</ThemedText>
          <Pressable onPress={onClose} accessibilityLabel="Close" accessibilityRole="button">
            <Ionicons name="close" size={24} color={Colors[colorScheme].icon} />
          </Pressable>
        </View>

        <CalendarGrid
          currentYear={currentYear}
          currentMonth={currentMonth}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          colorScheme={colorScheme}
          isSelected={(day) => day === selectedDate.getDate()}
          isInRangeMiddle={() => false}
          onSelectDay={selectDay}
          onChangeMonth={changeMonth}
        />

        <View style={styles.modalActions}>
          <Button
            title="Select"
            onPress={() => {
              const normalized = normalizeToStartOfDay(selectedDate);
              if (minimumDate && normalized < normalizeToStartOfDay(minimumDate)) return;
              if (maximumDate && normalized > normalizeToStartOfDay(maximumDate)) return;
              onChange(normalized);
              onClose();
            }}
            accessibilityLabel="Select date"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

// ====================================================================
// Range Date Picker Modal
// ====================================================================

type RangePickerModalProps = Readonly<{
  rangeStart: Date | null;
  rangeEnd: Date | null;
  onSelect: (start: Date, end: Date) => void;
  onClose: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
  colorScheme: 'light' | 'dark';
}>;

/** @internal Exported for testing — do not use directly in app code. */
export function RangePickerModal({
  rangeStart,
  rangeEnd,
  onSelect,
  onClose,
  minimumDate,
  maximumDate,
  colorScheme,
}: RangePickerModalProps) {
  const getInitialViewDate = () => {
    if (rangeStart) return rangeStart;
    const now = new Date();
    if (maximumDate && now > normalizeToStartOfDay(maximumDate)) return maximumDate;
    if (minimumDate && now < normalizeToStartOfDay(minimumDate)) return minimumDate;
    return now;
  };

  const [viewDate, setViewDate] = useState(getInitialViewDate);
  const [start, setStart] = useState<Date | null>(
    rangeStart == null ? null : normalizeToStartOfDay(rangeStart)
  );
  const [end, setEnd] = useState<Date | null>(
    rangeEnd == null ? null : normalizeToStartOfDay(rangeEnd)
  );

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();

  const changeMonth = (delta: number) => {
    const newDate = new Date(viewDate);
    newDate.setMonth(newDate.getMonth() + delta);
    newDate.setDate(1);
    setViewDate(newDate);
  };

  const selectDay = (day: number) => {
    const newDate = normalizeToStartOfDay(new Date(currentYear, currentMonth, day));
    if (minimumDate && newDate < normalizeToStartOfDay(minimumDate)) return;
    if (maximumDate && newDate > normalizeToStartOfDay(maximumDate)) return;

    if (start == null || end != null) {
      // First tap or resetting: set start, clear end
      setStart(newDate);
      setEnd(null);
    } else if (newDate < start) {
      // Tapped before start: swap — new date becomes start
      setStart(newDate);
      setEnd(normalizeToStartOfDay(start));
    } else {
      // Tapped after start: set end
      setEnd(newDate);
    }
  };

  const isSelected = (day: number): boolean => {
    const date = new Date(currentYear, currentMonth, day);
    return isRangeEndpoint(date, start, end);
  };

  const isInRangeMiddle = (day: number): boolean => {
    const date = new Date(currentYear, currentMonth, day);
    return isDateInRange(date, start, end) && !isRangeEndpoint(date, start, end);
  };

  const rangeLabel = (): string => {
    if (start == null) return 'Tap a start date';
    if (end == null) return `${formatDate(start)} → tap end date`;
    return formatDateRange(start, end);
  };

  return (
    <View style={styles.modalOverlay}>
      <SafeAreaView
        style={[styles.modalContent, { backgroundColor: Colors[colorScheme].background }]}
        edges={['bottom']}
      >
        <View style={styles.modalHeader}>
          <ThemedText type="subtitle">Select Date Range</ThemedText>
          <Pressable onPress={onClose} accessibilityLabel="Close" accessibilityRole="button">
            <Ionicons name="close" size={24} color={Colors[colorScheme].icon} />
          </Pressable>
        </View>

        <ThemedText type="caption" style={styles.rangeHint}>
          {rangeLabel()}
        </ThemedText>

        <CalendarGrid
          currentYear={currentYear}
          currentMonth={currentMonth}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          colorScheme={colorScheme}
          isSelected={isSelected}
          isInRangeMiddle={isInRangeMiddle}
          onSelectDay={selectDay}
          onChangeMonth={changeMonth}
        />

        <View style={styles.modalActions}>
          <Button
            title="Select Range"
            onPress={() => {
              if (start == null) return;
              const normalizedStart = normalizeToStartOfDay(start);
              const normalizedEnd = end == null ? normalizedStart : normalizeToStartOfDay(end);
              onSelect(normalizedStart, normalizedEnd);
              onClose();
            }}
            disabled={start == null}
            accessibilityLabel="Select date range"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

// ====================================================================
// Main Component
// ====================================================================

export function FormDatePicker(props: FormDatePickerProps) {
  const {
    label,
    placeholder = 'Select a date',
    error,
    helpText,
    minimumDate,
    maximumDate,
    allowClear = false,
  } = props;

  const isRange = props.mode === 'range';
  const colorScheme = useColorScheme() ?? 'light';
  const [isOpen, setIsOpen] = useState(false);

  const displayText = isRange
    ? formatDateRange(props.rangeStart, props.rangeEnd)
    : formatDate(props.value);

  const hasValue = isRange
    ? props.rangeStart != null || props.rangeEnd != null
    : props.value != null;

  const handleClear = () => {
    if (isRange) {
      props.onRangeSelect(null, null);
    } else {
      props.onChange(null);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.label}>
        {label}
      </ThemedText>
      <View style={styles.inputRow}>
        <Pressable
          style={[
            styles.dateButton,
            {
              backgroundColor: Colors[colorScheme].surface,
              borderColor: error ? Colors[colorScheme].error : Colors[colorScheme].border,
            },
          ]}
          onPress={() => setIsOpen(true)}
          accessibilityLabel={`${label}: ${hasValue ? displayText : placeholder}`}
          accessibilityRole="button"
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={Colors[colorScheme].iconSecondary}
            style={styles.calendarIcon}
          />
          <ThemedText
            style={[styles.dateText, !hasValue && { color: Colors[colorScheme].textTertiary }]}
          >
            {hasValue ? displayText : placeholder}
          </ThemedText>
        </Pressable>
        {allowClear && hasValue && (
          <Pressable
            style={[styles.clearButton, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
            onPress={handleClear}
            accessibilityLabel="Clear date"
            accessibilityRole="button"
          >
            <Ionicons name="close-circle" size={20} color={Colors[colorScheme].iconSecondary} />
          </Pressable>
        )}
      </View>
      {error && (
        <ThemedText type="caption" style={[styles.errorText, { color: Colors[colorScheme].error }]}>
          {error}
        </ThemedText>
      )}
      {helpText && !error && (
        <ThemedText type="caption" style={styles.helpText}>
          {helpText}
        </ThemedText>
      )}

      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsOpen(false)}
      >
        {isRange ? (
          <RangePickerModal
            rangeStart={props.rangeStart}
            rangeEnd={props.rangeEnd}
            onSelect={props.onRangeSelect}
            onClose={() => setIsOpen(false)}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            colorScheme={colorScheme}
          />
        ) : (
          <SinglePickerModal
            value={props.value}
            onChange={props.onChange}
            onClose={() => setIsOpen(false)}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            colorScheme={colorScheme}
          />
        )}
      </Modal>
    </View>
  );
}

// ====================================================================
// Styles
// ====================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  calendarIcon: {
    marginRight: 12,
  },
  dateText: {
    fontSize: 16,
    flex: 1,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    marginTop: 4,
  },
  helpText: {
    marginTop: 4,
  },
  rangeHint: {
    textAlign: 'center',
    marginBottom: 12,
    opacity: 0.8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  dayCell: {
    width: '14.28%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayHighlight: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalActions: {
    paddingTop: 8,
  },
});
