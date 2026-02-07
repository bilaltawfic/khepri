import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { CONSTRAINT_OPTIONS, type ConstraintType } from '@/types/checkin';

type ConstraintTogglesProps = {
  selected: ConstraintType[];
  onChange: (constraints: ConstraintType[]) => void;
  accessibilityLabel?: string;
};

export function ConstraintToggles({
  selected,
  onChange,
  accessibilityLabel = 'Constraint toggles',
}: Readonly<ConstraintTogglesProps>) {
  const colorScheme = useColorScheme() ?? 'light';

  const toggleConstraint = (constraint: ConstraintType) => {
    if (selected.includes(constraint)) {
      onChange(selected.filter((c) => c !== constraint));
    } else {
      onChange([...selected, constraint]);
    }
  };

  return (
    <View style={styles.container} accessibilityLabel={accessibilityLabel}>
      <View style={styles.grid}>
        {CONSTRAINT_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              style={[
                styles.toggle,
                {
                  backgroundColor: isSelected
                    ? Colors[colorScheme].primary
                    : Colors[colorScheme].surfaceVariant,
                  borderColor: isSelected
                    ? Colors[colorScheme].primary
                    : Colors[colorScheme].border,
                },
              ]}
              onPress={() => toggleConstraint(option.value)}
              accessibilityLabel={`${option.label} ${isSelected ? 'selected' : 'not selected'}`}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
            >
              <Ionicons
                name={option.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={isSelected ? Colors[colorScheme].textInverse : Colors[colorScheme].icon}
              />
              <ThemedText
                style={[
                  styles.toggleText,
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
