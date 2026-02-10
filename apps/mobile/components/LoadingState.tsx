import { ActivityIndicator, StyleSheet, View, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Colors } from '@/constants/Colors';

type LoadingStateProps = {
  message: string;
};

export function LoadingState({ message }: LoadingStateProps) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <View style={styles.container}>
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
