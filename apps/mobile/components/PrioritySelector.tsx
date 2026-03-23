import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

const PRIORITIES = ['A', 'B', 'C'] as const;

type Priority = (typeof PRIORITIES)[number];

type PrioritySelectorProps = Readonly<{
  value: Priority;
  onChange: (priority: Priority) => void;
}>;

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <View style={styles.container}>
      {PRIORITIES.map((p) => (
        <Pressable
          key={p}
          style={[
            styles.option,
            {
              backgroundColor:
                value === p ? Colors[colorScheme].primary : Colors[colorScheme].surfaceVariant,
            },
          ]}
          onPress={() => onChange(p)}
          accessibilityLabel={`Priority ${p}`}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === p }}
        >
          <ThemedText
            style={{
              color: value === p ? Colors[colorScheme].textInverse : Colors[colorScheme].text,
              fontWeight: '600',
            }}
          >
            {p}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  option: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
