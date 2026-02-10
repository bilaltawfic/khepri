import { Ionicons } from '@expo/vector-icons';
import { type StyleProp, StyleSheet, type ViewStyle, useColorScheme } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

type TipCardProps = {
  message: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
};

export function TipCard({ message, icon, style }: TipCardProps) {
  const colorScheme = useColorScheme() ?? 'light';

  return (
    <ThemedView style={[styles.container, { borderColor: Colors[colorScheme].primary }, style]}>
      <Ionicons name={icon ?? 'bulb-outline'} size={20} color={Colors[colorScheme].primary} />
      <ThemedText type="caption" style={styles.text}>
        {message}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
    gap: 8,
  },
  text: {
    flex: 1,
    lineHeight: 20,
  },
});
