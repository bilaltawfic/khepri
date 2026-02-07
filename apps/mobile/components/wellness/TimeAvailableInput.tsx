import { Pressable, StyleSheet, View } from 'react-native';
import { useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { AVAILABLE_TIME_OPTIONS, type AvailableTimeMinutes } from '@/types/checkin';

type TimeAvailableInputProps = {
  value: AvailableTimeMinutes | null;
  onChange: (value: AvailableTimeMinutes) => void;
  accessibilityLabel?: string;
};

export function TimeAvailableInput({
  value,
  onChange,
  accessibilityLabel = 'Available time input',
}: TimeAvailableInputProps) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <View style={styles.container} accessibilityLabel={accessibilityLabel}>
      <View style={styles.optionsRow}>
        {AVAILABLE_TIME_OPTIONS.map((option) => {
          const isSelected = value === option.value;
          return (
            <Pressable
              key={option.value}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected
                    ? Colors[colorScheme].primary
                    : Colors[colorScheme].surfaceVariant,
                },
              ]}
              onPress={() => onChange(option.value)}
              accessibilityLabel={`Select ${option.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <ThemedText
                style={[
                  styles.optionText,
                  {
                    color: isSelected ? Colors[colorScheme].textInverse : Colors[colorScheme].text,
                  },
                ]}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
