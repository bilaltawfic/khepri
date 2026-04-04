import type { ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';

/**
 * Raw form style definitions shared across onboarding and season setup flows.
 * Exported as plain objects so they can be safely spread into other StyleSheet.create calls.
 */
export const formStyleDefs = {
  form: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  } satisfies ViewStyle,
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  } satisfies ViewStyle,
  formLabel: {
    marginBottom: 8,
    marginTop: 12,
  } satisfies ViewStyle,
  formInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
  } satisfies ViewStyle,
  errorText: {
    marginTop: 4,
  } satisfies ViewStyle,
} as const;

/**
 * Pre-created stylesheet for direct use (e.g. from onboarding).
 */
export const commonFormStyles = StyleSheet.create(formStyleDefs);
