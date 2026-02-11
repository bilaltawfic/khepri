import { ActivityIndicator, StyleSheet, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

type LoadingStateProps = {
  message: string;
  accessibilityLabel?: string;
};

export function LoadingState({ message, accessibilityLabel }: Readonly<LoadingStateProps>) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel ?? message}
    >
      <ActivityIndicator size="large" color={Colors[colorScheme].primary} />
      <ThemedText style={styles.message}>{message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  message: {
    opacity: 0.7,
  },
});
