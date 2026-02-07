import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

export type SelectOption<T = string> = {
  label: string;
  value: T;
};

export type FormSelectProps<T = string> = {
  label: string;
  value: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
  helpText?: string;
};

export function FormSelect<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  error,
  helpText,
}: Readonly<FormSelectProps<T>>) {
  const colorScheme = useColorScheme() ?? 'light';
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.label}>
        {label}
      </ThemedText>
      <Pressable
        style={[
          styles.select,
          {
            backgroundColor: Colors[colorScheme].surface,
            borderColor: error ? Colors[colorScheme].error : Colors[colorScheme].border,
          },
        ]}
        onPress={() => setIsOpen(true)}
        accessibilityLabel={`${label}: ${selectedOption?.label ?? placeholder}`}
        accessibilityRole="button"
      >
        <ThemedText
          style={[
            styles.selectText,
            !selectedOption && { color: Colors[colorScheme].textTertiary },
          ]}
        >
          {selectedOption?.label ?? placeholder}
        </ThemedText>
        <Ionicons name="chevron-down" size={20} color={Colors[colorScheme].iconSecondary} />
      </Pressable>
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
        <View style={styles.modalOverlay}>
          <SafeAreaView
            style={[styles.modalContent, { backgroundColor: Colors[colorScheme].background }]}
            edges={['bottom']}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">{label}</ThemedText>
              <Pressable
                onPress={() => setIsOpen(false)}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={Colors[colorScheme].icon} />
              </Pressable>
            </View>
            <ScrollView style={styles.optionsList}>
              {options.map((option) => (
                <Pressable
                  key={String(option.value)}
                  style={[
                    styles.option,
                    {
                      backgroundColor:
                        option.value === value
                          ? Colors[colorScheme].surfaceVariant
                          : Colors[colorScheme].surface,
                    },
                  ]}
                  onPress={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  accessibilityLabel={option.label}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: option.value === value }}
                >
                  <ThemedText
                    style={[
                      styles.optionText,
                      option.value === value && { color: Colors[colorScheme].primary },
                    ]}
                  >
                    {option.label}
                  </ThemedText>
                  {option.value === value && (
                    <Ionicons name="checkmark" size={20} color={Colors[colorScheme].primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
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
  select: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 16,
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
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  optionsList: {
    padding: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  optionText: {
    fontSize: 16,
  },
});
