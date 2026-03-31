import { StyleSheet } from 'react-native';

/** Shared styles for AI recommendation cards used in check-in and detail screens. */
export const recommendationStyles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  fallbackNotice: {
    color: '#b08000',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  summary: {
    marginBottom: 16,
    lineHeight: 24,
  },
  workoutBox: {
    padding: 16,
    borderRadius: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  workoutTitle: {
    fontSize: 18,
  },
  workoutNotes: {
    marginTop: 8,
    fontStyle: 'italic',
  },
  intensityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  intensityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000',
  },
});
