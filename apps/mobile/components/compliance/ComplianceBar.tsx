import { View, useColorScheme } from 'react-native';

import { Colors } from '@/constants/Colors';

interface ComplianceBarProps {
  readonly green: number;
  readonly amber: number;
  readonly red: number;
  readonly missed: number;
  readonly total: number;
  readonly height?: number;
}

/**
 * Horizontal segmented bar showing green/amber/red/missed proportions of
 * workouts in a week or block. Remaining (unstarted) sessions are shown in
 * surfaceVariant colour.
 */
export function ComplianceBar({
  green,
  amber,
  red,
  missed,
  total,
  height = 8,
}: ComplianceBarProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const safeTotal = total > 0 ? total : 1;
  const remaining = Math.max(0, total - green - amber - red - missed);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Compliance: ${green} green, ${amber} amber, ${red + missed} red or missed out of ${total}`}
      style={{
        flexDirection: 'row',
        height,
        borderRadius: height / 2,
        overflow: 'hidden',
        backgroundColor: colors.surfaceVariant,
      }}
    >
      {green > 0 && <View style={{ flex: green / safeTotal, backgroundColor: colors.success }} />}
      {amber > 0 && <View style={{ flex: amber / safeTotal, backgroundColor: colors.warning }} />}
      {red + missed > 0 && (
        <View style={{ flex: (red + missed) / safeTotal, backgroundColor: colors.error }} />
      )}
      {remaining > 0 && (
        <View style={{ flex: remaining / safeTotal, backgroundColor: colors.surfaceVariant }} />
      )}
    </View>
  );
}
