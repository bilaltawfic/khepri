import { StyleSheet } from 'react-native';
import { type Edge, SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView, type ThemedViewProps } from './ThemedView';

export type ScreenContainerProps = ThemedViewProps & {
  /** Which safe-area edges to respect. Defaults to bottom + left + right. */
  readonly edges?: readonly Edge[];
};

const DEFAULT_EDGES: Edge[] = ['bottom', 'left', 'right'];

export function ScreenContainer({
  style,
  children,
  edges = DEFAULT_EDGES,
  ...props
}: ScreenContainerProps) {
  return (
    <ThemedView style={[styles.container, style]} {...props}>
      <SafeAreaView style={styles.safeArea} edges={edges}>
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
