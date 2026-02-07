import { Pressable, StyleSheet, View } from 'react-native';
import { useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';
import { BODY_AREA_OPTIONS, type BodyArea, type SorenessAreas } from '@/types/checkin';

type SorenessInputProps = {
  overallSoreness: number | null;
  sorenessAreas: SorenessAreas;
  onOverallChange: (value: number) => void;
  onAreaToggle: (area: BodyArea) => void;
  accessibilityLabel?: string;
};

export function SorenessInput({
  overallSoreness,
  sorenessAreas,
  onOverallChange,
  onAreaToggle,
  accessibilityLabel = 'Soreness input',
}: SorenessInputProps) {
  const colorScheme = useColorScheme() ?? 'light';

  const getSorenessColor = (level: number | null) => {
    if (level === null) return Colors[colorScheme].surfaceVariant;
    if (level <= 3) return Colors[colorScheme].success;
    if (level <= 6) return Colors[colorScheme].warning;
    return Colors[colorScheme].error;
  };

  const getSorenessLabel = (level: number | null) => {
    if (level === null) return 'Not set';
    if (level <= 2) return 'Fresh';
    if (level <= 4) return 'Mild';
    if (level <= 6) return 'Moderate';
    if (level <= 8) return 'Sore';
    return 'Very Sore';
  };

  return (
    <View style={styles.container} accessibilityLabel={accessibilityLabel}>
      {/* Overall soreness slider */}
      <View style={styles.overallSection}>
        <View style={styles.overallHeader}>
          <ThemedText type="defaultSemiBold">Overall: </ThemedText>
          <ThemedText style={[styles.sorenessLabel, { color: getSorenessColor(overallSoreness) }]}>
            {getSorenessLabel(overallSoreness)}
            {overallSoreness !== null && ` (${overallSoreness}/10)`}
          </ThemedText>
        </View>

        {/* Simple 1-10 buttons */}
        <View style={styles.scaleRow}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
            const isSelected = overallSoreness === num;
            return (
              <Pressable
                key={num}
                style={[
                  styles.scaleButton,
                  {
                    backgroundColor: isSelected
                      ? getSorenessColor(num)
                      : Colors[colorScheme].surfaceVariant,
                  },
                ]}
                onPress={() => onOverallChange(num)}
                accessibilityLabel={`Soreness level ${num}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <ThemedText
                  style={[
                    styles.scaleText,
                    {
                      color: isSelected
                        ? Colors[colorScheme].textInverse
                        : Colors[colorScheme].textSecondary,
                    },
                  ]}
                >
                  {num}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Body area toggles */}
      <View style={styles.areasSection}>
        <ThemedText type="caption" style={styles.areasLabel}>
          Tap areas that are sore (optional):
        </ThemedText>
        <View style={styles.areasGrid}>
          {BODY_AREA_OPTIONS.map((area) => {
            const isSelected = area.value in sorenessAreas;
            return (
              <Pressable
                key={area.value}
                style={[
                  styles.areaButton,
                  {
                    backgroundColor: isSelected
                      ? Colors[colorScheme].warning
                      : Colors[colorScheme].surfaceVariant,
                    borderColor: isSelected
                      ? Colors[colorScheme].warning
                      : Colors[colorScheme].border,
                  },
                ]}
                onPress={() => onAreaToggle(area.value)}
                accessibilityLabel={`${area.label} ${isSelected ? 'sore' : 'not sore'}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <ThemedText
                  style={[
                    styles.areaText,
                    {
                      color: isSelected
                        ? Colors[colorScheme].textInverse
                        : Colors[colorScheme].text,
                    },
                  ]}
                >
                  {area.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 16,
  },
  overallSection: {
    gap: 12,
  },
  overallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sorenessLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  scaleButton: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  areasSection: {
    gap: 8,
  },
  areasLabel: {
    marginBottom: 4,
  },
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  areaText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
