import { StyleSheet } from 'react-native';

/**
 * Shared form styles used across onboarding and season setup flows.
 * Extracted to avoid cross-flow duplication.
 */
export const commonFormStyles = StyleSheet.create({
  form: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formLabel: {
    marginBottom: 8,
    marginTop: 12,
  },
  formInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  },
  errorText: {
    marginTop: 4,
  },
});
