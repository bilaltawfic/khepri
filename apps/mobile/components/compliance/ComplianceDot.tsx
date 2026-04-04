import { View, useColorScheme } from 'react-native';

import type { WorkoutComplianceResult } from '@khepri/core';
import { complianceColor } from '@khepri/core';

import { Colors } from '@/constants/Colors';

interface ComplianceDotProps {
  readonly score: WorkoutComplianceResult['score'] | null;
  readonly size?: number;
}

/**
 * A small coloured dot indicating workout compliance.
 * - green  → on target (80–120%)
 * - amber  → moderate deviation (50–79% or 121–150%)
 * - red    → major deviation or missed (<50% or >150%)
 * - missed → red (same colour, no activity)
 * - unplanned → grey (activity with no plan)
 * - null   → grey outline (future / not yet relevant)
 */
export function ComplianceDot({ score, size = 10 }: ComplianceDotProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const fill = complianceColor(score, colors);
  const isFuture = score == null;

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={score == null ? 'Not yet completed' : `Compliance: ${score}`}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: isFuture ? 'transparent' : fill,
        borderWidth: isFuture ? 1.5 : 0,
        borderColor: colors.surfaceVariant,
      }}
    />
  );
}
