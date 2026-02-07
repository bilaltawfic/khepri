import { TextInput as RNTextInput, StyleSheet, type TextInputProps, View } from 'react-native';
import { useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

export type FormInputProps = TextInputProps & {
  label: string;
  error?: string;
  helpText?: string;
  unit?: string;
};

export function FormInput({ label, error, helpText, unit, style, ...props }: FormInputProps) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <View style={styles.container}>
      <ThemedText type="defaultSemiBold" style={styles.label}>
        {label}
      </ThemedText>
      <View style={styles.inputWrapper}>
        <RNTextInput
          style={[
            styles.input,
            {
              backgroundColor: Colors[colorScheme].surface,
              borderColor: error ? Colors[colorScheme].error : Colors[colorScheme].border,
              color: Colors[colorScheme].text,
            },
            unit ? styles.inputWithUnit : undefined,
            style,
          ]}
          placeholderTextColor={Colors[colorScheme].textTertiary}
          accessibilityLabel={label}
          {...props}
        />
        {unit && (
          <View
            style={[styles.unitContainer, { backgroundColor: Colors[colorScheme].surfaceVariant }]}
          >
            <ThemedText type="caption" style={{ color: Colors[colorScheme].textSecondary }}>
              {unit}
            </ThemedText>
          </View>
        )}
      </View>
      {error && (
        <ThemedText type="caption" style={[styles.errorText, { color: Colors[colorScheme].error }]}>
          {error}
        </ThemedText>
      )}
      {helpText && !error && (
        <ThemedText type="caption" style={styles.helpText}>
          {helpText}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  inputWithUnit: {
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
  },
  unitContainer: {
    height: 48,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  errorText: {
    marginTop: 4,
  },
  helpText: {
    marginTop: 4,
  },
});
