import { StyleSheet, View } from 'react-native';
import { PillyText } from './pilly-text';
import { colors, spacing } from '@/design/tokens';
export function StatusLabel({ label }: { label: string }) {
  return (
    <View accessibilityLabel={`Status: ${label}`} style={styles.container}>
      <View style={styles.dot} />
      <PillyText role="caption">{label}</PillyText>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.textSecondary },
});
