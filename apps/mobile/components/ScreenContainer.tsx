import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView, type ThemedViewProps } from './ThemedView';

export type ScreenContainerProps = ThemedViewProps;

export function ScreenContainer({ style, children, ...props }: ScreenContainerProps) {
  return (
    <ThemedView style={[styles.container, style]} {...props}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
