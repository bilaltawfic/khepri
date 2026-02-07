import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

type HoursInputProps = {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  accessibilityLabel?: string;
};

export function HoursInput({
  value,
  onChange,
  min = 0,
  max = 12,
  step = 0.5,
  accessibilityLabel = 'Hours input',
}: Readonly<HoursInputProps>) {
  const colorScheme = useColorScheme() ?? 'light';

  const decrease = () => {
    if (value === null) {
      onChange(max);
    } else if (value > min) {
      onChange(Math.max(min, value - step));
    }
  };

  const increase = () => {
    if (value === null) {
      onChange(min);
    } else if (value < max) {
      onChange(Math.min(max, value + step));
    }
  };

  const formatValue = (val: number | null): string => {
    if (val === null) return '--';
    if (val % 1 === 0) return `${val}`;
    return val.toFixed(1);
  };

  const displayValue = formatValue(value);

  return (
    <View style={styles.container} accessibilityLabel={accessibilityLabel}>
      <Pressable
        style={[styles.button, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
        onPress={decrease}
        accessibilityLabel="Decrease hours"
        accessibilityRole="button"
      >
        <ThemedText style={styles.buttonText}>-</ThemedText>
      </Pressable>

      <View style={[styles.valueContainer, { borderColor: Colors[colorScheme].border }]}>
        <ThemedText style={styles.valueText}>{displayValue}</ThemedText>
        <ThemedText type="caption" style={styles.unitText}>
          hours
        </ThemedText>
      </View>

      <Pressable
        style={[styles.button, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
        onPress={increase}
        accessibilityLabel="Increase hours"
        accessibilityRole="button"
      >
        <ThemedText style={styles.buttonText}>+</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  valueContainer: {
    minWidth: 80,
    alignItems: 'center',
    paddingVertical: 8,
  },
  valueText: {
    fontSize: 32,
    fontWeight: '700',
  },
  unitText: {
    marginTop: 2,
  },
});
