import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

export type FormDatePickerProps = {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  error?: string;
  helpText?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  allowClear?: boolean;
};

function formatDate(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Normalize a date to start of day (00:00:00) for date-only comparisons
 */
function normalizeToStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// Simple date picker UI without native dependencies
function DatePickerModal({
  value,
  onChange,
  onClose,
  minimumDate,
  maximumDate,
  colorScheme,
}: {
  value: Date | null;
  onChange: (date: Date) => void;
  onClose: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
  colorScheme: 'light' | 'dark';
}) {
  // Clamp initial date to valid range
  const getInitialDate = () => {
    if (value) return value;
    const now = new Date();
    if (maximumDate && now > normalizeToStartOfDay(maximumDate)) return maximumDate;
    if (minimumDate && now < normalizeToStartOfDay(minimumDate)) return minimumDate;
    return now;
  };
  const [selectedDate, setSelectedDate] = useState(getInitialDate);

  const months = [
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
  ];

  const currentYear = selectedDate.getFullYear();
  const currentMonth = selectedDate.getMonth();
  const currentDay = selectedDate.getDate();

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const days: { id: string; day: number | null }[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push({ id: `empty-${i}`, day: null });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({ id: `day-${i}`, day: i });
  }

  const changeMonth = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + delta);
    newDate.setDate(1);
    setSelectedDate(newDate);
  };

  const selectDay = (day: number) => {
    const newDate = new Date(currentYear, currentMonth, day);
    // Normalize dates to start of day for date-only comparison
    if (minimumDate && newDate < normalizeToStartOfDay(minimumDate)) return;
    if (maximumDate && newDate > normalizeToStartOfDay(maximumDate)) return;
    setSelectedDate(newDate);
  };

  const isDisabled = (day: number): boolean => {
    const date = new Date(currentYear, currentMonth, day);
    // Normalize dates to start of day for date-only comparison
    if (minimumDate && date < normalizeToStartOfDay(minimumDate)) return true;
    if (maximumDate && date > normalizeToStartOfDay(maximumDate)) return true;
    return false;
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

        <View style={styles.monthNav}>
          <Pressable
            onPress={() => changeMonth(-1)}
            accessibilityLabel="Previous month"
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={Colors[colorScheme].primary} />
          </Pressable>
          <ThemedText type="defaultSemiBold">
            {months[currentMonth]} {currentYear}
          </ThemedText>
          <Pressable
            onPress={() => changeMonth(1)}
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
          {days.map((cell) => (
            <Pressable
              key={cell.id}
              style={[
                styles.dayCell,
                cell.day === currentDay && {
                  backgroundColor: Colors[colorScheme].primary,
                  borderRadius: 20,
                },
                cell.day && isDisabled(cell.day) && { opacity: 0.3 },
              ]}
              onPress={() => cell.day && selectDay(cell.day)}
              disabled={!cell.day || isDisabled(cell.day)}
              accessibilityLabel={cell.day ? `${months[currentMonth]} ${cell.day}` : undefined}
              accessibilityRole="button"
            >
              {cell.day && (
                <ThemedText
                  style={[
                    styles.dayText,
                    cell.day === currentDay && { color: Colors[colorScheme].textInverse },
                  ]}
                >
                  {cell.day}
                </ThemedText>
              )}
            </Pressable>
          ))}
        </View>

        <View style={styles.modalActions}>
          <Button
            title="Select"
            onPress={() => {
              // Guard against out-of-range dates
              const normalized = normalizeToStartOfDay(selectedDate);
              if (minimumDate && normalized < normalizeToStartOfDay(minimumDate)) return;
              if (maximumDate && normalized > normalizeToStartOfDay(maximumDate)) return;
              onChange(selectedDate);
              onClose();
            }}
            accessibilityLabel="Select date"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

export function FormDatePicker({
  label,
  value,
  onChange,
  placeholder = 'Select a date',
  error,
  helpText,
  minimumDate,
  maximumDate,
  allowClear = false,
}: FormDatePickerProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const [isOpen, setIsOpen] = useState(false);

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
          accessibilityLabel={`${label}: ${value ? formatDate(value) : placeholder}`}
          accessibilityRole="button"
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={Colors[colorScheme].iconSecondary}
            style={styles.calendarIcon}
          />
          <ThemedText
            style={[styles.dateText, !value && { color: Colors[colorScheme].textTertiary }]}
          >
            {value ? formatDate(value) : placeholder}
          </ThemedText>
        </Pressable>
        {allowClear && value && (
          <Pressable
            style={[styles.clearButton, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
            onPress={() => onChange(null)}
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
        <DatePickerModal
          value={value}
          onChange={onChange}
          onClose={() => setIsOpen(false)}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          colorScheme={colorScheme}
        />
      </Modal>
    </View>
  );
}

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
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 16,
  },
  modalActions: {
    paddingTop: 8,
  },
});
