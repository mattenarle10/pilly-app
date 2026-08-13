import { Pressable, StyleSheet, View } from 'react-native';

import { PillyIcon } from '@/ui/icons';
import { StarterOrganizer } from '@/ui/illustrations/starter-organizer';
import { colors, radii, shadows, spacing } from '@/ui/tokens';
import { PillyText } from '@/ui/components/pilly-text';

export function TodayStarter({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add your first medicine"
      accessibilityHint="Opens medicine setup"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {({ pressed }) => (
        <>
          <StarterOrganizer active={pressed} />
          <View style={styles.copy}>
            <PillyText role="title">Start with one medicine</PillyText>
            <PillyText role="caption" muted>
              Name, days, and time.
            </PillyText>
          </View>
          <View style={styles.trustRow}>
            <TrustLabel icon="phone" label="On-device" />
            <TrustLabel icon="private" label="No account" />
          </View>
          <View style={styles.action}>
            <View style={styles.actionIcon}>
              <PillyIcon name="add" size={20} color={colors.surface} active={pressed} />
            </View>
            <PillyText role="label" style={styles.actionLabel}>
              Add first medicine
            </PillyText>
            <PillyIcon name="next" size={18} color={colors.brand} active={pressed} />
          </View>
        </>
      )}
    </Pressable>
  );
}

function TrustLabel({ icon, label }: { icon: 'phone' | 'private'; label: string }) {
  return (
    <View style={styles.trustLabel}>
      <PillyIcon name={icon} size={15} color={colors.textSecondary} />
      <PillyText role="caption" muted>
        {label}
      </PillyText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.lavenderSoft,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.soft,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  copy: { alignItems: 'center', gap: spacing.xs },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  trustLabel: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.round,
    backgroundColor: colors.glass,
  },
  action: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.round,
    backgroundColor: colors.surface,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  actionLabel: { flex: 1, color: colors.brandStrong },
});
