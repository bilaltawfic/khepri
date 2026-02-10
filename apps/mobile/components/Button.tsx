import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import { useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'text';
  accessibilityLabel?: string;
  disabled?: boolean;
  style?: ViewStyle;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  accessibilityLabel,
  disabled = false,
  style,
}: ButtonProps) {
  const colorScheme = useColorScheme() ?? 'light';

  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return [
          styles.button,
          styles.primaryButton,
          {
            backgroundColor: disabled
              ? Colors[colorScheme].surfaceVariant
              : Colors[colorScheme].primary,
          },
          style,
        ];
      case 'secondary':
        return [
          styles.button,
          styles.secondaryButton,
          { borderColor: Colors[colorScheme].primary },
          style,
        ];
      case 'text':
        return [styles.button, styles.textButton, style];
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return [
          styles.buttonText,
          styles.primaryButtonText,
          { color: disabled ? Colors[colorScheme].textTertiary : Colors[colorScheme].textInverse },
        ];
      case 'secondary':
        return [styles.buttonText, { color: Colors[colorScheme].primary }];
      case 'text':
        return [styles.textButtonText, { color: Colors[colorScheme].textSecondary }];
    }
  };

  return (
    <Pressable
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <ThemedText style={getTextStyle()}>{title}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
  },
  primaryButton: {
    borderRadius: 12,
    padding: 16,
  },
  secondaryButton: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 14,
  },
  textButton: {
    padding: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  primaryButtonText: {},
  textButtonText: {
    fontSize: 16,
  },
});
