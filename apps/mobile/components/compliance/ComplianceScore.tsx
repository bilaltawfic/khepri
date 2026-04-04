import { useColorScheme } from 'react-native';

import { complianceColor } from '@khepri/core';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

interface ComplianceScoreProps {
  readonly value: number;
  readonly fontSize?: number;
}

/**
 * Displays a compliance percentage in the appropriate compliance colour.
 * `value` is 0.0–1.0. Colour thresholds match WeeklyCompliance:
 * - >= 0.8 → green
 * - >= 0.5 → amber
 * - < 0.5  → red
 */
export function ComplianceScore({ value, fontSize = 14 }: ComplianceScoreProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  let colorKey: 'green' | 'amber' | 'red';
  if (value >= 0.8) {
    colorKey = 'green';
  } else if (value >= 0.5) {
    colorKey = 'amber';
  } else {
    colorKey = 'red';
  }

  const color = complianceColor(colorKey, colors);
  const label = `${Math.round(value * 100)}%`;

  return (
    <ThemedText
      accessibilityRole="text"
      accessibilityLabel={`Compliance score: ${label}`}
      style={{ fontSize, fontWeight: '700', color }}
    >
      {label}
    </ThemedText>
  );
}
