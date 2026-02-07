import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

type ScaleInputProps = {
  value: number | null;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  lowLabel?: string;
  highLabel?: string;
  accessibilityLabel?: string;
  /** When true, higher values are shown as positive (green) - use for metrics like sleep quality, energy */
  higherIsBetter?: boolean;
};

export function ScaleInput({
  value,
  onChange,
  min = 1,
  max = 10,
  lowLabel,
  highLabel,
  accessibilityLabel = 'Scale input',
  higherIsBetter = false,
}: Readonly<ScaleInputProps>) {
  const colorScheme = useColorScheme() ?? 'light';
  const range = Array.from({ length: max - min + 1 }, (_, i) => i + min);

  const getButtonColor = (num: number) => {
    if (value !== num) {
      return Colors[colorScheme].surfaceVariant;
    }
    // Color gradient based on higherIsBetter:
    // - false (default): green (low) to red (high) for stress/soreness
    // - true: red (low) to green (high) for sleep quality/energy
    // Guard against division by zero when min === max
    const rangeSize = max - min;
    const percentage = rangeSize > 0 ? (num - min) / rangeSize : 0;
    const effectivePercentage = higherIsBetter ? 1 - percentage : percentage;

    if (effectivePercentage < 0.4) {
      return Colors[colorScheme].success;
    }
    if (effectivePercentage < 0.7) {
      return Colors[colorScheme].warning;
    }
    return Colors[colorScheme].error;
  };

  const getTextColor = (num: number) => {
    if (value !== num) {
      return Colors[colorScheme].textSecondary;
    }
    return Colors[colorScheme].textInverse;
  };

  return (
    <View style={styles.container} accessibilityLabel={accessibilityLabel}>
      {(lowLabel || highLabel) && (
        <View style={styles.labelRow}>
          <ThemedText type="caption" style={styles.label}>
            {lowLabel}
          </ThemedText>
          <ThemedText type="caption" style={styles.label}>
            {highLabel}
          </ThemedText>
        </View>
      )}
      <View style={styles.scaleRow}>
        {range.map((num) => (
          <Pressable
            key={num}
            style={[styles.scaleButton, { backgroundColor: getButtonColor(num) }]}
            onPress={() => onChange(num)}
            accessibilityLabel={`Select ${num}`}
            accessibilityRole="button"
            accessibilityState={{ selected: value === num }}
          >
            <ThemedText style={[styles.scaleText, { color: getTextColor(num) }]}>{num}</ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  label: {
    fontSize: 12,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  scaleButton: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
