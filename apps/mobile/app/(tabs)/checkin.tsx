import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useColorScheme } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

export default function CheckinScreen() {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ScreenContainer>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <ThemedText type="title" style={styles.title}>
          Daily Check-in
        </ThemedText>
        <ThemedText type="caption" style={styles.subtitle}>
          Tell me how you're feeling today
        </ThemedText>

        {/* Sleep Quality */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Sleep Quality
          </ThemedText>
          <ThemedText style={styles.cardDescription}>
            Rate your sleep quality from 1-10 and enter hours slept. This helps gauge recovery and
            adjust training intensity.
          </ThemedText>
          <View style={[styles.inputPlaceholder, { borderColor: Colors[colorScheme].border }]}>
            <ThemedText type="caption">Sleep rating slider (1-10)</ThemedText>
            <ThemedText type="caption">Hours slept input</ThemedText>
          </View>
        </ThemedView>

        {/* Energy Level */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Energy Level
          </ThemedText>
          <ThemedText style={styles.cardDescription}>
            How energized do you feel? This affects workout recommendations and intensity
            suggestions.
          </ThemedText>
          <View style={[styles.inputPlaceholder, { borderColor: Colors[colorScheme].border }]}>
            <ThemedText type="caption">Energy rating slider (1-10)</ThemedText>
          </View>
        </ThemedView>

        {/* Muscle Soreness */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Muscle Soreness
          </ThemedText>
          <ThemedText style={styles.cardDescription}>
            Tap areas where you feel soreness. This helps identify fatigue patterns and avoid
            overuse injuries.
          </ThemedText>
          <View style={[styles.inputPlaceholder, { borderColor: Colors[colorScheme].border }]}>
            <ThemedText type="caption">Body map selector (coming soon)</ThemedText>
          </View>
        </ThemedView>

        {/* Availability */}
        <ThemedView style={[styles.card, { backgroundColor: Colors[colorScheme].surface }]}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Today's Availability
          </ThemedText>
          <ThemedText style={styles.cardDescription}>
            How much time do you have for training today? Any equipment or location constraints?
          </ThemedText>
          <View style={[styles.inputPlaceholder, { borderColor: Colors[colorScheme].border }]}>
            <ThemedText type="caption">Time available selector</ThemedText>
            <ThemedText type="caption">Equipment/location options</ThemedText>
          </View>
        </ThemedView>

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, { backgroundColor: Colors[colorScheme].primary }]}
          onPress={() => {
            // TODO: Submit check-in and get AI recommendation
          }}
          accessibilityLabel="Submit daily check-in"
          accessibilityRole="button"
        >
          <ThemedText style={[styles.submitButtonText, { color: Colors[colorScheme].textInverse }]}>
            Get Today's Recommendation
          </ThemedText>
        </Pressable>

        <ThemedText type="caption" style={styles.footerText}>
          Your check-in will be analyzed along with your recent training data to provide a
          personalized workout recommendation.
        </ThemedText>
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
  title: {
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
  cardTitle: {
    marginBottom: 8,
  },
  cardDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  inputPlaceholder: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  footerText: {
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
