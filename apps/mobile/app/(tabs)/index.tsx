import { ScrollView, StyleSheet, View } from 'react-native';
import { useColorScheme } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

export default function DashboardScreen() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.greeting}>
          Good morning!
        </ThemedText>
        <ThemedText type="caption" style={styles.subtitle}>
          Here's your training overview
        </ThemedText>

        {/* Today's Workout Card */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle">Today's Workout</ThemedText>
          </View>
          <ThemedText style={styles.cardDescription}>
            Your personalized workout for today will appear here based on your daily check-in,
            recent training load, and goals.
          </ThemedText>
          <View
            style={[styles.placeholder, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
          >
            <ThemedText type="caption">Complete your daily check-in to get started</ThemedText>
          </View>
        </ThemedView>

        {/* Training Load Card */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle">Training Load</ThemedText>
          </View>
          <ThemedText style={styles.cardDescription}>
            Your CTL (fitness), ATL (fatigue), and TSB (form) metrics will be displayed here once
            connected to Intervals.icu.
          </ThemedText>
          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <ThemedText type="caption">CTL (Fitness)</ThemedText>
              <ThemedText type="defaultSemiBold">--</ThemedText>
            </View>
            <View style={styles.metric}>
              <ThemedText type="caption">ATL (Fatigue)</ThemedText>
              <ThemedText type="defaultSemiBold">--</ThemedText>
            </View>
            <View style={styles.metric}>
              <ThemedText type="caption">TSB (Form)</ThemedText>
              <ThemedText type="defaultSemiBold">--</ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* Upcoming Events Card */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <View style={styles.cardHeader}>
            <ThemedText type="subtitle">Upcoming Events</ThemedText>
          </View>
          <ThemedText style={styles.cardDescription}>
            Your scheduled workouts and race goals will appear here.
          </ThemedText>
          <View
            style={[styles.placeholder, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
          >
            <ThemedText type="caption">No upcoming events</ThemedText>
          </View>
        </ThemedView>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  greeting: {
    marginBottom: 4,
  },
  subtitle: {
    marginBottom: 24,
  },
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
  cardHeader: {
    marginBottom: 8,
  },
  cardDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  placeholder: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  metric: {
    alignItems: 'center',
    gap: 4,
  },
});
