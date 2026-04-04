import { View, useColorScheme } from 'react-native';

import type { WeeklyCompliance } from '@khepri/core';
import { complianceColor } from '@khepri/core';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

interface WeekTimelineProps {
  readonly weeks: readonly (WeeklyCompliance | null)[];
  readonly currentWeek: number;
  readonly cellSize?: number;
}

/**
 * Row of weekly compliance squares — like a GitHub contribution graph but for
 * training compliance. Each cell is coloured green/amber/red based on that
 * week's score. The current week has a border highlight.
 */
export function WeekTimeline({ weeks, currentWeek, cellSize = 20 }: WeekTimelineProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <View
      accessibilityRole="text"
      accessibilityLabel="Weekly compliance timeline"
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}
    >
      {weeks.map((week, index) => {
        const weekNumber = index + 1;
        const isCurrent = weekNumber === currentWeek;
        const color =
          week == null ? colors.surfaceVariant : complianceColor(week.compliance_color, colors);

        let borderWidth: number;
        if (isCurrent) {
          borderWidth = 2;
        } else if (week == null) {
          borderWidth = 1;
        } else {
          borderWidth = 0;
        }

        return (
          <View
            key={weekNumber}
            accessibilityLabel={
              week == null
                ? `Week ${weekNumber}: not started`
                : `Week ${weekNumber}: ${week.compliance_color} (${Math.round(week.compliance_score * 100)}%)`
            }
            style={{
              width: cellSize,
              height: cellSize,
              borderRadius: 4,
              backgroundColor: week == null ? 'transparent' : color,
              borderWidth,
              borderColor: isCurrent ? colors.primary : colors.surfaceVariant,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isCurrent && (
              <ThemedText
                style={{
                  fontSize: 8,
                  fontWeight: '700',
                  color: week == null ? colors.primary : colors.textInverse,
                }}
              >
                {weekNumber}
              </ThemedText>
            )}
          </View>
        );
      })}
    </View>
  );
}
