import { StyleSheet, View, useColorScheme } from 'react-native';

import { type WeeklyCompliance, complianceColor } from '@khepri/core';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

interface WeekSummaryProps {
  readonly compliance: WeeklyCompliance;
  readonly totalDaysInWeek?: number;
}

function DotRow({
  compliance,
  totalDays,
  colorScheme,
}: Readonly<{
  compliance: WeeklyCompliance;
  totalDays: number;
  colorScheme: 'light' | 'dark';
}>) {
  const completedDots = compliance.green_count + compliance.amber_count + compliance.red_count;
  const missedDots = compliance.missed_sessions;
  const futureDots = Math.max(0, totalDays - completedDots - missedDots);

  const dots: Array<{ key: string; color: string }> = [];

  for (let i = 0; i < compliance.green_count; i++) {
    dots.push({ key: `g-${i}`, color: Colors[colorScheme].success });
  }
  for (let i = 0; i < compliance.amber_count; i++) {
    dots.push({ key: `a-${i}`, color: Colors[colorScheme].warning });
  }
  for (let i = 0; i < compliance.red_count; i++) {
    dots.push({ key: `r-${i}`, color: Colors[colorScheme].error });
  }
  for (let i = 0; i < missedDots; i++) {
    dots.push({ key: `m-${i}`, color: Colors[colorScheme].error });
  }
  for (let i = 0; i < futureDots; i++) {
    dots.push({ key: `f-${i}`, color: Colors[colorScheme].surfaceVariant });
  }

  return (
    <View style={styles.dotRow}>
      {dots.map((d) => (
        <View key={d.key} style={[styles.dot, { backgroundColor: d.color }]} />
      ))}
    </View>
  );
}

function formatHours(hours: number): string {
  return hours < 1 ? `${Math.round(hours * 60)}m` : `${hours.toFixed(1)}h`;
}

export function WeekSummary({ compliance, totalDaysInWeek = 7 }: WeekSummaryProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const remaining = Math.max(
    0,
    compliance.planned_sessions - compliance.completed_sessions - compliance.missed_sessions
  );
  const pct = Math.round(compliance.compliance_score * 100);
  const pctColor = complianceColor(compliance.compliance_color, Colors[colorScheme]);

  return (
    <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
      <ThemedText type="caption" style={styles.title}>
        THIS WEEK
      </ThemedText>

      <ThemedText style={styles.summaryText}>
        {compliance.completed_sessions} completed &middot; {remaining} remaining &middot;{' '}
        {formatHours(compliance.planned_hours)} planned
      </ThemedText>

      <View style={styles.complianceRow}>
        <DotRow compliance={compliance} totalDays={totalDaysInWeek} colorScheme={colorScheme} />
        <ThemedText type="defaultSemiBold" style={{ color: pctColor }}>
          {pct}%
        </ThemedText>
      </View>

      {compliance.actual_hours > 0 && (
        <ThemedText type="caption" style={styles.hoursText}>
          {formatHours(compliance.actual_hours)} actual / {formatHours(compliance.planned_hours)}{' '}
          planned
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryText: {
    marginBottom: 8,
    opacity: 0.8,
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  hoursText: {
    marginTop: 8,
    opacity: 0.6,
  },
});
